const PENDING_PROFILE_KEY = "cap-predictor-pending-profile-v1";

export function savePendingPredictorForm(admissionRoute, formData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify({ admissionRoute, formData }));
}

export function readPendingPredictorForm(admissionRoute) {
  if (typeof window === "undefined") return null;
  try {
    const pending = JSON.parse(window.localStorage.getItem(PENDING_PROFILE_KEY) || "null");
    if (pending?.admissionRoute !== admissionRoute || !pending.formData) return null;
    window.localStorage.removeItem(PENDING_PROFILE_KEY);
    return pending.formData;
  } catch {
    window.localStorage.removeItem(PENDING_PROFILE_KEY);
    return null;
  }
}

export async function recordPredictionHistory(admissionRoute, formData, resultCount, zoneCounts) {
  try {
    await fetch("/api/prediction-history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ admissionRoute, formData, resultCount, zoneCounts })
    });
  } catch {
    // Predictions remain fully usable when account history is unavailable.
  }
}
