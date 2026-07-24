import {
  cutoffIsEligibleForCollege,
  eligibleSeatTypesAcrossUniversities
} from "./eligibility.js";
import { analyzeCutoffHistory, zoneOrder } from "./prediction.js";

export const FE_BACKTEST_PROFILES = [
  {
    id: "open-male",
    label: "FE OPEN male",
    percentile: 89.2,
    category: "OPEN",
    gender: "MALE",
    homeUniversity: "Savitribai Phule Pune University"
  },
  {
    id: "obc-female",
    label: "FE OBC female",
    percentile: 89.2,
    category: "OBC",
    gender: "FEMALE",
    homeUniversity: "Savitribai Phule Pune University"
  },
  {
    id: "sc-home",
    label: "FE SC Home University",
    percentile: 82,
    category: "SC",
    gender: "MALE",
    homeUniversity: "Mumbai University"
  },
  {
    id: "tfws",
    label: "TFWS candidate",
    percentile: 95,
    category: "OPEN",
    gender: "MALE",
    homeUniversity: "Savitribai Phule Pune University",
    tfws: true
  },
  {
    id: "pwd",
    label: "PWD candidate",
    percentile: 78,
    category: "OPEN",
    gender: "MALE",
    homeUniversity: "Savitribai Phule Pune University",
    pwd: true
  },
  {
    id: "ews",
    label: "EWS candidate",
    percentile: 90,
    category: "OPEN",
    gender: "MALE",
    homeUniversity: "Savitribai Phule Pune University",
    ews: true
  }
].map((profile) => ({
  tfws: false,
  pwd: false,
  defence: false,
  ews: false,
  ...profile
}));

export const UNAVAILABLE_BACKTEST_PROFILES = [
  {
    label: "JEE All India candidate",
    reason: "Verified All India quota cutoff records are not connected yet."
  },
  {
    label: "DSE OPEN and OBC",
    reason: "Verified DSE cutoff datasets are not imported yet."
  }
];

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function groupByCollegeBranch(rows) {
  const groups = new Map();

  for (const row of rows) {
    const college = row.collegeBranch.college;
    const branch = row.collegeBranch.branch;
    const instituteCode = String(college.instituteCode || "").replace(/^0+/, "") || college.instituteCode;
    const key = `${instituteCode}:${branch.displayName.trim().toLowerCase()}`;
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  return [...groups.values()];
}

function toHistoryRecord(row) {
  return {
    year: row.dataset.academicYear,
    round: row.dataset.capRound,
    cutoff: Number(row.closingScore),
    seatType: row.seatType.code,
    section: row.section
  };
}

export function evaluateBacktestGroup(rows, profile, trainingYears, targetYear) {
  const eligibleRows = rows.filter((row) =>
    cutoffIsEligibleForCollege(
      profile,
      row.collegeBranch.college.university?.name,
      row.seatType.code,
      row.section
    )
  );
  const trainingRows = eligibleRows.filter((row) => trainingYears.includes(row.dataset.academicYear));
  const targetRows = eligibleRows.filter((row) => row.dataset.academicYear === targetYear);

  if (!trainingRows.length || !targetRows.length) return null;

  const prediction = analyzeCutoffHistory(trainingRows.map(toHistoryRecord), profile.percentile);
  const actual = analyzeCutoffHistory(targetRows.map(toHistoryRecord), profile.percentile);
  if (!prediction || prediction.yearsAnalyzed < trainingYears.length || !actual) return null;

  const predictedZone = prediction.zone;
  const actualZone = actual.zone;
  const zoneDistance = Math.abs(zoneOrder[predictedZone] - zoneOrder[actualZone]);
  const cutoffError = prediction.benchmarkCutoff - actual.latest.cutoff;
  const firstRow = targetRows[0];

  return {
    instituteCode: firstRow.collegeBranch.college.instituteCode,
    college: firstRow.collegeBranch.college.name,
    branch: firstRow.collegeBranch.branch.displayName,
    predictedZone,
    actualZone,
    zoneDistance,
    predictedCutoff: prediction.benchmarkCutoff,
    actualCutoff: actual.latest.cutoff,
    cutoffError: round(cutoffError, 2),
    absoluteError: round(Math.abs(cutoffError), 2),
    targetRound: actual.latest.round,
    targetSeatType: actual.latest.seatType
  };
}

export function summarizeBacktest(profile, evaluations) {
  const exactMatches = evaluations.filter((item) => item.zoneDistance === 0).length;
  const adjacentMatches = evaluations.filter((item) => item.zoneDistance <= 1).length;

  return {
    id: profile.id,
    label: profile.label,
    category: profile.category,
    percentile: profile.percentile,
    homeUniversity: profile.homeUniversity,
    testedOptions: evaluations.length,
    exactZoneAccuracy: round((exactMatches / Math.max(evaluations.length, 1)) * 100),
    adjacentZoneAccuracy: round((adjacentMatches / Math.max(evaluations.length, 1)) * 100),
    meanAbsoluteError: round(average(evaluations.map((item) => item.absoluteError)), 2),
    largestErrors: [...evaluations]
      .sort((a, b) => b.absoluteError - a.absoluteError)
      .slice(0, 3)
  };
}

export async function runFePredictionBacktest(prisma, options = {}) {
  const trainingYears = options.trainingYears || ["2023-24", "2024-25"];
  const targetYear = options.targetYear || "2025-26";
  const profiles = options.profiles || FE_BACKTEST_PROFILES;

  const profileReports = await Promise.all(profiles.map(async (profile) => {
    const seatTypes = eligibleSeatTypesAcrossUniversities(profile);
    const rows = await prisma.cutoff.findMany({
      where: {
        needsReview: false,
        closingScore: {
          not: null,
          gte: Math.max(0, profile.percentile - 20),
          lte: Math.min(100, profile.percentile + 20)
        },
        seatType: { code: { in: seatTypes } },
        dataset: {
          academicYear: { in: [...trainingYears, targetYear] },
          admissionRoute: "FE",
          quota: "MH",
          status: { in: ["VERIFIED", "PUBLISHED"] }
        },
        collegeBranch: {
          college: { profile: { is: { currentCap2025: "Yes" } } }
        }
      },
      select: {
        collegeBranchId: true,
        closingScore: true,
        section: true,
        dataset: {
          select: {
            academicYear: true,
            capRound: true
          }
        },
        seatType: {
          select: { code: true }
        },
        collegeBranch: {
          select: {
            branch: { select: { displayName: true } },
            college: {
              select: {
                instituteCode: true,
                name: true,
                university: { select: { name: true } }
              }
            }
          }
        }
      }
    });

    const evaluations = groupByCollegeBranch(rows)
      .map((group) => evaluateBacktestGroup(group, profile, trainingYears, targetYear))
      .filter(Boolean);

    return summarizeBacktest(profile, evaluations);
  }));

  const testedOptions = profileReports.reduce((sum, profile) => sum + profile.testedOptions, 0);
  const weightedAverage = (field) => {
    if (!testedOptions) return 0;
    return round(
      profileReports.reduce((sum, profile) => sum + profile[field] * profile.testedOptions, 0) /
        testedOptions
    );
  };

  return {
    generatedAt: new Date().toISOString(),
    methodology: {
      trainingYears,
      targetYear,
      description: `Cutoffs from ${trainingYears.join(" and ")} estimate the admission zone. The estimate is checked against the latest eligible ${targetYear} cutoff.`
    },
    summary: {
      testedProfiles: profileReports.length,
      testedOptions,
      exactZoneAccuracy: weightedAverage("exactZoneAccuracy"),
      adjacentZoneAccuracy: weightedAverage("adjacentZoneAccuracy"),
      meanAbsoluteError: round(
        profileReports.reduce((sum, profile) => sum + profile.meanAbsoluteError * profile.testedOptions, 0) /
          Math.max(testedOptions, 1),
        2
      )
    },
    profiles: profileReports,
    unavailableProfiles: UNAVAILABLE_BACKTEST_PROFILES
  };
}
