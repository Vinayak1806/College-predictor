export function scoreMargin(studentScore, closingCutoff) {
  return studentScore - closingCutoff;
}

export function rankMargin(studentRank, closingRank) {
  return closingRank - studentRank;
}

export function classifyMargin(margin) {
  if (margin >= 8) return "SAFE";
  if (margin >= -4) return "TARGET";
  if (margin >= -8) return "AMBITIOUS";
  return "HIGHLY_AMBITIOUS";
}

export const zoneOrder = {
  TARGET: 0,
  SAFE: 1,
  AMBITIOUS: 2,
  HIGHLY_AMBITIOUS: 3
};

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function chooseBestRecord(records) {
  return [...records].sort((a, b) => {
    if (a.cutoff !== b.cutoff) return a.cutoff - b.cutoff;
    return a.seatType.localeCompare(b.seatType);
  })[0];
}

// One comparable point is kept per year. When no round is selected, the latest
// available round from each year is used before the years are compared.
export function analyzeCutoffHistory(records, studentScore) {
  if (!records.length) return null;

  const recordsByYear = new Map();
  for (const record of records) {
    const yearRecords = recordsByYear.get(record.year) || [];
    yearRecords.push(record);
    recordsByYear.set(record.year, yearRecords);
  }

  const history = [...recordsByYear.entries()]
    .map(([year, yearRecords]) => {
      const latestRound = Math.max(...yearRecords.map((record) => record.round));
      const roundRecords = yearRecords.filter((record) => record.round === latestRound);
      const bestRecord = chooseBestRecord(roundRecords);

      return {
        year,
        round: latestRound,
        cutoff: bestRecord.cutoff,
        seatType: bestRecord.seatType,
        section: bestRecord.section || "STANDARD",
        sourceUrl: bestRecord.sourceUrl || null,
        sourcePage: bestRecord.sourcePage || null
      };
    })
    .sort((a, b) => a.year.localeCompare(b.year));

  const weightedTotal = history.reduce((sum, item, index) => sum + item.cutoff * (index + 1), 0);
  const totalWeight = history.reduce((sum, _item, index) => sum + index + 1, 0);
  const benchmarkCutoff = weightedTotal / totalWeight;
  const volatility = standardDeviation(history.map((item) => item.cutoff));
  const trendChange = history.length > 1 ? history.at(-1).cutoff - history[0].cutoff : 0;
  const trend = trendChange >= 2 ? "RISING" : trendChange <= -2 ? "FALLING" : "STABLE";
  const confidence = history.length >= 3 && volatility <= 4 ? "HIGH" : history.length >= 2 ? "MEDIUM" : "LIMITED";
  const margin = scoreMargin(studentScore, benchmarkCutoff);

  // Volatile cutoffs receive a small conservative penalty before classification.
  const adjustedMargin = margin - Math.min(volatility, 6) * 0.5;

  return {
    benchmarkCutoff: round(benchmarkCutoff),
    margin: round(margin),
    adjustedMargin: round(adjustedMargin),
    volatility: round(volatility),
    trend,
    trendChange: round(trendChange),
    confidence,
    zone: classifyMargin(adjustedMargin),
    yearsAnalyzed: history.length,
    history,
    latest: history.at(-1),
    eligibleSeatTypes: [...new Set(records.map((record) => record.seatType))].sort()
  };
}

// This is a derived research signal, not an official ranking. Historical demand
// remains the largest input; other verified college facts make small adjustments.
export function calculateStrengthIndex(result) {
  if (!Number.isFinite(result.historicalDemandScore)) return null;

  let intakeScore = 1;
  if (result.sanctionedIntake >= 120) intakeScore = 3;
  else if (result.sanctionedIntake >= 60) intakeScore = 2;

  const autonomyScore = result.autonomous ? 5 : 2;
  const coverageScore = result.dataConfidence === "HIGH" ? 2 : result.dataConfidence === "MEDIUM" ? 1 : 0;
  const score = result.historicalDemandScore * 0.9 + intakeScore + autonomyScore + coverageScore;

  return Math.min(100, Math.round(score));
}
export function compareUsefulResults(a, b) {
  const zoneDifference = zoneOrder[a.zone] - zoneOrder[b.zone];

  if (zoneDifference !== 0) return zoneDifference;

  const strengthDifference = (b.strengthIndex ?? -1) - (a.strengthIndex ?? -1);
  if (strengthDifference !== 0) return strengthDifference;

  return Math.abs(a.margin) - Math.abs(b.margin);
}
