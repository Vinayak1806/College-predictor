import assert from "node:assert/strict";
import test from "node:test";
import { cutoffQuerySchema } from "./validation.js";

test("cutoff filters receive stable pagination and sort defaults", () => {
  const result = cutoffQuerySchema.parse({});

  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 20);
  assert.equal(result.sort, "NEWEST");
});

test("cutoff filters coerce round and pagination values", () => {
  const result = cutoffQuerySchema.parse({
    round: "3",
    page: "2",
    pageSize: "30",
    route: "FE",
    sort: "CUTOFF_HIGH"
  });

  assert.equal(result.round, 3);
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 30);
});

test("cutoff filters reject unsupported sort and oversized pages", () => {
  assert.equal(cutoffQuerySchema.safeParse({ sort: "POPULAR" }).success, false);
  assert.equal(cutoffQuerySchema.safeParse({ pageSize: "100" }).success, false);
});

