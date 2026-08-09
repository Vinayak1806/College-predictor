export const SITE_NAME = "Admission Compass";
export const SITE_TITLE = "Maharashtra Engineering College Predictor | Admission Compass";
export const SITE_DESCRIPTION =
  "Use Admission Compass to predict First-Year and Direct Second-Year B.E./B.Tech college options from verified Maharashtra CAP cutoffs and eligible seat types.";

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
