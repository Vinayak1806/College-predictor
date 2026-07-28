import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import {
  cutoffIsEligibleForCollege,
  eligibleSeatTypesAcrossUniversities,
  universityEligibilityForCollege
} from "../../../../lib/eligibility";
import { analyzeCutoffHistory, calculateStrengthIndex, compareUsefulResults } from "../../../../lib/prediction";
import { applyResultMode } from "../../../../lib/resultDiversity";
import { fePredictSchema } from "../../../../lib/validation";

function normalizeOwnership(value) {
  if (!value) return null;

  const text = String(value);
  const lower = text.toLowerCase();
  if (lower.includes("government aided") || lower.includes("government-aided")) return "Government-aided";
  if (lower.includes("government")) return "Government";
  if (lower.includes("university")) return "University-managed";
  if (lower.includes("un-aided") || lower.includes("unaided")) return "Un-Aided";
  if (lower.includes("private")) return "Private";
  return text;
}

function matchesCollegeType(collegeType, selectedTypes) {
  if (!selectedTypes.length) return true;

  const value = (collegeType || "").toLowerCase();
  return selectedTypes.some((selectedType) => {
    if (selectedType === "GOVERNMENT") return value === "government" || value.includes("university-managed");
    if (selectedType === "AIDED") return value.includes("aided") && !value.includes("un-aided");
    if (selectedType === "PRIVATE") return value.includes("private") || value.includes("un-aided");
    return false;
  });
}

function groupRowsByCollegeBranch(rows) {
  const groups = new Map();

  for (const row of rows) {
    const college = row.collegeBranch.college;
    const branch = row.collegeBranch.branch;
    const normalizedInstituteCode = String(college.instituteCode || "").replace(/^0+/, "") || college.instituteCode;
    const key = `${normalizedInstituteCode}:${branch.displayName.toLowerCase()}`;
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  return [...groups.values()];
}

function confidenceWarning(analysis, input) {
  const specialProfile = input.category !== "OPEN" ||
    input.tfws ||
    input.pwd ||
    input.defence ||
    input.ews;

  if (analysis.yearsAnalyzed === 1 && specialProfile) {
    return "Only one comparable year was found for this special-category match. Treat the admission zone cautiously.";
  }
  if (analysis.yearsAnalyzed === 1) {
    return "Only one comparable year was found, so a conservative confidence adjustment was applied.";
  }
  if (analysis.volatility > 6) {
    return `This cutoff changed by ${analysis.volatility.toFixed(2)} points across comparable years. The result has limited confidence.`;
  }
  if (specialProfile && analysis.yearsAnalyzed < 3) {
    return "Fewer than three comparable years were found for this special-category profile.";
  }
  return null;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The prediction request is not valid JSON." }, { status: 400 });
  }

  const validation = fePredictSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message || "Check the predictor form values." },
      { status: 400 }
    );
  }

  const input = validation.data;
  if (input.exam === "JEE") {
    return NextResponse.json(
      { error: "JEE prediction will be enabled after verified All India quota records are connected." },
      { status: 501 }
    );
  }
  if (input.percentile === undefined) {
    return NextResponse.json({ error: "MHT-CET percentile is required." }, { status: 400 });
  }

  const querySeatTypes = eligibleSeatTypesAcrossUniversities(input);
  const branchFilters = input.preferredBranches.map((branch) => ({
    displayName: { contains: branch, mode: "insensitive" }
  }));
  const cityFilters = input.preferredCities.flatMap((city) => [
    { name: { contains: city, mode: "insensitive" } },
    { city: { name: { contains: city, mode: "insensitive" } } }
  ]);
  const studentScore = input.percentile;

  const rows = await prisma.cutoff.findMany({
    where: {
      needsReview: false,
      closingScore: {
        not: null,
        gte: Math.max(0, studentScore - 25),
        lte: Math.min(100, studentScore + 15)
      },
      seatType: { code: { in: querySeatTypes } },
      dataset: {
        admissionRoute: "FE",
        quota: "MH",
        status: { in: ["VERIFIED", "PUBLISHED"] },
        academicYear: input.academicYear || undefined,
        capRound: input.capRound || undefined
      },
      collegeBranch: {
        branch: branchFilters.length ? { OR: branchFilters } : undefined,
        college: {
          profile: { is: { currentCap2025: "Yes" } },
          OR: cityFilters.length ? cityFilters : undefined
        }
      }
    },
    include: {
      dataset: true,
      seatType: true,
      collegeBranch: {
        include: {
          college: {
            include: {
              city: true,
              university: true,
              profile: true,
              fees: { orderBy: { academicYear: "desc" }, take: 1 }
            }
          },
          branch: true
        }
      }
    },
    orderBy: { closingScore: "desc" },
    take: 4000
  });

  // Home/Other University eligibility depends on each result college, so it is
  // checked after the college's university is available from the database.
  const eligibleRows = rows.filter((row) => {
    const collegeUniversity = row.collegeBranch.college.university?.name;
    return cutoffIsEligibleForCollege(
      input,
      collegeUniversity,
      row.seatType.code,
      row.section
    );
  });

  const branchCodes = [...new Set(eligibleRows.map((row) => row.collegeBranch.branch.branchCode))];
  const years = [...new Set(eligibleRows.map((row) => row.dataset.academicYear))];
  const seatMatrices = branchCodes.length
    ? await prisma.seatMatrix.findMany({
        where: {
          academicYear: { in: years },
          branchCode: { in: branchCodes },
          needsReview: false
        }
      })
    : [];
  const seatMatrixByYearAndBranch = new Map(
    seatMatrices.map((matrix) => [`${matrix.academicYear}-${matrix.branchCode}`, matrix])
  );

  const results = groupRowsByCollegeBranch(eligibleRows).map((groupRows) => {
    const records = groupRows.map((row) => ({
      year: row.dataset.academicYear,
      round: row.dataset.capRound,
      cutoff: Number(row.closingScore),
      seatType: row.seatType.code,
      section: row.section,
      sourceUrl: row.dataset.sourceUrl,
      sourcePage: row.sourcePage
    }));
    const analysis = analyzeCutoffHistory(records, studentScore);
    const latestRow = groupRows.find((row) =>
      row.dataset.academicYear === analysis.latest.year &&
      row.dataset.capRound === analysis.latest.round &&
      row.seatType.code === analysis.latest.seatType
    ) || groupRows[0];
    const college = latestRow.collegeBranch.college;
    const branch = latestRow.collegeBranch.branch;
    const matrix = seatMatrixByYearAndBranch.get(`${analysis.latest.year}-${branch.branchCode}`);
    const profile = college.profile;
    const latestFee = college.fees[0];
    const collegeType = normalizeOwnership(matrix?.collegeType || profile?.ownershipType || college.collegeType);

    const result = {
      collegeSlug: college.slug,
      instituteCode: college.instituteCode,
      college: college.name,
      branchCode: branch.branchCode,
      branch: branch.displayName,
      city: college.city?.name,
      university: college.university?.name || null,
      universityEligibility: universityEligibilityForCollege(input.homeUniversity, college.university?.name),
      collegeType,
      autonomous: matrix?.autonomous || college.autonomous,
      preferenceBand: profile?.preferenceBand || null,
      historicalDemandScore: profile?.fePreferenceProxy
        ? Number(profile.fePreferenceProxy)
        : null,
      latestFee: latestFee?.totalApprovedFee || profile?.totalApprovedFee || null,
      latestFeeYear: latestFee?.academicYear || profile?.feeYear || null,
      sanctionedIntake: matrix?.sanctionedIntake || null,
      capSeats: matrix?.capSeats || null,
      ewsSeats: matrix?.ewsSeats || null,
      tfwsSeats: matrix?.tfwsSeats || null,
      allIndiaSeats: matrix?.allIndiaSeats || null,
      zone: analysis.zone,
      studentScore,
      closingCutoff: analysis.benchmarkCutoff,
      latestCutoff: analysis.latest.cutoff,
      margin: analysis.margin,
      adjustedMargin: analysis.adjustedMargin,
      conservativePenalty: analysis.conservativePenalty,
      year: analysis.latest.year,
      round: analysis.latest.round,
      seatType: analysis.latest.seatType,
      cutoffSection: analysis.latest.section,
      eligibleSeatTypes: analysis.eligibleSeatTypes,
      yearsAnalyzed: analysis.yearsAnalyzed,
      dataConfidence: analysis.confidence,
      confidenceWarning: confidenceWarning(analysis, input),
      trend: analysis.trend,
      trendChange: analysis.trendChange,
      volatility: analysis.volatility,
      cutoffHistory: analysis.history,
      sourceUrl: analysis.latest.sourceUrl,
      sourcePage: analysis.latest.sourcePage,
      reason: `${analysis.yearsAnalyzed} comparable year${analysis.yearsAnalyzed === 1 ? " was" : "s were"} analyzed. The recent-weighted benchmark is ${analysis.benchmarkCutoff.toFixed(2)} and cutoff volatility is ${analysis.volatility.toFixed(2)}.`
    };
    result.strengthIndex = calculateStrengthIndex({ ...result, dataConfidence: analysis.confidence });
    return result;
  });

  const filteredResults = results.filter((result) => {
    return matchesCollegeType(result.collegeType, input.collegeTypes) &&
      (!input.autonomousOnly || result.autonomous);
  });

  filteredResults.sort(compareUsefulResults);
  const modeResults = applyResultMode(filteredResults, input.resultMode);
  const zoneCounts = modeResults.reduce((counts, result) => {
    counts[result.zone] = (counts[result.zone] || 0) + 1;
    return counts;
  }, { ALL: modeResults.length, SAFE: 0, TARGET: 0, AMBITIOUS: 0, HIGHLY_AMBITIOUS: 0 });
  const zoneResults = input.zone === "ALL"
    ? modeResults
    : modeResults.filter((result) => result.zone === input.zone);
  const start = (input.page - 1) * input.pageSize;
  const visibleResults = zoneResults.slice(start, start + input.pageSize);
  const totalResults = zoneResults.length;
  const seatTypes = [...new Set(filteredResults.flatMap((result) => result.eligibleSeatTypes))].sort();

  return NextResponse.json({
    seatTypes,
    results: visibleResults,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      totalResults,
      totalPages: Math.ceil(totalResults / input.pageSize),
      hasNextPage: start + visibleResults.length < totalResults
    },
    zoneCounts,
    analysis: {
      groupedResults: true,
      resultMode: input.resultMode,
      selectedYear: input.academicYear || "All available years",
      selectedRound: input.capRound || "Latest comparable round"
    }
  });
}
