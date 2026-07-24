const missingLabels = new Set([
  "",
  "n/a",
  "na",
  "not available",
  "not centrally verified",
  "unknown",
  "null",
  "-"
]);

export function isMissingQualityValue(value) {
  if (value === null || value === undefined) return true;
  return missingLabels.has(String(value).trim().toLowerCase());
}

export function isInvalidUniversityName(value) {
  if (isMissingQualityValue(value)) return false;

  const name = String(value).trim().toLowerCase();
  return name === "autonomous institute" ||
    name === "non-autonomous institute" ||
    name === "deemed to be university" ||
    name === "state level" ||
    name === "home university" ||
    name === "other than home university";
}

export function normalizeCollegeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function coveragePercent(covered, total) {
  if (!total) return 0;
  return Math.round((covered / total) * 100);
}
