import { prisma } from "../lib/prisma.js";
import { runDsePredictionBacktest, runFePredictionBacktest } from "../lib/predictionBacktest.js";

function printReport(label, report, scoreLabel) {
  console.log(`\n${label} prediction backtest`);
  console.log(`Training years: ${report.methodology.trainingYears.join(", ")}`);
  console.log(`Held-out year: ${report.methodology.targetYear}`);
  console.log(`Options tested: ${report.summary.testedOptions}`);
  console.log(`Exact admission zone: ${report.summary.exactZoneAccuracy}%`);
  console.log(`Within one zone: ${report.summary.adjacentZoneAccuracy}%`);
  console.log(`Mean cutoff error: ${report.summary.meanAbsoluteError.toFixed(2)} ${scoreLabel}\n`);

  console.table(report.profiles.map((profile) => ({
    profile: profile.label,
    options: profile.testedOptions,
    exactZone: `${profile.exactZoneAccuracy}%`,
    nearbyZone: `${profile.adjacentZoneAccuracy}%`,
    cutoffError: profile.meanAbsoluteError.toFixed(2)
  })));
}

try {
  const report = await runFePredictionBacktest(prisma);
  const dseReport = await runDsePredictionBacktest(prisma);
  printReport("FE", report, "percentile points");
  printReport("DSE", dseReport, "percentage points");
} catch (error) {
  console.error("Backtest failed:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
