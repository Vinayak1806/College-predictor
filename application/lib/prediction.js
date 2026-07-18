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

export function compareUsefulResults(a, b) {
  const zoneDifference = zoneOrder[a.zone] - zoneOrder[b.zone];

  if (zoneDifference !== 0) {
    return zoneDifference;
  }

  if (a.fitScore !== b.fitScore) {
    return b.fitScore - a.fitScore;
  }

  // Smaller absolute margin means the cutoff is closer to the student's score.
  return Math.abs(a.margin) - Math.abs(b.margin);
}

export function calculateBasicFitScore(result) {
  let score = 40;
  const collegeType = (result.collegeType || "").toLowerCase();

  if (collegeType.includes("government")) score += 20;
  else if (collegeType.includes("university")) score += 14;
  else if (collegeType.includes("un-aided")) score += 6;

  if (result.autonomous) score += 10;

  if (result.sanctionedIntake >= 120) score += 8;
  else if (result.sanctionedIntake >= 60) score += 5;

  if (result.capSeats >= 100) score += 6;
  else if (result.capSeats >= 60) score += 4;

  if (result.preferenceBand === "High") score += 8;
  else if (result.preferenceBand === "Moderate") score += 4;

  if (result.zone === "TARGET") score += 12;
  else if (result.zone === "SAFE") score += 8;
  else if (result.zone === "AMBITIOUS") score += 4;

  return Math.min(100, score);
}
