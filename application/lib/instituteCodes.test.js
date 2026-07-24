import assert from "node:assert/strict";
import test from "node:test";
import {
  currentInstituteCode,
  currentInstituteCodeSearch,
  normalizeInstituteCode
} from "./instituteCodes.js";


test("institute codes keep their five-digit format", () => {
  assert.equal(normalizeInstituteCode("6006"), "06006");
  assert.equal(normalizeInstituteCode("16006"), "16006");
});

test("verified historical codes resolve to current CAP codes", () => {
  assert.equal(currentInstituteCode("04005"), "14005");
  assert.equal(currentInstituteCode("6006"), "16006");
  assert.equal(currentInstituteCode("06155"), "06155");
});

test("only a code-shaped search is rewritten", () => {
  assert.equal(currentInstituteCodeSearch("06006"), "16006");
  assert.equal(currentInstituteCodeSearch("COEP"), null);
});
