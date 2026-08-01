import assert from "node:assert/strict";
import test from "node:test";
import {
  adminSessionCookie,
  adminSessionHash,
  verifyAdminToken
} from "./adminImportAuth.js";

function withAdminToken(value, callback) {
  const previous = process.env.ADMIN_IMPORT_TOKEN;
  if (value === undefined) delete process.env.ADMIN_IMPORT_TOKEN;
  else process.env.ADMIN_IMPORT_TOKEN = value;
  try {
    callback();
  } finally {
    if (previous === undefined) delete process.env.ADMIN_IMPORT_TOKEN;
    else process.env.ADMIN_IMPORT_TOKEN = previous;
  }
}

test("rejects an incorrect configured admin token without revealing which part failed", () => {
  withAdminToken("correct-token-that-is-longer-than-32-characters", () => {
    const result = verifyAdminToken("wrong-token");
    assert.equal(result.allowed, false);
    assert.equal(result.error, "Admin sign-in failed.");
  });
});

test("admin access fails closed when the server token is missing", () => {
  withAdminToken(undefined, () => {
    const result = verifyAdminToken("");
    assert.equal(result.allowed, false);
    assert.equal(result.status, 503);
  });
});

test("admin session cookies are HTTP-only and contain an opaque random value", () => {
  const opaqueToken = "a-random-session-value";
  const cookie = adminSessionCookie(opaqueToken);
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.sameSite, "strict");
  assert.equal(cookie.value, opaqueToken);
  assert.notEqual(adminSessionHash(opaqueToken), opaqueToken);
});
