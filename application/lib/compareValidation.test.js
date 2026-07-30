import test from "node:test";
import assert from "node:assert/strict";
import { compareRequestSchema } from "./validation.js";

test("accepts two college and branch comparison choices", () => {
  const parsed = compareRequestSchema.parse({
    selections: [
      { instituteCode: "16006", branchCode: "1600624510" },
      { instituteCode: "06273", branchCode: "0627324510" }
    ]
  });
  assert.equal(parsed.selections.length, 2);
});

test("allows a college overview without a branch", () => {
  const parsed = compareRequestSchema.parse({
    selections: [{ instituteCode: "16006" }]
  });
  assert.equal(parsed.selections[0].branchCode, undefined);
});

test("rejects duplicate college and branch choices", () => {
  const result = compareRequestSchema.safeParse({
    selections: [
      { instituteCode: "16006", branchCode: "1600624510" },
      { instituteCode: "16006", branchCode: "1600624510" }
    ]
  });
  assert.equal(result.success, false);
});
