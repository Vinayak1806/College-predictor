import test from "node:test";
import assert from "node:assert/strict";
import { evaluateBacktestGroup, summarizeBacktest } from "./predictionBacktest.js";

const profile = {
  id: "obc-male",
  label: "OBC male",
  percentile: 89.2,
  category: "OBC",
  gender: "MALE",
  homeUniversity: "Pune University",
  tfws: false,
  pwd: false,
  defence: false,
  ews: false
};

function row(year, round, cutoff, seatType = "GOBCH") {
  return {
    collegeBranchId: 1n,
    closingScore: cutoff,
    section: "STANDARD",
    dataset: { academicYear: year, capRound: round },
    seatType: { code: seatType },
    collegeBranch: {
      branch: { displayName: "Computer Engineering" },
      college: {
        instituteCode: "01234",
        name: "Example College",
        university: { name: "Pune University" }
      }
    }
  };
}

test("backtest holds out the target year and compares admission zones", () => {
  const evaluation = evaluateBacktestGroup([
    row("2023-24", 3, 87),
    row("2024-25", 3, 88),
    row("2025-26", 4, 90)
  ], profile, ["2023-24", "2024-25"], "2025-26");

  assert.equal(evaluation.predictedCutoff, 87.67);
  assert.equal(evaluation.actualCutoff, 90);
  assert.equal(evaluation.predictedZone, "TARGET");
  assert.equal(evaluation.actualZone, "TARGET");
  assert.equal(evaluation.zoneDistance, 0);
  assert.equal(evaluation.absoluteError, 2.33);
});

test("backtest ignores groups without every training year", () => {
  const evaluation = evaluateBacktestGroup([
    row("2024-25", 3, 88),
    row("2025-26", 4, 90)
  ], profile, ["2023-24", "2024-25"], "2025-26");

  assert.equal(evaluation, null);
});

test("profile summary reports exact and nearby zone accuracy", () => {
  const summary = summarizeBacktest(profile, [
    { zoneDistance: 0, absoluteError: 1 },
    { zoneDistance: 1, absoluteError: 3 },
    { zoneDistance: 2, absoluteError: 5 }
  ]);

  assert.equal(summary.testedOptions, 3);
  assert.equal(summary.exactZoneAccuracy, 33.3);
  assert.equal(summary.adjacentZoneAccuracy, 66.7);
  assert.equal(summary.meanAbsoluteError, 3);
});
