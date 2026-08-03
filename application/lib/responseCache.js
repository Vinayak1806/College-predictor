import { createHash } from "node:crypto";

const globalCache = globalThis.__capPredictorResponseCache || new Map();
globalThis.__capPredictorResponseCache = globalCache;

export function responseCacheKey(namespace, value) {
  const digest = createHash("sha256").update(String(value)).digest("hex");
  return `${namespace}:${digest}`;
}

export function readResponseCache(key, now = Date.now()) {
  const entry = globalCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    globalCache.delete(key);
    return null;
  }
  return entry.value;
}

export function writeResponseCache(key, value, { ttlMs = 180_000, maxEntries = 200 } = {}) {
  if (globalCache.size >= maxEntries) {
    const oldestKey = globalCache.keys().next().value;
    if (oldestKey) globalCache.delete(oldestKey);
  }
  globalCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearResponseCache() {
  globalCache.clear();
}
