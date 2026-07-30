const STORAGE_KEY = "cap-predictor-comparison-v1";
const MAX_ITEMS = 3;

export function createComparisonItemFromResult(result) {
  return {
    instituteCode: String(result.instituteCode),
    college: result.college,
    collegeSlug: result.collegeSlug,
    branchCode: result.branchCode,
    branch: result.branch,
    prediction: {
      zone: result.zone,
      studentScore: result.studentScore,
      cutoff: result.closingCutoff,
      latestCutoff: result.latestCutoff,
      margin: result.margin,
      year: result.year,
      round: result.round,
      seatType: result.seatType,
      confidence: result.dataConfidence
    }
  };
}

export function addComparisonItem(items, item) {
  const key = `${item.instituteCode}|${item.branchCode || ""}`;
  if (items.some((current) => `${current.instituteCode}|${current.branchCode || ""}` === key)) {
    return { items, added: false, reason: "DUPLICATE" };
  }
  if (items.length >= MAX_ITEMS) {
    return { items, added: false, reason: "FULL" };
  }
  return { items: [...items, item], added: true, reason: null };
}

export function readComparisonList() {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function writeComparisonList(items) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function clearComparisonList() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
