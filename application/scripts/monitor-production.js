const baseUrl = process.env.PRODUCTION_URL || process.env.BASE_URL;
if (!baseUrl) {
  console.error("Set PRODUCTION_URL to the deployed HTTPS origin.");
  process.exit(1);
}

const origin = new URL(baseUrl).origin;
const checks = [
  { name: "database health", path: "/api/health", maximumMs: 5000, validate: (body) => body.status === "ok" },
  { name: "home page", path: "/", maximumMs: 8000, contentType: "text/html" },
  { name: "public statistics", path: "/api/stats", maximumMs: 8000, validate: (body) => Boolean(body.data) }
];

let failures = 0;
for (const check of checks) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${origin}${check.path}`, {
      signal: AbortSignal.timeout(check.maximumMs),
      headers: { "User-Agent": "CAP-Predictor-Production-Monitor/1.0" }
    });
    const duration = Math.round(performance.now() - startedAt);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (check.contentType && !(response.headers.get("content-type") || "").includes(check.contentType)) {
      throw new Error("unexpected content type");
    }
    if (check.validate && !check.validate(await response.json())) throw new Error("invalid response body");
    console.log(`PASS  ${check.name.padEnd(20)} ${duration} ms`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL  ${check.name.padEnd(20)} ${error.message}`);
  }
}

if (failures) process.exitCode = 1;
