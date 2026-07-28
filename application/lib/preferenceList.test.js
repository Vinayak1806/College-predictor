import assert from "node:assert/strict";
import test from "node:test";
import {
  addPreferenceItem,
  movePreferenceItem,
  organizePreferenceItems,
  predictionZoneToPreferenceZone,
  preferenceItemId,
  preferenceListWarnings
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

test("organizes risk groups while preserving order inside each group", () => {
  const organized = organizePreferenceItems([
    { id: "safe-1", zone: "SAFE" },
    { id: "target-1", zone: "TARGET" },
    { id: "ambitious-1", zone: "AMBITIOUS" },
    { id: "target-2", zone: "TARGET" }
  ]);

  assert.deepEqual(organized.map((item) => item.id), [
    "ambitious-1",
    "target-1",
    "target-2",
    "safe-1"
  ]);
});

test("warns when a safer choice is placed above a more ambitious choice", () => {
  const warnings = preferenceListWarnings([
    { id: "safe-1", zone: "SAFE" },
    { id: "target-1", zone: "TARGET" }
  ]);

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Preference 1/);
});
