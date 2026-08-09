const required = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "NEXT_PUBLIC_SITE_URL"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  console.error(`Missing production environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL);
const authUrl = new URL(process.env.BETTER_AUTH_URL);
if (siteUrl.protocol !== "https:" || authUrl.protocol !== "https:") {
  console.error("Production site and authentication URLs must use HTTPS.");
  process.exit(1);
}
if (process.env.BETTER_AUTH_SECRET.length < 32) {
  console.error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  process.exit(1);
}
if (siteUrl.origin !== authUrl.origin) {
  console.error("BETTER_AUTH_URL and NEXT_PUBLIC_SITE_URL must use the same production origin.");
  process.exit(1);
}

console.log(`Production configuration is ready for ${siteUrl.origin}.`);
