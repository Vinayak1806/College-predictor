export const SITE_NAME = "CAP Predictor";
export const SITE_TITLE = "Maharashtra First-Year and DSE Engineering College Predictor";
export const SITE_DESCRIPTION =
  "Predict First-Year Engineering (FE) and Direct Second-Year (DSE) B.E./B.Tech college options using verified Maharashtra CAP cutoffs and eligible seat types.";

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
