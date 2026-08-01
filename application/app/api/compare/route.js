import { NextResponse } from "next/server";
import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";
import { limitPublicRequest } from "../../../lib/rateLimit";
import { compareRequestSchema } from "../../../lib/validation";

const openSeatPriority = ["GOPENS", "GOPENH", "GOPEN", "LOPENS", "LOPENH", "LOPEN"];

function hasValue(value) {
  return value !== null && value !== undefined && value !== "" && value !== "N/A";
}

function normalizeOwnership(value) {
  if (!hasValue(value)) return null;

  const text = String(value);
  const lower = text.toLowerCase();
  if (lower.includes("government aided") || lower.includes("government-aided")) return "Government-aided";
  if (lower.includes("government")) return "Government";
  if (lower.includes("university")) return "University-managed";
  if (lower.includes("un-aided") || lower.includes("unaided")) return "Un-Aided";
  if (lower.includes("private")) return "Private";
  return text;
}

function isAutonomousStatus(value) {
  if (!hasValue(value)) return false;
  const status = String(value).trim().toLowerCase();
  return status.includes("autonomous") && !status.includes("non-autonomous");
}

function autonomyValue(college, profile, matrix) {
  if (matrix) return matrix.autonomous;
  if (hasValue(profile?.autonomyStatus)) return isAutonomousStatus(profile.autonomyStatus);
  if (college.autonomous) return true;
  return null;
}

function chooseOpenReference(rows) {
  const openRows = rows.filter((row) =>
    row.seatType.category === "OPEN" &&
    row.seatType.gender === "GENERAL" &&
    !row.seatType.specialType
  );
  if (!openRows.length) return null;

  const newestYear = openRows.reduce((latest, row) =>
    row.dataset.academicYear > latest ? row.dataset.academicYear : latest
  , "");
  const newestRound = openRows
    .filter((row) => row.dataset.academicYear === newestYear)
    .reduce((latest, row) => Math.max(latest, row.dataset.capRound), 0);

  return openRows
    .filter((row) =>
      row.dataset.academicYear === newestYear &&
      row.dataset.capRound === newestRound
    )
    .sort((a, b) => {
      const aPriority = openSeatPriority.indexOf(a.seatType.code);
      const bPriority = openSeatPriority.indexOf(b.seatType.code);
      const normalizedA = aPriority === -1 ? openSeatPriority.length : aPriority;
      const normalizedB = bPriority === -1 ? openSeatPriority.length : bPriority;
      return normalizedA - normalizedB || Number(b.closingScore) - Number(a.closingScore);
    })[0];
}

function buildOpenHistory(rows) {
  const years = [...new Set(rows.map((row) => row.dataset.academicYear))].sort().reverse();

  return years.slice(0, 3).flatMap((year) => {
    const reference = chooseOpenReference(rows.filter((row) => row.dataset.academicYear === year));
    return reference ? [{
      year,
      round: reference.dataset.capRound,
      seatType: reference.seatType.code,
      closingScore: Number(reference.closingScore),
      closingRank: reference.closingRank,
      sourceUrl: reference.dataset.sourceUrl,
      sourcePage: reference.sourcePage
    }] : [];
  });
}

function calculateTrend(history) {
  if (history.length < 2) return null;
  const change = history[0].closingScore - history[history.length - 1].closingScore;
  if (change > 1) return "RISING";
  if (change < -1) return "FALLING";
  return "STABLE";
}

export async function POST(request) {
  const limited = await limitPublicRequest(request, "comparison");
  if (limited) return limited;

  const parsed = compareRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid comparison request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { admissionRoute, selections } = parsed.data;
  const instituteCodes = [...new Set(selections.map((selection) => selection.instituteCode))];
  const branchCodes = [...new Set(selections.map((selection) => selection.branchCode).filter(Boolean))];

  const colleges = await prisma.college.findMany({
    where: {
      instituteCode: { in: instituteCodes },
      profile: { is: { currentCap2025: "Yes" } }
    },
    include: {
      city: true,
      university: true,
      profile: true,
      fees: {
        orderBy: { academicYear: "desc" },
        take: 1
      },
      collegeBranches: {
        include: { branch: true }
      }
    }
  });

  const collegeByCode = new Map(colleges.map((college) => [college.instituteCode, college]));
  const selectedPairs = selections.filter((selection) =>
    collegeByCode.has(selection.instituteCode) && selection.branchCode
  );

  const [seatMatrices, cutoffs] = branchCodes.length ? await Promise.all([
    prisma.seatMatrix.findMany({
      where: {
        admissionRoute,
        needsReview: false,
        instituteCode: { in: instituteCodes },
        branchCode: { in: branchCodes }
      },
      orderBy: { academicYear: "desc" }
    }),
    prisma.cutoff.findMany({
      where: {
        needsReview: false,
        closingScore: { not: null },
        dataset: {
          admissionRoute,
          status: { in: ["VERIFIED", "PUBLISHED"] }
        },
        collegeBranch: {
          college: { instituteCode: { in: instituteCodes } },
          branch: { branchCode: { in: branchCodes } }
        }
      },
      include: {
        dataset: true,
        seatType: true,
        collegeBranch: {
          include: {
            college: true,
            branch: true
          }
        }
      },
      take: 6000
    })
  ]) : [[], []];

  const data = selections.flatMap((selection) => {
    const college = collegeByCode.get(selection.instituteCode);
    if (!college) return [];

    const branch = selection.branchCode
      ? college.collegeBranches.find((item) => item.branch.branchCode === selection.branchCode)?.branch
      : null;
    const pairKey = `${selection.instituteCode}|${selection.branchCode || ""}`;
    const matrix = seatMatrices.find((row) =>
      `${row.instituteCode}|${row.branchCode}` === pairKey
    );
    const branchCutoffs = branch
      ? cutoffs.filter((row) =>
          row.collegeBranch.college.instituteCode === selection.instituteCode &&
          row.collegeBranch.branch.branchCode === selection.branchCode
        )
      : [];
    if (branch && !matrix && !branchCutoffs.length) return [];
    const history = buildOpenHistory(branchCutoffs);
    const fee = college.fees[0];
    const profile = college.profile;
    const rawOwnership = profile?.ownershipType || matrix?.collegeType || college.collegeType;

    return [{
      admissionRoute,
      instituteCode: college.instituteCode,
      name: college.name,
      slug: college.slug,
      city: college.city?.name || null,
      district: college.city?.district || null,
      university: college.university?.name || profile?.university || null,
      ownership: normalizeOwnership(rawOwnership),
      autonomous: autonomyValue(college, profile, matrix),
      minority: profile?.minorityStatus || college.minorityType || null,
      officialWebsite: profile?.officialWebsite || college.officialWebsite || null,
      historicalDemandIndex: admissionRoute === "DSE"
        ? (profile?.dsePreferenceProxy ? Number(profile.dsePreferenceProxy) : null)
        : (profile?.fePreferenceProxy ? Number(profile.fePreferenceProxy) : null),
      demandBand: profile?.preferenceBand || null,
      totalIntake: profile?.totalIntake || null,
      approvedFee: fee?.totalApprovedFee || profile?.totalApprovedFee || null,
      feeYear: fee?.academicYear || profile?.feeYear || null,
      branch: branch ? {
        branchCode: branch.branchCode,
        name: branch.displayName,
        academicYear: matrix?.academicYear || null,
        sanctionedIntake: matrix?.sanctionedIntake || null,
        capSeats: matrix?.capSeats || null,
        lateralEntrySeats: matrix?.lateralEntrySeats || null,
        vacantSeats: matrix?.vacantSeats || null,
        ewsSeats: matrix?.ewsSeats || null,
        tfwsSeats: matrix?.tfwsSeats || null
      } : null,
      latestOpenCutoff: history[0] || null,
      openCutoffHistory: history,
      cutoffTrend: calculateTrend(history)
    }];
  });

  if (data.length !== selections.length || selectedPairs.some((selection) =>
    !data.some((item) =>
      item.instituteCode === selection.instituteCode &&
      item.branch?.branchCode === selection.branchCode
    )
  )) {
    return NextResponse.json(
      { error: "One or more selected colleges or branches are no longer available." },
      { status: 404 }
    );
  }

  return json({ data });
}
