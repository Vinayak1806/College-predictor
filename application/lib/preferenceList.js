export const PREFERENCE_LIST_STORAGE_KEY = "cap-predictor-preference-list-v1";

export const preferenceZones = [
  { value: "AMBITIOUS", label: "Ambitious" },
  { value: "TARGET", label: "Target" },
  { value: "SAFE", label: "Safe" },
  { value: "BACKUP", label: "Backup" }
];

const preferenceZoneOrder = {
  AMBITIOUS: 0,
  TARGET: 1,
  SAFE: 2,
  BACKUP: 3
};

export function preferenceItemId(instituteCode, branchCode) {
  return `${String(instituteCode).trim()}:${String(branchCode).trim()}`;
}

export function predictionZoneToPreferenceZone(zone) {
  if (zone === "SAFE") return "SAFE";
  if (zone === "TARGET") return "TARGET";
  return "AMBITIOUS";
}

export function createPreferenceItemFromResult(result) {
  const branchCode = result.branchCode || result.branch;
  const cutoff = result.latestCutoff ?? result.closingCutoff ?? null;
  const studentScore = Number(result.studentScore);
  const numericCutoff = Number(cutoff);
  const selectedCutoffMargin = Number.isFinite(studentScore) && Number.isFinite(numericCutoff)
    ? studentScore - numericCutoff
    : result.margin ?? null;

  return {
    id: preferenceItemId(result.instituteCode, branchCode),
    instituteCode: result.instituteCode,
    collegeSlug: result.collegeSlug,
    college: result.college,
    branchCode,
    branch: result.branch,
    city: result.city || "",
    zone: predictionZoneToPreferenceZone(result.zone),
    cutoff,
    margin: selectedCutoffMargin,
    seatType: result.seatType || "",
    year: result.year || "",
    round: result.round ?? null,
    source: "PREDICTOR",
    addedAt: new Date().toISOString()
  };
}

export function addPreferenceItem(items, item) {
  if (items.some((existing) => existing.id === item.id)) {
    return { items, added: false };
  }

  return { items: [...items, item], added: true };
}

export function movePreferenceItem(items, fromIndex, toIndex) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

export function organizePreferenceItems(items) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const zoneDifference = (preferenceZoneOrder[a.item.zone] ?? 99) -
        (preferenceZoneOrder[b.item.zone] ?? 99);
      return zoneDifference || a.index - b.index;
    })
    .map(({ item }) => item);
}

export function preferenceListWarnings(items) {
  const warnings = [];
  const seenIds = new Set();
  const duplicateIds = new Set();

  for (const item of items) {
    if (seenIds.has(item.id)) duplicateIds.add(item.id);
    seenIds.add(item.id);
  }
  if (duplicateIds.size) {
    warnings.push(`${duplicateIds.size} duplicate college-branch choice${duplicateIds.size === 1 ? "" : "s"} found.`);
  }

  for (let earlierIndex = 0; earlierIndex < items.length; earlierIndex += 1) {
    for (let laterIndex = earlierIndex + 1; laterIndex < items.length; laterIndex += 1) {
      const earlierRisk = preferenceZoneOrder[items[earlierIndex].zone] ?? 99;
      const laterRisk = preferenceZoneOrder[items[laterIndex].zone] ?? 99;

      if (earlierRisk > laterRisk) {
        warnings.push(
          `Preference ${earlierIndex + 1} (${items[earlierIndex].zone.toLowerCase()}) is safer than preference ${laterIndex + 1} (${items[laterIndex].zone.toLowerCase()}). Check whether that order matches your real preference.`
        );
        if (warnings.length >= 4) return warnings;
      }
    }
  }

  return warnings;
}

export function readPreferenceList() {
  if (typeof window === "undefined") return [];

  try {
    const savedItems = JSON.parse(window.localStorage.getItem(PREFERENCE_LIST_STORAGE_KEY) || "[]");
    return Array.isArray(savedItems) ? savedItems : [];
  } catch {
    return [];
  }
}

export function writePreferenceList(items) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFERENCE_LIST_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cap-preference-list-updated", { detail: items }));
}
