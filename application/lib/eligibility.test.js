import test from "node:test";
import assert from "node:assert/strict";
import { eligibleSeatTypesForCollege, universityEligibilityForCollege } from "./eligibility.js";

const student = {
  category: "OBC",
  gender: "MALE",
  homeUniversity: "Pune University",
  tfws: false,
  ews: false,
  pwd: false,
  defence: false
};

test("college in the student's university uses Home University seats", () => {
  assert.equal(universityEligibilityForCollege(student.homeUniversity, "Pune University"), "HOME");
  const seats = eligibleSeatTypesForCollege(student, "Pune University");
  assert.ok(seats.includes("GOBCH"));
  assert.ok(seats.includes("GOPENH"));
  assert.ok(!seats.includes("GOBCO"));
});

test("college in another university uses Other Than Home University seats", () => {
  assert.equal(universityEligibilityForCollege(student.homeUniversity, "Mumbai University"), "OTHER");
  const seats = eligibleSeatTypesForCollege(student, "Mumbai University");
  assert.ok(seats.includes("GOBCO"));
  assert.ok(seats.includes("GOPENO"));
  assert.ok(!seats.includes("GOBCH"));
});
