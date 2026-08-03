import {
  cutoffIsEligibleForCollege,
  dseSeatTypeIsEligible,
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

export const DSE_BACKTEST_PROFILES = [
  {
    id: "dse-open-male",
    label: "DSE OPEN male",
    diplomaPercentage: 89.2,
    category: "OPEN",
    gender: "MALE"
  },
  {
    id: "dse-obc-male",
    label: "DSE OBC male",
    diplomaPercentage: 89.2,
    category: "OBC",
    gender: "MALE"
  },
  {
    id: "dse-obc-female",
    label: "DSE OBC female",
    diplomaPercentage: 89.2,
    category: "OBC",
    gender: "FEMALE"
  },
  {
    id: "dse-sc-male",
    label: "DSE SC male",
    diplomaPercentage: 82,
    category: "SC",
    gender: "MALE"
  },
  {
    id: "dse-ews",
    label: "DSE EWS candidate",
    diplomaPercentage: 90,
    category: "OPEN",
    gender: "MALE",
    ews: true
  }
].map((profile) => ({
  tfws: false,
  pwd: false,
  defence: false,
  ews: false,
  ...profile
}));

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

function likelyErrorCause(evaluation, prediction, profile) {
  if (evaluation.absoluteError < 4) return "WITHIN_EXPECTED_RANGE";
  if (prediction.volatility > 4) return "VOLATILE_HISTORY";

  const specialProfile = profile.category !== "OPEN" ||
    profile.tfws ||
    profile.pwd ||
    profile.defence ||
    profile.ews;
  if (specialProfile && prediction.yearsAnalyzed < 3) return "LIMITED_SPECIAL_HISTORY";

  const historicalSeatTypes = new Set(prediction.history.map((item) => item.seatType));
  if (historicalSeatTypes.size > 1 || !historicalSeatTypes.has(evaluation.targetSeatType)) {
    return "SEAT_TYPE_CHANGED";
  }

  return "LATEST_YEAR_SHIFT";
}

function dimensionBreakdown(evaluations, field, minimumSamples = 10) {
  const groups = new Map();

  for (const evaluation of evaluations) {
    const value = String(evaluation[field] || "Unknown");
    groups.set(value, [...(groups.get(value) || []), evaluation]);
  }

  return [...groups.entries()]
    .map(([value, rows]) => {
      const exact = rows.filter((row) => row.zoneDistance === 0).length;
      const adjacent = rows.filter((row) => row.zoneDistance <= 1).length;
      return {
        value,
        samples: rows.length,
        exactZoneAccuracy: round((exact / rows.length) * 100),
        adjacentZoneAccuracy: round((adjacent / rows.length) * 100),
        meanAbsoluteError: round(average(rows.map((row) => row.absoluteError)), 2),
        largeErrors: rows.filter((row) => row.absoluteError >= 4).length
      };
    })
    .filter((group) => group.samples >= minimumSamples)
    .sort((a, b) => b.meanAbsoluteError - a.meanAbsoluteError || b.samples - a.samples)
    .slice(0, 12);
}

export function buildAccuracyBreakdowns(evaluations) {
  return {
    category: dimensionBreakdown(evaluations, "category"),
    seatType: dimensionBreakdown(evaluations, "targetSeatType"),
    university: dimensionBreakdown(evaluations, "university"),
    branch: dimensionBreakdown(evaluations, "branch"),
    capRound: dimensionBreakdown(evaluations, "targetRound")
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

  const evaluation = {
    profileId: profile.id,
    category: profile.category,
    instituteCode: firstRow.collegeBranch.college.instituteCode,
    college: firstRow.collegeBranch.college.name,
    branch: firstRow.collegeBranch.branch.displayName,
    university: firstRow.collegeBranch.college.university?.name || "Unknown",
    predictedZone,
    actualZone,
    zoneDistance,
    predictedCutoff: prediction.benchmarkCutoff,
    actualCutoff: actual.latest.cutoff,
    cutoffError: round(cutoffError, 2),
    absoluteError: round(Math.abs(cutoffError), 2),
    trainingVolatility: prediction.volatility,
    trainingYears: prediction.yearsAnalyzed,
    targetRound: actual.latest.round,
    targetSeatType: actual.latest.seatType,
    eligibilityConflict: false
  };
  evaluation.likelyCause = likelyErrorCause(evaluation, prediction, profile);
  return evaluation;
}

export function summarizeBacktest(profile, evaluations) {
  const exactMatches = evaluations.filter((item) => item.zoneDistance === 0).length;
  const adjacentMatches = evaluations.filter((item) => item.zoneDistance <= 1).length;

  return {
    id: profile.id,
    label: profile.label,
    category: profile.category,
    percentile: profile.percentile ?? null,
    diplomaPercentage: profile.diplomaPercentage ?? null,
    score: profile.percentile ?? profile.diplomaPercentage,
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

  const profileWork = await Promise.all(profiles.map(async (profile) => {
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

    return {
      report: summarizeBacktest(profile, evaluations),
      evaluations
    };
  }));
  const profileReports = profileWork.map((item) => item.report);
  const allEvaluations = profileWork.flatMap((item) => item.evaluations);

  const testedOptions = profileReports.reduce((sum, profile) => sum + profile.testedOptions, 0);
  const weightedAverage = (field) => {
    if (!testedOptions) return 0;
    return round(
      profileReports.reduce((sum, profile) => sum + profile[field] * profile.testedOptions, 0) /
        testedOptions
    );
  };
  const causeCounts = allEvaluations.reduce((counts, evaluation) => {
    counts[evaluation.likelyCause] = (counts[evaluation.likelyCause] || 0) + 1;
    return counts;
  }, {});

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
      ),
      largeErrors: allEvaluations.filter((evaluation) => evaluation.absoluteError >= 4).length,
      eligibilityConflicts: allEvaluations.filter((evaluation) => evaluation.eligibilityConflict).length
    },
    profiles: profileReports,
    likelyCauses: causeCounts,
    breakdowns: buildAccuracyBreakdowns(allEvaluations),
    unavailableProfiles: []
  };
}

export function evaluateDseBacktestGroup(rows, profile, trainingYears, targetYear) {
  const eligibleRows = rows.filter((row) => dseSeatTypeIsEligible(profile, row.seatType));
  const trainingRows = eligibleRows.filter((row) => trainingYears.includes(row.dataset.academicYear));
  const targetRows = eligibleRows.filter((row) => row.dataset.academicYear === targetYear);
  if (!trainingRows.length || !targetRows.length) return null;

  const score = profile.diplomaPercentage;
  const prediction = analyzeCutoffHistory(trainingRows.map(toHistoryRecord), score);
  const actual = analyzeCutoffHistory(targetRows.map(toHistoryRecord), score);
  if (!prediction || prediction.yearsAnalyzed < trainingYears.length || !actual) return null;

  const predictedZone = prediction.zone;
  const actualZone = actual.zone;
  const firstRow = targetRows[0];
  const evaluation = {
    profileId: profile.id,
    category: profile.category,
    instituteCode: firstRow.collegeBranch.college.instituteCode,
    college: firstRow.collegeBranch.college.name,
    branch: firstRow.collegeBranch.branch.displayName,
    university: "State Level",
    predictedZone,
    actualZone,
    zoneDistance: Math.abs(zoneOrder[predictedZone] - zoneOrder[actualZone]),
    predictedCutoff: prediction.benchmarkCutoff,
    actualCutoff: actual.latest.cutoff,
    cutoffError: round(prediction.benchmarkCutoff - actual.latest.cutoff, 2),
    absoluteError: round(Math.abs(prediction.benchmarkCutoff - actual.latest.cutoff), 2),
    trainingVolatility: prediction.volatility,
    trainingYears: prediction.yearsAnalyzed,
    targetRound: actual.latest.round,
    targetSeatType: actual.latest.seatType,
    eligibilityConflict: false
  };
  evaluation.likelyCause = likelyErrorCause(evaluation, prediction, profile);
  return evaluation;
}

export async function runDsePredictionBacktest(prisma, options = {}) {
  const trainingYears = options.trainingYears || ["2024-25"];
  const targetYear = options.targetYear || "2025-26";
  const profiles = options.profiles || DSE_BACKTEST_PROFILES;

  const profileWork = await Promise.all(profiles.map(async (profile) => {
    const score = profile.diplomaPercentage;
    const rows = await prisma.cutoff.findMany({
      where: {
        needsReview: false,
        closingScore: {
          not: null,
          gte: Math.max(0, score - 20),
          lte: Math.min(100, score + 20)
        },
        dataset: {
          academicYear: { in: [...trainingYears, targetYear] },
          admissionRoute: "DSE",
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
        dataset: { select: { academicYear: true, capRound: true } },
        seatType: {
          select: { code: true, category: true, gender: true, specialType: true }
        },
        collegeBranch: {
          select: {
            branch: { select: { displayName: true } },
            college: { select: { instituteCode: true, name: true } }
          }
        }
      }
    });

    const evaluations = groupByCollegeBranch(rows)
      .map((group) => evaluateDseBacktestGroup(group, profile, trainingYears, targetYear))
      .filter(Boolean);
    return { report: summarizeBacktest(profile, evaluations), evaluations };
  }));

  const profileReports = profileWork.map((item) => item.report);
  const allEvaluations = profileWork.flatMap((item) => item.evaluations);
  const testedOptions = profileReports.reduce((sum, profile) => sum + profile.testedOptions, 0);
  const weightedAverage = (field) => testedOptions
    ? round(profileReports.reduce((sum, profile) => sum + profile[field] * profile.testedOptions, 0) / testedOptions)
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    methodology: {
      trainingYears,
      targetYear,
      description: `${trainingYears.join(" and ")} DSE cutoffs estimate the admission zone, which is checked against ${targetYear}.`
    },
    summary: {
      testedProfiles: profileReports.length,
      testedOptions,
      exactZoneAccuracy: weightedAverage("exactZoneAccuracy"),
      adjacentZoneAccuracy: weightedAverage("adjacentZoneAccuracy"),
      meanAbsoluteError: round(average(allEvaluations.map((item) => item.absoluteError)), 2),
      largeErrors: allEvaluations.filter((item) => item.absoluteError >= 4).length,
      eligibilityConflicts: 0
    },
    profiles: profileReports,
    likelyCauses: allEvaluations.reduce((counts, evaluation) => {
      counts[evaluation.likelyCause] = (counts[evaluation.likelyCause] || 0) + 1;
      return counts;
    }, {}),
    breakdowns: buildAccuracyBreakdowns(allEvaluations),
    unavailableProfiles: []
  };
}
