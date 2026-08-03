import assert from "node:assert/strict";
import test from "node:test";
import { clearResponseCache, readResponseCache, responseCacheKey, writeResponseCache } from "./responseCache.js";

test("prediction cache hashes private form content and expires entries", () => {
  clearResponseCache();
  const raw = JSON.stringify({ percentile: 89.2, category: "OBC" });
  const key = responseCacheKey("FE", raw);
  assert.equal(key.includes("89.2"), false);
  assert.equal(key.includes("OBC"), false);

  writeResponseCache(key, { results: [1] }, { ttlMs: 10 });
  assert.deepEqual(readResponseCache(key), { results: [1] });
  assert.equal(readResponseCache(key, Date.now() + 20), null);
});
