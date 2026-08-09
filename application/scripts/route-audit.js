const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const adminToken = process.env.ADMIN_IMPORT_TOKEN || "";
const results = [];

async function check(name, action) {
  const startedAt = performance.now();
  try {
    await action();
    results.push({ name, passed: true, duration: Math.round(performance.now() - startedAt) });
  } catch (error) {
    results.push({ name, passed: false, duration: Math.round(performance.now() - startedAt), error: error.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const { headers = {}, ...requestOptions } = options;
  return fetch(`${baseUrl}${path}`, {
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
    headers: { "User-Agent": "CAP-Predictor-Route-Audit/1.0", ...headers },
    ...requestOptions
  });
}

async function json(path, options = {}) {
  const response = await request(path, options);
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function expectPage(path, finalPath = path) {
  const response = await request(path);
  assert(response.ok, `${path} returned HTTP ${response.status}`);
  assert((response.headers.get("content-type") || "").includes("text/html"), `${path} is not HTML`);

  const responsePath = new URL(response.url).pathname;
  if (responsePath === finalPath) return;

  // App Router redirects can arrive as an HTML meta refresh instead of an
  // HTTP Location header when Next.js switches a server response to the client.
  const html = await response.text();
  const redirectTarget = html.match(/<meta[^>]+id="__next-page-redirect"[^>]+content="[^"]*?url=([^"]+)"/i)?.[1];
  const redirectPath = redirectTarget ? new URL(redirectTarget, baseUrl).pathname : responsePath;
  assert(redirectPath === finalPath, `${path} ended at ${redirectPath}`);
}

const pages = [
  ["home", "/"],
  ["FE predictor page", "/fe-predictor"],
  ["DSE predictor page", "/dse-predictor"],
  ["college explorer", "/colleges?route=FE", "/colleges"],
  ["college index FE", "/college-index?route=FE", "/college-index"],
  ["college index DSE", "/college-index?route=DSE", "/college-index"],
  ["cutoff explorer", "/cutoffs"],
  ["comparison page", "/compare"],
  ["CAP list page", "/preference-list"],
  ["student login", "/login"],
  ["admin login", "/admin/login"],
  ["privacy page", "/privacy"],
  ["terms page", "/terms"],
  ["disclaimer page", "/disclaimer"],
  ["legacy results redirect", "/results", "/fe-predictor"],
  ["student account protection", "/account", "/login"],
  ["admin page protection", "/admin", "/admin/login"],
  ["new college detail", "/colleges/02805-urvara-pathrikar-engineering-college?route=FE", "/colleges/02805-urvara-pathrikar-engineering-college"]
];

for (const [name, path, finalPath] of pages) {
  await check(name, () => expectPage(path, finalPath || path.split("?")[0]));
}

await check("health API and PostgreSQL", async () => {
  const { response, payload } = await json("/api/health");
  assert(response.ok && payload?.status === "ok" && payload?.database === "reachable", "health check failed");
});

await check("public statistics", async () => {
  const { response, payload } = await json("/api/stats");
  assert(response.ok && payload?.data?.currentFeInstitutes > 0 && payload?.data?.currentDseInstitutes > 0, "route counts are missing");
});

for (const route of ["FE", "DSE"]) {
  await check(`${route} cutoff options`, async () => {
    const { response, payload } = await json(`/api/cutoffs/options?route=${route}`);
    assert(response.ok && payload?.years?.length && payload?.branches?.length && payload?.seatTypes?.length, `${route} options are incomplete`);
    assert(payload.routes.every((value) => value === route), `${route} options contain another route`);
  });
  await check(`${route} cities`, async () => {
    const { response, payload } = await json(`/api/cities?route=${route}`);
    assert(response.ok && payload?.data?.length, `${route} cities are empty`);
  });
  await check(`${route} universities`, async () => {
    const { response, payload } = await json(`/api/universities?route=${route}`);
    assert(response.ok && payload?.data?.length, `${route} universities are empty`);
  });
  await check(`${route} branches`, async () => {
    const { response, payload } = await json(`/api/branches?route=${route}&pageSize=5`);
    assert(response.ok && payload?.data?.length, `${route} branches are empty`);
  });
}

await check("current FE college search", async () => {
  const { response, payload } = await json("/api/colleges?q=Urvara&route=FE");
  assert(response.ok && payload?.data?.some((college) => college.instituteCode === "02805"), "new FE college is missing");
});

await check("FE and DSE college separation", async () => {
  const { response, payload } = await json("/api/colleges?q=Urvara&route=DSE");
  assert(response.ok && !payload?.data?.some((college) => college.instituteCode === "02805"), "FE-only college leaked into DSE");
});

await check("college detail API", async () => {
  const { response, payload } = await json("/api/colleges/02805-urvara-pathrikar-engineering-college");
  assert(response.ok && payload?.instituteCode === "02805" && payload?.collegeBranches?.length, "college details are incomplete");
});

await check("missing college returns 404", async () => {
  const { response } = await json("/api/colleges/00000-not-a-real-college");
  assert(response.status === 404, `missing college returned HTTP ${response.status}`);
});

await check("college branch API", async () => {
  const { response, payload } = await json("/api/colleges/02805-urvara-pathrikar-engineering-college/branches?route=FE");
  assert(response.ok && payload?.data?.some((branch) => branch.branchCode === "0280556610"), "published branch is missing");
});

await check("cutoff explorer API", async () => {
  const { response, payload } = await json("/api/cutoffs?q=Urvara&route=FE&year=2026-27&round=1&pageSize=5");
  assert(response.ok && payload?.data?.length && payload.data.every((row) => row.dataset.admissionRoute === "FE"), "FE cutoffs are missing or mixed");
});

const fePayload = {
  percentile: 25,
  academicYear: "2026-27",
  capRound: 1,
  category: "OPEN",
  gender: "MALE",
  homeUniversity: "Dr. Babasaheb Ambedkar Marathwada University",
  preferredBranches: ["Computer Science"],
  preferredCities: ["Chhatrapati Sambhajinagar"],
  collegeTypes: [],
  autonomousOnly: false,
  resultMode: "ALL_MATCHING_BRANCHES",
  zone: "ALL",
  page: 1,
  pageSize: 30,
  tfws: false,
  pwd: false,
  defence: false,
  ews: false
};

await check("FE prediction logic", async () => {
  const { response, payload } = await json("/api/predict/fe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(fePayload)
  });
  assert(response.ok && payload?.results?.length, "FE prediction returned no results");
  assert(payload.results.every((result) => result.admissionRoute === "FE" && result.year === "2026-27"), "FE results mixed routes or years");
  assert(payload.results.some((result) => result.instituteCode === "02805"), "new FE college is missing from an eligible prediction");
});

const dsePayload = {
  diplomaPercentage: 89.2,
  meritNumber: 1000,
  diplomaBranch: "Computer Engineering",
  category: "OPEN",
  gender: "MALE",
  preferredBranches: ["Computer Engineering"],
  preferredCities: ["Pune"],
  collegeTypes: [],
  autonomousOnly: false,
  resultMode: "BEST_BRANCH_PER_COLLEGE",
  zone: "ALL",
  page: 1,
  pageSize: 10,
  ews: false,
  pwd: false,
  defence: false
};

await check("DSE prediction logic", async () => {
  const { response, payload } = await json("/api/predict/dse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(dsePayload)
  });
  assert(response.ok && payload?.results?.length, "DSE prediction returned no results");
  assert(payload.results.every((result) => result.admissionRoute === "DSE"), "DSE results contain FE records");
});

for (const [name, path] of [
  ["FE prediction validation", "/api/predict/fe"],
  ["DSE prediction validation", "/api/predict/dse"],
  ["comparison validation", "/api/compare"]
]) {
  await check(name, async () => {
    const { response } = await json(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    assert(response.status === 400, `${path} returned HTTP ${response.status} instead of 400`);
  });
}

for (const [route, selection] of [
  ["FE", { instituteCode: "02805", branchCode: "0280556610" }],
  ["DSE", { instituteCode: "06640", branchCode: "0664024210" }]
]) {
  await check(`${route} comparison API`, async () => {
    const { response, payload } = await json("/api/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ admissionRoute: route, selections: [selection] })
    });
    assert(response.ok && payload?.data?.[0]?.admissionRoute === route, `${route} comparison failed`);
  });
}

for (const [name, path, method] of [
  ["shortlists read", "/api/shortlists", "GET"],
  ["shortlists create", "/api/shortlists", "POST"],
  ["shortlists delete", "/api/shortlists", "DELETE"],
  ["preference lists read", "/api/preference-lists", "GET"],
  ["preference lists create", "/api/preference-lists", "POST"],
  ["preference lists replace", "/api/preference-lists", "PUT"],
  ["preference lists update", "/api/preference-lists", "PATCH"],
  ["preference lists delete", "/api/preference-lists", "DELETE"],
  ["saved comparisons read", "/api/saved-comparisons", "GET"],
  ["saved comparisons create", "/api/saved-comparisons", "POST"],
  ["saved comparisons update", "/api/saved-comparisons", "PUT"],
  ["saved comparisons delete", "/api/saved-comparisons", "DELETE"],
  ["student profiles read", "/api/student-profiles", "GET"],
  ["student profiles create", "/api/student-profiles", "POST"],
  ["student profiles delete", "/api/student-profiles", "DELETE"],
  ["prediction history read", "/api/prediction-history", "GET"],
  ["prediction history create", "/api/prediction-history", "POST"],
  ["prediction history delete", "/api/prediction-history", "DELETE"],
  ["preference PDF", "/api/preference-lists/pdf", "POST"],
  ["prediction PDF", "/api/prediction-reports/pdf", "POST"],
  ["account deletion", "/api/account", "DELETE"]
]) {
  await check(`${name} requires student login`, async () => {
    const { response } = await json(path, {
      method,
      headers: method === "GET" ? {} : { "content-type": "application/json" },
      body: method === "GET" ? undefined : "{}"
    });
    assert(response.status === 401, `${path} returned HTTP ${response.status} instead of 401`);
  });
}

await check("student authentication session", async () => {
  const response = await request("/api/auth/get-session");
  assert(response.ok, `/api/auth/get-session returned HTTP ${response.status}`);
});

for (const [name, path] of [
  ["admin imports", "/api/admin/imports"],
  ["admin session", "/api/admin/session"],
  ["admin data controls", "/api/admin/data-controls"],
  ["admin data quality", "/api/admin/data-quality"],
  ["admin prediction health", "/api/admin/prediction-health"],
  ["admin datasets", "/api/admin/datasets"]
]) {
  await check(`${name} rejects guests`, async () => {
    const { response } = await json(path);
    assert(response.status === 401, `${path} returned HTTP ${response.status} instead of 401`);
  });
  if (adminToken.length >= 32) {
    await check(`${name} accepts administrator`, async () => {
      const { response, payload } = await json(path, { headers: { "x-admin-token": adminToken } });
      assert(response.ok && payload, `${path} returned HTTP ${response.status}`);
    });
  }
}

for (const [name, path, method] of [
  ["admin import detail", "/api/admin/imports/0", "GET"],
  ["admin import bulk review", "/api/admin/imports/0/bulk-review", "POST"],
  ["admin import publish", "/api/admin/imports/0/publish", "POST"],
  ["admin import record update", "/api/admin/imports/0/records/0", "PATCH"],
  ["admin import reprocess", "/api/admin/imports/0/reprocess", "POST"],
  ["admin import rollback", "/api/admin/imports/0/rollback", "POST"],
  ["admin data controls mutation", "/api/admin/data-controls", "POST"],
  ["admin upload", "/api/admin/imports", "POST"]
]) {
  await check(`${name} rejects guests`, async () => {
    const { response } = await json(path, {
      method,
      headers: method === "GET" ? {} : { "content-type": "application/json" },
      body: method === "GET" ? undefined : "{}"
    });
    assert(response.status === 401, `${path} returned HTTP ${response.status} instead of 401`);
  });
}

for (const [name, path, contentType] of [
  ["AI site guide", "/llms.txt", "text/plain"],
  ["AI college catalog", "/llms-colleges.txt", "text/plain"],
  ["sitemap", "/sitemap.xml", "application/xml"],
  ["robots", "/robots.txt", "text/plain"]
]) {
  await check(name, async () => {
    const response = await request(path);
    assert(response.ok && (response.headers.get("content-type") || "").includes(contentType), `${path} has an invalid response`);
  });
}

let failures = 0;
for (const result of results) {
  if (result.passed) {
    console.log(`PASS  ${result.name.padEnd(44)} ${result.duration} ms`);
  } else {
    failures += 1;
    console.error(`FAIL  ${result.name.padEnd(44)} ${result.error}`);
  }
}

console.log(`\n${results.length - failures}/${results.length} route checks passed for ${baseUrl}.`);
if (failures) process.exitCode = 1;
