import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { createPredictionReportPdf } from "./predictionReportPdf.js";

test("creates a personalized prediction PDF", async () => {
  const bytes = await createPredictionReportPdf({
    route: "FE",
    studentName: "Student",
    studentEmail: "student@example.com",
    profile: { Percentile: "89.20", Category: "OBC" },
    totalResults: 1,
    results: [{ instituteCode: "06179", college: "Example College", branch: "Computer Engineering", zone: "TARGET", latestCutoff: 88.5, margin: 0.7, year: "2025-26", round: 3 }]
  }, new Date("2026-08-04T00:00:00Z"));
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.equal(pdf.getTitle(), "FE Personalized Prediction Report");
});
