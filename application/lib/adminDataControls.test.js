import assert from "node:assert/strict";
import test from "node:test";
import { adminDataControlSchema } from "./adminDataControls.js";

test("accepts a reversible FE cutoff archive selection", () => {
  const result = adminDataControlSchema.parse({
    action: "ARCHIVE_CUTOFFS",
    admissionRoute: "FE",
    academicYear: "2026-27",
    capRound: 1
  });
  assert.equal(result.capRound, 1);
});

test("accepts a route-specific DSE college archive", () => {
  const result = adminDataControlSchema.parse({
    action: "ARCHIVE_COLLEGE_ROUTE",
    admissionRoute: "DSE",
    instituteCode: "06179",
    reason: "Not present in the current official route list"
  });
  assert.equal(result.admissionRoute, "DSE");
});

test("rejects destructive controls without a valid route and year", () => {
  assert.equal(adminDataControlSchema.safeParse({
    action: "ARCHIVE_CUTOFFS",
    admissionRoute: "ALL",
    academicYear: "2026"
  }).success, false);
});
