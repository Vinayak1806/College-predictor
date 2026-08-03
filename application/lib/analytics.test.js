import test from "node:test";
import assert from "node:assert/strict";
import { trackAnalyticsEvent } from "./analytics.js";

test("analytics events are harmless when the browser tag is unavailable", () => {
  assert.equal(trackAnalyticsEvent("prediction_completed", { result_count: 10 }), false);
});

test("analytics rejects unsafe event names before using the browser", () => {
  assert.equal(trackAnalyticsEvent("Invalid event name", {}), false);
});
