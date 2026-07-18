import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { eligibleSeatTypes } from "../../../../lib/eligibility";
import { calculateBasicFitScore, classifyMargin, compareUsefulResults, scoreMargin } from "../../../../lib/prediction";
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

export async function POST(request) {
  const input = fePredictSchema.parse(await request.json());
  if (input.exam === "MHT_CET" && input.percentile === undefined) {
    return NextResponse.json({ error: "MHT-CET percentile is required." }, { status: 400 });
  }

  const eligibleSeats = eligibleSeatTypes(input);
  const seatTypes = input.exactSeatType ? [input.exactSeatType.toUpperCase()] : eligibleSeats;

  if (input.exactSeatType && !eligibleSeats.includes(input.exactSeatType.toUpperCase())) {
    return NextResponse.json(
      { error: "Selected exact seat type is not eligible for this student profile." },
      { status: 400 }
    );
  }
  const branchSearch = input.preferredBranches[0];
  const citySearch = input.preferredCities[0];
  const studentScore = input.percentile ?? 0;
  const lowestUsefulCutoff = Math.max(0, studentScore - 20);
  const highestUsefulCutoff = Math.min(100, studentScore + 8);

  // This is the database version of the SQL JOIN query you tested in pgAdmin.
  const rows = await prisma.cutoff.findMany({
    where: {
      needsReview: false,
      closingScore: {
        not: null,
        gte: lowestUsefulCutoff,
        lte: highestUsefulCutoff
      },
      seatType: { code: { in: seatTypes } },
      dataset: {
        admissionRoute: "FE",
        quota: "MH",
        status: { in: ["VERIFIED", "PUBLISHED"] },
        academicYear: input.academicYear || undefined,
        capRound: input.capRound || undefined
      },
      collegeBranch: {
        branch: branchSearch
          ? { displayName: { contains: branchSearch, mode: "insensitive" } }
          : undefined,
        college: citySearch
          ? {
              OR: [
                { name: { contains: citySearch, mode: "insensitive" } },
                { city: { name: { contains: citySearch, mode: "insensitive" } } }
              ]
            }
          : undefined
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
              profile: true,
              fees: {
                orderBy: { academicYear: "desc" },
                take: 1
              }
            }
          },
          branch: true
        }
      }
    },
    orderBy: { closingScore: "desc" },
    take: 1000
  });

  const branchCodes = [...new Set(rows.map((row) => row.collegeBranch.branch.branchCode))];
  const years = [...new Set(rows.map((row) => row.dataset.academicYear))];
  const seatMatrices = await prisma.seatMatrix.findMany({
    where: {
      academicYear: { in: years },
      branchCode: { in: branchCodes },
      needsReview: false
    }
  });
  const seatMatrixByYearAndBranch = new Map(
    seatMatrices.map((matrix) => [`${matrix.academicYear}-${matrix.branchCode}`, matrix])
  );

  const results = rows.map((row) => {
    const cutoff = Number(row.closingScore);
    const margin = scoreMargin(studentScore, cutoff);
    const zone = classifyMargin(margin);
    const matrix = seatMatrixByYearAndBranch.get(`${row.dataset.academicYear}-${row.collegeBranch.branch.branchCode}`);
    const profile = row.collegeBranch.college.profile;
    const latestFee = row.collegeBranch.college.fees[0];

    const result = {
      collegeSlug: row.collegeBranch.college.slug,
      instituteCode: row.collegeBranch.college.instituteCode,
      college: row.collegeBranch.college.name,
      branch: row.collegeBranch.branch.displayName,
      city: row.collegeBranch.college.city?.name,
      collegeType: normalizeOwnership(
        matrix?.collegeType || profile?.ownershipType || row.collegeBranch.college.collegeType
      ),
      autonomous: matrix?.autonomous || row.collegeBranch.college.autonomous,
      preferenceBand: profile?.preferenceBand || null,
      combinedPreferenceScore: profile?.combinedPreferenceProxy ? Number(profile.combinedPreferenceProxy) : null,
      latestFee: latestFee?.totalApprovedFee || profile?.totalApprovedFee || null,
      latestFeeYear: latestFee?.academicYear || profile?.feeYear || null,
      naacStatus: profile?.naacStatus || null,
      nbaStatus: profile?.nbaStatus || null,
      sanctionedIntake: matrix?.sanctionedIntake || null,
      capSeats: matrix?.capSeats || null,
      ewsSeats: matrix?.ewsSeats || null,
      tfwsSeats: matrix?.tfwsSeats || null,
      allIndiaSeats: matrix?.allIndiaSeats || null,
      zone,
      studentScore,
      closingCutoff: cutoff,
      margin,
      year: row.dataset.academicYear,
      round: row.dataset.capRound,
      seatType: row.seatType.code,
      sourceUrl: row.dataset.sourceUrl,
      reason: `Your percentile is ${margin.toFixed(2)} points compared with the ${row.dataset.academicYear} CAP Round ${row.dataset.capRound} closing cutoff.`
    };
    result.fitScore = calculateBasicFitScore(result);
    return result;
  });

  results.sort(compareUsefulResults);
  return NextResponse.json({ seatTypes, results: results.slice(0, 30) });
}
