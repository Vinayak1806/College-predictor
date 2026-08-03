import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSiteUrl } from "./site.js";

test("site URLs keep only a valid origin", () => {
  assert.equal(normalizeSiteUrl("https://example.com/path"), "https://example.com");
});

test("invalid site URLs safely fall back to localhost", () => {
  assert.equal(normalizeSiteUrl("not a URL"), "http://localhost:3000");
});
