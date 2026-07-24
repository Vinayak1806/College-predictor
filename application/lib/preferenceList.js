export const PREFERENCE_LIST_STORAGE_KEY = "cap-predictor-preference-list-v1";

export const preferenceZones = [
  { value: "AMBITIOUS", label: "Ambitious" },
  { value: "TARGET", label: "Target" },
  { value: "SAFE", label: "Safe" },
  { value: "BACKUP", label: "Backup" }
];

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

  return {
    id: preferenceItemId(result.instituteCode, branchCode),
    instituteCode: result.instituteCode,
    collegeSlug: result.collegeSlug,
    college: result.college,
    branchCode,
    branch: result.branch,
    city: result.city || "",
    zone: predictionZoneToPreferenceZone(result.zone),
    cutoff: result.latestCutoff ?? result.closingCutoff ?? null,
    margin: result.margin ?? null,
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
