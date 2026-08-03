const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const checks = [
  { name: "health", path: "/api/health", validate: (body) => body.status === "ok" },
  { name: "public statistics", path: "/api/stats", validate: (body) => Boolean(body.data) },
  { name: "college explorer", path: "/colleges", contentType: "text/html" },
  { name: "FE predictor", path: "/fe-predictor", contentType: "text/html" },
  { name: "DSE predictor", path: "/dse-predictor", contentType: "text/html" },
  { name: "privacy page", path: "/privacy", contentType: "text/html" },
  { name: "AI index", path: "/llms.txt", contentType: "text/plain" }
];

let failures = 0;

for (const check of checks) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      headers: { "User-Agent": "CAP-Predictor-Smoke-Test/1.0" }
    });
    const contentType = response.headers.get("content-type") || "";
    let valid = response.ok;

    if (valid && check.contentType) valid = contentType.includes(check.contentType);
    if (valid && check.validate) valid = check.validate(await response.json());

    const duration = Math.round(performance.now() - startedAt);
    if (!valid) throw new Error(`HTTP ${response.status}, content-type ${contentType}`);
    console.log(`PASS  ${check.name.padEnd(20)} ${duration} ms`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL  ${check.name.padEnd(20)} ${error.message}`);
  }
}

if (failures) {
  console.error(`\n${failures} smoke check(s) failed for ${baseUrl}.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll smoke checks passed for ${baseUrl}.`);
}
