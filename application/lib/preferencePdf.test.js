import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { createPreferenceListPdf } from "./preferencePdf.js";

test("creates a branded multi-page CAP preference-list PDF", async () => {
  const items = Array.from({ length: 45 }, (_, index) => ({
    instituteCode: String(6100 + index).padStart(5, "0"),
    college: `Example College of Engineering and Technology Number ${index + 1}, Pune`,
    branch: "Computer Science and Engineering (Artificial Intelligence and Machine Learning)",
    cutoff: index === 44 ? null : 89.25,
    year: "2025-26"
  }));

  const buffer = await createPreferenceListPdf(items, new Date("2026-08-04T10:00:00Z"));
  assert.equal(buffer.subarray(0, 8).toString("ascii"), "%PDF-1.7");

  const pdf = await PDFDocument.load(buffer);
  assert.equal(pdf.getTitle(), "Admission Compass College Preference List");
  assert.equal(pdf.getAuthor(), "Admission Compass");
  assert.ok(pdf.getPageCount() > 1);
  for (const page of pdf.getPages()) {
    assert.ok(page.getWidth() > page.getHeight());
  }
});
