import assert from "node:assert/strict";
import test from "node:test";
import {
  addPreferenceItem,
  movePreferenceItem,
  predictionZoneToPreferenceZone,
  preferenceItemId
} from "./preferenceList.js";

test("creates a stable college and branch choice ID", () => {
  assert.equal(preferenceItemId("06155", "Computer Engineering"), "06155:Computer Engineering");
});

test("maps predictor zones into preference-list categories", () => {
  assert.equal(predictionZoneToPreferenceZone("SAFE"), "SAFE");
  assert.equal(predictionZoneToPreferenceZone("TARGET"), "TARGET");
  assert.equal(predictionZoneToPreferenceZone("AMBITIOUS"), "AMBITIOUS");
  assert.equal(predictionZoneToPreferenceZone("HIGHLY_AMBITIOUS"), "AMBITIOUS");
});

test("prevents duplicate college and branch choices", () => {
  const item = { id: "06155:Computer Engineering" };
  assert.deepEqual(addPreferenceItem([item], item), { items: [item], added: false });
});

test("moves a choice without changing the remaining order", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(movePreferenceItem(items, 2, 0).map((item) => item.id), ["c", "a", "b"]);
});
