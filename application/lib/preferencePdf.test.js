import assert from "node:assert/strict";
import test from "node:test";
import { createPreferenceListPdf } from "./preferencePdf.js";

test("creates a valid-looking PDF without preserving unsupported characters", () => {
  const pdf = createPreferenceListPdf([{
    zone: "TARGET",
    instituteCode: "06179",
    college: "Example College, Pune",
    branchCode: "0617924510",
    branch: "Computer Engineering",
    city: "Pune",
    year: "2025-26",
    round: 2,
    seatType: "GOBCH",
    cutoff: 89.25
  }], new Date("2026-08-03T10:00:00Z"));

  assert.equal(pdf.subarray(0, 8).toString("ascii"), "%PDF-1.4");
  assert.match(pdf.toString("ascii"), /CAP Predictor - College Preference List/);
  assert.match(pdf.toString("ascii"), /06179 - Example College, Pune/);
  assert.match(pdf.toString("ascii"), /%%EOF$/);
});
