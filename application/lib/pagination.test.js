import assert from "node:assert/strict";
import test from "node:test";
import { getPageRange, getPaginationItems } from "./pagination.js";

test("shows every page when there are seven or fewer pages", () => {
  assert.deepEqual(getPaginationItems(2, 4), [1, 2, 3, 4]);
});

test("keeps the current page visible in a long page list", () => {
  assert.deepEqual(getPaginationItems(8, 20), [1, "start-ellipsis", 7, 8, 9, "end-ellipsis", 20]);
});

test("shows the final pages near the end of a long page list", () => {
  assert.deepEqual(getPaginationItems(19, 20), [1, "start-ellipsis", 16, 17, 18, 19, 20]);
});

test("calculates the visible result range", () => {
  assert.deepEqual(getPageRange(2, 10, 84), { start: 11, end: 20 });
  assert.deepEqual(getPageRange(9, 10, 84), { start: 81, end: 84 });
  assert.deepEqual(getPageRange(1, 10, 0), { start: 0, end: 0 });
});
