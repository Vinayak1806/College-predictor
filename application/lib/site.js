export const SITE_NAME = "CAP Predictor";
export const SITE_TITLE = "MHT CET & DSE College Predictor Maharashtra";
export const SITE_DESCRIPTION =
  "Predict Maharashtra engineering college options using verified FE and DSE CAP cutoffs, eligible seat types and multi-year admission history.";

export function normalizeSiteUrl(value) {
  try {
    const url = new URL(value || "http://localhost:3000");
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function getSiteUrl() {
  return normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.BETTER_AUTH_URL
  );
}

export function absoluteUrl(path = "/") {
  return new URL(path, `${getSiteUrl()}/`).toString();
}
