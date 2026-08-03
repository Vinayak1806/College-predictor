const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const totalRequests = Math.max(1, Number(process.env.LOAD_REQUESTS || 30));
const concurrency = Math.max(1, Math.min(20, Number(process.env.LOAD_CONCURRENCY || 10)));

const profile = {
  percentile: 89.2,
  category: "OBC",
  gender: "MALE",
  homeUniversity: "Savitribai Phule Pune University",
  preferredBranches: ["Computer Engineering"],
  preferredCities: ["Pune"],
  collegeTypes: [],
  autonomousOnly: false,
  resultMode: "BEST_BRANCH_PER_COLLEGE",
  zone: "ALL",
  page: 1,
  pageSize: 10,
  tfws: false,
  pwd: false,
  defence: false,
  ews: false
};

const durations = [];
let nextRequest = 0;
let failures = 0;

async function worker() {
  while (nextRequest < totalRequests) {
    nextRequest += 1;
    const startedAt = performance.now();
    try {
      const response = await fetch(`${baseUrl}/api/predict/fe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "CAP-Predictor-Load-Test/1.0"
        },
        body: JSON.stringify(profile)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body.results)) throw new Error("Invalid prediction response");
      durations.push(performance.now() - startedAt);
    } catch (error) {
      failures += 1;
      console.error(`Request failed: ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
durations.sort((a, b) => a - b);

function percentile(value) {
  if (!durations.length) return 0;
  return durations[Math.min(durations.length - 1, Math.ceil(durations.length * value) - 1)];
}

console.log(JSON.stringify({
  baseUrl,
  requested: totalRequests,
  succeeded: durations.length,
  failed: failures,
  concurrency,
  responseTimeMs: {
    median: Math.round(percentile(0.5)),
    p95: Math.round(percentile(0.95)),
    maximum: Math.round(percentile(1))
  }
}, null, 2));

if (failures) process.exitCode = 1;
