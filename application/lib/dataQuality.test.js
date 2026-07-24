import assert from "node:assert/strict";
import test from "node:test";
import {
  coveragePercent,
  isInvalidUniversityName,
  isMissingQualityValue,
  normalizeCollegeName
} from "./dataQuality.js";

test("recognizes missing quality values", () => {
  assert.equal(isMissingQualityValue(null), true);
  assert.equal(isMissingQualityValue("N/A"), true);
  assert.equal(isMissingQualityValue("Not centrally verified"), true);
  assert.equal(isMissingQualityValue("Savitribai Phule Pune University"), false);
});

test("separates autonomy status from university affiliation", () => {
  assert.equal(isInvalidUniversityName("Autonomous Institute"), true);
  assert.equal(isInvalidUniversityName("Deemed to be University"), true);
  assert.equal(isInvalidUniversityName("Savitribai Phule Pune University"), false);
});

test("normalizes college names for duplicate detection", () => {
  assert.equal(
    normalizeCollegeName("G.H. Raisoni College of Engineering & Management"),
    "g h raisoni college of engineering management"
  );
});

test("calculates rounded coverage percentages", () => {
  assert.equal(coveragePercent(3, 4), 75);
  assert.equal(coveragePercent(0, 0), 0);
});
