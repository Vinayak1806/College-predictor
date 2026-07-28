import test from "node:test";
import assert from "node:assert/strict";
import { applyResultMode } from "./resultDiversity.js";

function result(instituteCode, branch, strengthIndex, zone = "TARGET", margin = 0) {
  return { instituteCode, branch, strengthIndex, zone, margin };
}

const results = [
  result("1", "Computer", 90),
  result("1", "IT", 90, "SAFE", 5),
  result("1", "AI", 90, "AMBITIOUS", -5),
  result("2", "Computer", 80),
  result("2", "Mechanical", 80, "SAFE", 6),
  result("3", "Computer", 70)
];

test("best branch mode returns one option from each college", () => {
  const visible = applyResultMode(results, "BEST_BRANCH_PER_COLLEGE");

  assert.deepEqual(visible.map((item) => item.instituteCode), ["1", "2", "3"]);
  assert.equal(new Set(visible.map((item) => item.instituteCode)).size, visible.length);
});

test("best colleges mode limits each college to two branches", () => {
  const visible = applyResultMode(results, "BEST_COLLEGES_FIRST");
  const firstCollegeCount = visible.filter((item) => item.instituteCode === "1").length;

  assert.equal(firstCollegeCount, 2);
  assert.deepEqual(visible.slice(0, 3).map((item) => item.instituteCode), ["1", "2", "3"]);
});

test("all branches mode keeps every option but diversifies their order", () => {
  const visible = applyResultMode(results, "ALL_MATCHING_BRANCHES");

  assert.equal(visible.length, results.length);
  assert.deepEqual(visible.slice(0, 3).map((item) => item.instituteCode), ["1", "2", "3"]);
});
