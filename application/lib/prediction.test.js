import test from "node:test";
import assert from "node:assert/strict";
import { analyzeCutoffHistory, calculateStrengthIndex, explainAdmissionZone } from "./prediction.js";

test("cutoff history keeps the latest round and best eligible seat for each year", () => {
  const analysis = analyzeCutoffHistory([
    { year: "2023-24", round: 1, cutoff: 80, seatType: "GOPENH" },
    { year: "2023-24", round: 3, cutoff: 82, seatType: "GOPENH" },
    { year: "2024-25", round: 3, cutoff: 84, seatType: "GOPENH" },
    { year: "2025-26", round: 3, cutoff: 86, seatType: "GOPENH" },
    { year: "2025-26", round: 3, cutoff: 83, seatType: "GOBCH" }
  ], 89);

  assert.equal(analysis.yearsAnalyzed, 3);
  assert.deepEqual(analysis.history.map((row) => row.cutoff), [82, 84, 83]);
  assert.equal(analysis.latest.seatType, "GOBCH");
  assert.equal(analysis.benchmarkCutoff, 83.17);
  assert.equal(analysis.confidence, "HIGH");
  assert.equal(analysis.trend, "STABLE");
});

test("strength index stays separate from admission margin", () => {
  const score = calculateStrengthIndex({
    historicalDemandScore: 90,
    autonomous: true,
    sanctionedIntake: 120,
    dataConfidence: "HIGH"
  });

  assert.equal(score, 91);
});

test("strength index is hidden without historical demand data", () => {
  assert.equal(calculateStrengthIndex({ historicalDemandScore: null }), null);
});

test("one-year history receives a conservative confidence adjustment", () => {
  const analysis = analyzeCutoffHistory([
    { year: "2025-26", round: 3, cutoff: 88, seatType: "GOPENH" }
  ], 90);

  assert.equal(analysis.confidence, "LIMITED");
  assert.equal(analysis.margin, 2);
  assert.equal(analysis.conservativePenalty, 2);
  assert.equal(analysis.adjustedMargin, 0);
  assert.equal(analysis.selectedCutoffMargin, 2);
  assert.match(explainAdmissionZone(analysis), /selected cutoff difference of \+2\.00/);
  assert.match(explainAdmissionZone(analysis), /final prediction margin of \+0\.00/);
});

test("multi-year zone explanation separates the selected cutoff from the benchmark", () => {
  const analysis = analyzeCutoffHistory([
    { year: "2023-24", round: 3, cutoff: 75, seatType: "GOPENH" },
    { year: "2024-25", round: 3, cutoff: 80, seatType: "GOPENH" },
    { year: "2025-26", round: 3, cutoff: 90, seatType: "GOPENH" }
  ], 89);

  assert.equal(analysis.selectedCutoffMargin, -1);
  assert.match(explainAdmissionZone(analysis), /3-year prediction benchmark/);
  assert.match(explainAdmissionZone(analysis), /benchmark difference/);
});

test("high volatility cannot be labeled high confidence", () => {
  const analysis = analyzeCutoffHistory([
    { year: "2023-24", round: 3, cutoff: 70, seatType: "GOPENH" },
    { year: "2024-25", round: 3, cutoff: 90, seatType: "GOPENH" },
    { year: "2025-26", round: 3, cutoff: 75, seatType: "GOPENH" }
  ], 85);

  assert.equal(analysis.confidence, "LIMITED");
  assert.ok(analysis.conservativePenalty > 0);
});
