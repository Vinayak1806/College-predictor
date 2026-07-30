import assert from "node:assert/strict";
import test from "node:test";
import {
  adminSessionCookie,
  checkAdminCookieAccess,
  verifyAdminToken
} from "./adminImportAuth.js";

test("rejects an incorrect configured admin token", () => {
  const previous = process.env.ADMIN_IMPORT_TOKEN;
  process.env.ADMIN_IMPORT_TOKEN = "correct-token";
  try {
    assert.equal(verifyAdminToken("wrong-token").allowed, false);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_IMPORT_TOKEN;
    else process.env.ADMIN_IMPORT_TOKEN = previous;
  }
});

test("accepts the signed HTTP-only admin session value", () => {
  const previous = process.env.ADMIN_IMPORT_TOKEN;
  process.env.ADMIN_IMPORT_TOKEN = "correct-token";
  try {
    const cookie = adminSessionCookie("correct-token");
    assert.equal(cookie.options.httpOnly, true);
    assert.equal(checkAdminCookieAccess(cookie.value).allowed, true);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_IMPORT_TOKEN;
    else process.env.ADMIN_IMPORT_TOKEN = previous;
  }
});
