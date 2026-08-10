import path from "node:path";

const required = [
  "DATABASE_URL",
  "ADMIN_IMPORT_TOKEN",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "NEXT_PUBLIC_SITE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
  "ADMIN_IMPORTS_ROOT",
  "ALLOW_SEARCH_INDEXING",
  "RELEASE_ID"
];

const failures = [];
const warnings = [];
const value = (name) => String(process.env[name] || "").trim();
const missing = required.filter((name) => !value(name));

if (missing.length) {
  failures.push(`Missing variables: ${missing.join(", ")}`);
}

function parseUrl(name) {
  try {
    return new URL(value(name));
  } catch {
    failures.push(`${name} must contain a valid URL.`);
    return null;
  }
}

function isPlaceholder(text) {
  return /replace|example|your-|change-me|localhost/i.test(text);
}

const siteUrl = parseUrl("NEXT_PUBLIC_SITE_URL");
const authUrl = parseUrl("BETTER_AUTH_URL");
const databaseUrl = parseUrl("DATABASE_URL");

if (siteUrl && siteUrl.protocol !== "https:") {
  failures.push("NEXT_PUBLIC_SITE_URL must use HTTPS.");
}
if (authUrl && authUrl.protocol !== "https:") {
  failures.push("BETTER_AUTH_URL must use HTTPS.");
}
if (siteUrl && authUrl && siteUrl.origin !== authUrl.origin) {
  failures.push("BETTER_AUTH_URL and NEXT_PUBLIC_SITE_URL must use the same origin.");
}
if (databaseUrl && !["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
  failures.push("DATABASE_URL must be a PostgreSQL connection URL.");
}
if (databaseUrl && ["localhost", "127.0.0.1"].includes(databaseUrl.hostname)) {
  failures.push("DATABASE_URL still points to the local computer.");
}

for (const name of ["BETTER_AUTH_SECRET", "ADMIN_IMPORT_TOKEN"]) {
  const secret = value(name);
  if (secret && secret.length < 32) failures.push(`${name} must contain at least 32 characters.`);
  if (secret && isPlaceholder(secret)) failures.push(`${name} still contains a placeholder value.`);
}
if (value("BETTER_AUTH_SECRET") === value("ADMIN_IMPORT_TOKEN")) {
  failures.push("BETTER_AUTH_SECRET and ADMIN_IMPORT_TOKEN must be different secrets.");
}

for (const name of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]) {
  if (value(name) && isPlaceholder(value(name))) failures.push(`${name} still contains a placeholder value.`);
}
if (value("GOOGLE_CLIENT_ID") && !value("GOOGLE_CLIENT_ID").endsWith(".apps.googleusercontent.com")) {
  warnings.push("GOOGLE_CLIENT_ID does not use the usual Google OAuth client-ID format.");
}

if (value("NEXT_PUBLIC_SUPPORT_EMAIL") && !/^\S+@\S+\.\S+$/.test(value("NEXT_PUBLIC_SUPPORT_EMAIL"))) {
  failures.push("NEXT_PUBLIC_SUPPORT_EMAIL must be a valid email address.");
}
if (value("SECURE_DEPLOYMENT") !== "true") {
  failures.push("Set SECURE_DEPLOYMENT=true for staging and production.");
}
if (!["true", "false"].includes(value("ALLOW_SEARCH_INDEXING"))) {
  failures.push("ALLOW_SEARCH_INDEXING must be true or false.");
} else if (value("ALLOW_SEARCH_INDEXING") === "false") {
  warnings.push("Search indexing is disabled, which is correct for staging.");
}
if (value("RELEASE_ID") && value("RELEASE_ID").toLowerCase() === "local") {
  failures.push("RELEASE_ID must identify the deployed commit or release, not 'local'.");
}
if (value("ADMIN_IMPORTS_ROOT") && !path.isAbsolute(value("ADMIN_IMPORTS_ROOT"))) {
  failures.push("ADMIN_IMPORTS_ROOT must be an absolute mounted-disk path.");
}
if (value("NEXT_PUBLIC_GOOGLE_ANALYTICS_ID") && !/^G-[A-Z0-9]+$/i.test(value("NEXT_PUBLIC_GOOGLE_ANALYTICS_ID"))) {
  failures.push("NEXT_PUBLIC_GOOGLE_ANALYTICS_ID must be a GA4 measurement ID such as G-ABC123.");
}
if (!value("PYTHON_EXECUTABLE")) {
  warnings.push("PYTHON_EXECUTABLE is not set; the server must provide python3 or python on PATH.");
}

if (warnings.length) {
  console.warn("Deployment warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (failures.length) {
  console.error("Deployment configuration is not ready:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Production configuration is ready for ${siteUrl.origin}.`);
