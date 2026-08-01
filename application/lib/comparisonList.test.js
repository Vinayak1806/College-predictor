import test from "node:test";
import assert from "node:assert/strict";
import { addComparisonItem, createComparisonItemFromResult } from "./comparisonList.js";

const result = {
  instituteCode: "16006",
  college: "COEP Technological University",
  collegeSlug: "16006-coep-technological-university",
  branchCode: "1600624210",
  branch: "Computer Engineering",
  admissionRoute: "DSE",
  zone: "TARGET",
  studentScore: 98,
  closingCutoff: 98.2,
  latestCutoff: 98.3,
  margin: -0.2,
  year: "2025-26",
  round: 3,
  seatType: "GOPENS",
  dataConfidence: "HIGH"
};

test("creates a compact comparison item from a predictor result", () => {
  const item = createComparisonItemFromResult(result);
  assert.equal(item.instituteCode, "16006");
  assert.equal(item.branchCode, "1600624210");
  assert.equal(item.admissionRoute, "DSE");
  assert.equal(item.prediction.zone, "TARGET");
});

test("prevents duplicate college and branch comparison items", () => {
  const item = createComparisonItemFromResult(result);
  const duplicate = addComparisonItem([item], item);
  assert.equal(duplicate.added, false);
  assert.equal(duplicate.reason, "DUPLICATE");
});

test("limits the comparison list to three choices", () => {
  const items = ["1", "2", "3"].map((code) => ({ admissionRoute: "FE", instituteCode: code, branchCode: code }));
  const resultToAdd = addComparisonItem(items, { admissionRoute: "FE", instituteCode: "4", branchCode: "4" });
  assert.equal(resultToAdd.added, false);
  assert.equal(resultToAdd.reason, "FULL");
});

test("keeps FE and DSE comparison limits separate", () => {
  const items = ["1", "2", "3"].map((code) => ({ admissionRoute: "FE", instituteCode: code, branchCode: code }));
  const resultToAdd = addComparisonItem(items, { admissionRoute: "DSE", instituteCode: "1", branchCode: "1" });
  assert.equal(resultToAdd.added, true);
});
