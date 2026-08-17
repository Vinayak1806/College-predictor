import { NextResponse } from "next/server";
import { dseSeatTypeIsEligible } from "../../../../lib/eligibility";
import { prisma } from "../../../../lib/prisma";
import { analyzeCutoffHistory, calculateStrengthIndex, compareUsefulResults, explainAdmissionZone } from "../../../../lib/prediction";
import { applyResultMode } from "../../../../lib/resultDiversity";
import { limitPublicRequest } from "../../../../lib/rateLimit";
import { dsePredictSchema } from "../../../../lib/validation";
import { CutoffQueryTooLargeError, findCutoffsInBatches } from "../../../../lib/cutoffQuery";
import { createRequestId, logServerError, publicServerError } from "../../../../lib/observability";
import { readResponseCache, responseCacheKey, writeResponseCache } from "../../../../lib/responseCache";
import { predictionDataRevision } from "../../../../lib/publishedData";
import { groupCutoffRowsByCollegeBranch } from "../../../../lib/cutoffGroups";

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

function confidenceWarning(analysis, input) {
  const specialProfile = input.category !== "OPEN" || input.pwd || input.defence || input.ews;
  if (analysis.yearsAnalyzed === 1 && specialProfile) {
    return "Only one comparable year was found for this special-category DSE seat. Treat the result cautiously.";
  }
  if (analysis.yearsAnalyzed === 1) {
    return "Only one comparable DSE year was found, so a conservative adjustment was applied.";
  }
  if (analysis.volatility > 6) {
    return `This DSE cutoff changed by ${analysis.volatility.toFixed(2)} percentage points across comparable years.`;
  }
  return null;
}

async function createPrediction(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The prediction request is not valid JSON." }, { status: 400 });
  }

  const validation = dsePredictSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message || "Check the DSE predictor form values." },
      { status: 400 }
    );
  }

  const input = validation.data;
  if (input.diplomaPercentage === undefined) {
    return NextResponse.json({ error: "Diploma percentage is required." }, { status: 400 });
  }

  const categories = [...new Set(["OPEN", input.category.toUpperCase()])];
  const genders = input.gender === "FEMALE" ? ["GENERAL", "LADIES"] : ["GENERAL"];
  const seatFilters = [
    { category: { in: categories }, gender: { in: genders }, specialType: null }
  ];
  if (input.ews) seatFilters.push({ specialType: "EWS" });
  if (input.pwd) seatFilters.push({ specialType: "PWD" });
  if (input.defence) seatFilters.push({ specialType: "DEFENCE" });

  const branchFilters = input.preferredBranches.map((branch) => ({
    displayName: { contains: branch, mode: "insensitive" }
  }));
  const cityFilters = input.preferredCities.flatMap((city) => [
    { name: { contains: city, mode: "insensitive" } },
    { city: { name: { contains: city, mode: "insensitive" } } }
  ]);
  const studentScore = input.diplomaPercentage;

  const rows = await findCutoffsInBatches({
    maxRows: 15000,
    where: {
      needsReview: false,
      closingScore: {
        not: null,
        gte: Math.max(0, studentScore - 15),
        lte: Math.min(100, studentScore + 10)
      },
      seatType: { OR: seatFilters },
      dataset: {
        admissionRoute: "DSE",
        quota: "MH",
        status: { in: ["VERIFIED", "PUBLISHED"] },
        predictionEnabled: true,
        academicYear: input.academicYear || undefined,
        capRound: input.capRound || undefined
      },
      collegeBranch: {
        branch: branchFilters.length ? { OR: branchFilters } : undefined,
        college: {
          routeArchives: { none: { admissionRoute: "DSE" } },
          OR: cityFilters.length ? cityFilters : undefined,
          university: input.preferredUniversities.length
            ? { name: { in: input.preferredUniversities } }
            : undefined
        }
      }
    },
    include: {
      dataset: true,
      seatType: true,
      collegeBranch: {
        include: {
          college: {
            select: {
              id: true,
              instituteCode: true,
              name: true,
              slug: true,
              collegeType: true,
              autonomous: true,
              cityId: true,
              universityId: true
            }
          },
          branch: {
            select: {
              id: true,
              branchCode: true,
              displayName: true
            }
          }
        }
      }
    }
  });

  const eligibleRows = rows.filter((row) => dseSeatTypeIsEligible(input, row.seatType));
  const branchCodes = [...new Set(eligibleRows.map((row) => row.collegeBranch.branch.branchCode))];
  const years = [...new Set(eligibleRows.map((row) => row.dataset.academicYear))];
  const matrices = branchCodes.length
    ? await prisma.seatMatrix.findMany({
        where: {
          admissionRoute: "DSE",
          academicYear: { in: years },
          branchCode: { in: branchCodes },
          needsReview: false
        }
      })
    : [];
  const matrixByYearAndBranch = new Map(
    matrices.map((matrix) => [`${matrix.academicYear}-${matrix.branchCode}`, matrix])
  );

  const results = groupCutoffRowsByCollegeBranch(eligibleRows, { branchIdentity: "code" }).map((groupRows) => {
    const records = groupRows.map((row) => ({
      year: row.dataset.academicYear,
      round: row.dataset.capRound,
      cutoff: Number(row.closingScore),
      seatType: row.seatType.code,
      section: row.section,
      sourceUrl: row.dataset.sourceUrl,
      sourceFilename: row.dataset.sourceFilename,
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
    const matrix = matrixByYearAndBranch.get(`${analysis.latest.year}-${branch.branchCode}`);
    const collegeType = normalizeOwnership(matrix?.collegeType || college.collegeType);

    const result = {
      admissionRoute: "DSE",
      scoreLabel: "diploma percentage",
      collegeId: college.id,
      collegeSlug: college.slug,
      instituteCode: college.instituteCode,
      college: college.name,
      branchCode: branch.branchCode,
      branch: branch.displayName,
      city: null,
      university: null,
      universityEligibility: "STATE",
      collegeType,
      autonomous: matrix?.autonomous || college.autonomous,
      preferenceBand: null,
      historicalDemandScore: analysis.benchmarkCutoff,
      latestFee: null,
      latestFeeYear: null,
      capSeats: matrix?.capSeats || null,
      lateralEntrySeats: matrix?.lateralEntrySeats || null,
      vacantSeats: matrix?.vacantSeats || null,
      ewsSeats: matrix?.ewsSeats || null,
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
      sourceFilename: analysis.latest.sourceFilename,
      sourcePage: analysis.latest.sourcePage,
      zoneExplanation: explainAdmissionZone(analysis),
      reason: `${analysis.yearsAnalyzed} comparable DSE year${analysis.yearsAnalyzed === 1 ? " was" : "s were"} analyzed using official diploma-percentage cutoffs. The recent-weighted benchmark is ${analysis.benchmarkCutoff.toFixed(2)}%.`
    };
    result.strengthIndex = calculateStrengthIndex({ ...result, sanctionedIntake: result.capSeats });
    return result;
  });

  const filteredResults = results.filter((result) =>
    matchesCollegeType(result.collegeType, input.collegeTypes) &&
    (!input.autonomousOnly || result.autonomous)
  );
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

  const visibleCollegeIds = [...new Set(visibleResults.map((r) => r.collegeId))].filter(Boolean);
  const collegesDetails = visibleCollegeIds.length
    ? await prisma.college.findMany({
        where: { id: { in: visibleCollegeIds } },
        include: {
          city: true,
          university: true,
          profile: true,
          fees: { orderBy: { academicYear: "desc" }, take: 1 }
        }
      })
    : [];

  const collegeDetailsMap = new Map(collegesDetails.map((c) => [c.id.toString(), c]));

  const enrichedVisibleResults = visibleResults.map((result) => {
    if (!result.collegeId) return result;
    const collegeDetail = collegeDetailsMap.get(result.collegeId.toString());
    const profile = collegeDetail?.profile;
    const latestFee = collegeDetail?.fees?.[0];

    const { collegeId, ...cleanResult } = result;

    return {
      ...cleanResult,
      city: collegeDetail?.city?.name || null,
      university: collegeDetail?.university?.name || null,
      preferenceBand: profile?.preferenceBand || null,
      latestFee: latestFee?.totalApprovedFee || profile?.totalApprovedFee || null,
      latestFeeYear: latestFee?.academicYear || profile?.feeYear || null
    };
  });

  return NextResponse.json({
    seatTypes: [...new Set(filteredResults.flatMap((result) => result.eligibleSeatTypes))].sort(),
    results: enrichedVisibleResults,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      totalResults: zoneResults.length,
      totalPages: Math.ceil(zoneResults.length / input.pageSize),
      hasNextPage: start + visibleResults.length < zoneResults.length
    },
    zoneCounts,
    analysis: {
      resultMode: input.resultMode,
      scoreBasis: "Official DSE diploma percentage",
      selectedYear: input.academicYear || "All available years",
      selectedRound: input.capRound || "Latest comparable round",
      diplomaBranchNote: "Diploma branch is recorded in the profile but is not used as a branch-eligibility rule until the official course mapping is imported."
    }
  });
}

export async function POST(request) {
  const limited = await limitPublicRequest(request, "prediction");
  if (limited) return limited;

  const dataRevision = await predictionDataRevision(prisma, "DSE");
  const cacheKey = responseCacheKey(
    `prediction:DSE:${dataRevision}`,
    await request.clone().text()
  );
  const cached = readResponseCache(cacheKey);
  if (cached) {
    const response = NextResponse.json(cached);
    response.headers.set("X-Prediction-Cache", "HIT");
    return response;
  }

  try {
    const response = await createPrediction(request);
    if (response.ok) {
      const payload = await response.clone().json();
      writeResponseCache(cacheKey, payload);
      response.headers.set("X-Prediction-Cache", "MISS");
    }
    return response;
  } catch (error) {
    const requestId = createRequestId();
    logServerError("predict.dse", error, { requestId });

    if (error instanceof CutoffQueryTooLargeError) {
      return NextResponse.json(
        publicServerError("This search is too broad. Select a branch, city, year, or CAP round and try again.", requestId),
        { status: 422 }
      );
    }

    return NextResponse.json(
      publicServerError("The DSE prediction could not be completed. Please try again.", requestId),
      { status: 500 }
    );
  }
}
