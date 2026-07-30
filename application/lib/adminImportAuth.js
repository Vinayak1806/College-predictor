import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "cap_admin_session";
const SESSION_MAX_AGE = 8 * 60 * 60;

function sameToken(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function configuredToken() {
  return process.env.ADMIN_IMPORT_TOKEN || "";
}

function sessionValue(token) {
  return createHash("sha256")
    .update(`cap-predictor-admin:${token}`)
    .digest("hex");
}

function unconfiguredAccess() {
  if (process.env.NODE_ENV === "production") {
    return {
      allowed: false,
      status: 503,
      requiresToken: true,
      error: "ADMIN_IMPORT_TOKEN must be configured before production administration is enabled."
    };
  }
  return { allowed: true, requiresToken: false };
}

export function verifyAdminToken(token) {
  const expectedToken = configuredToken();
  if (!expectedToken) return unconfiguredAccess();
  if (!sameToken(token, expectedToken)) {
    return { allowed: false, status: 401, requiresToken: true, error: "The admin token is incorrect." };
  }
  return { allowed: true, requiresToken: true };
}

export function checkAdminCookieAccess(cookieValue) {
  const expectedToken = configuredToken();
  if (!expectedToken) return unconfiguredAccess();
  if (!sameToken(cookieValue, sessionValue(expectedToken))) {
    return { allowed: false, status: 401, requiresToken: true, error: "An authenticated admin session is required." };
  }
  return { allowed: true, requiresToken: true };
}

function requestCookie(request) {
  const direct = request.cookies?.get?.(ADMIN_SESSION_COOKIE)?.value;
  if (direct) return direct;

  const cookieHeader = request.headers.get("cookie") || "";
  const pair = cookieHeader
    .split(";")
    .map((value) => value.trim().split("="))
    .find(([name]) => name === ADMIN_SESSION_COOKIE);
  return pair ? decodeURIComponent(pair.slice(1).join("=")) : "";
}

export function checkAdminImportAccess(request) {
  const expectedToken = configuredToken();
  if (!expectedToken) return unconfiguredAccess();

  const providedToken = request.headers.get("x-admin-token");
  if (providedToken && sameToken(providedToken, expectedToken)) {
    return { allowed: true, requiresToken: true };
  }

  return checkAdminCookieAccess(requestCookie(request));
}

export function adminSessionCookie(token) {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: sessionValue(token),
    options: {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE
    }
  };
}
