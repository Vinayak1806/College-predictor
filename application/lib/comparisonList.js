const STORAGE_KEY = "cap-predictor-comparison-v1";
const MAX_ITEMS = 3;

function admissionRoute(item) {
  return item.admissionRoute === "DSE" ? "DSE" : "FE";
}

function itemKey(item) {
  return `${admissionRoute(item)}|${item.instituteCode}|${item.branchCode || ""}`;
}

function limitItemsPerRoute(items) {
  const counts = { FE: 0, DSE: 0 };
  return items.filter((item) => {
    const route = admissionRoute(item);
    if (counts[route] >= MAX_ITEMS) return false;
    counts[route] += 1;
    return true;
  });
}

export function createComparisonItemFromResult(result) {
  return {
    admissionRoute: admissionRoute(result),
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
  const route = admissionRoute(item);
  const key = itemKey(item);
  if (items.some((current) => itemKey(current) === key)) {
    return { items, added: false, reason: "DUPLICATE" };
  }
  if (items.filter((current) => admissionRoute(current) === route).length >= MAX_ITEMS) {
    return { items, added: false, reason: "FULL" };
  }
  return { items: [...items, item], added: true, reason: null };
}

export function readComparisonList() {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? limitItemsPerRoute(value) : [];
  } catch {
    return [];
  }
}

export function writeComparisonList(items) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(limitItemsPerRoute(items)));
}

export function clearComparisonList() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
