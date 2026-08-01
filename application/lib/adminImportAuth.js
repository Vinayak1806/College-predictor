import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma.js";
import { consumeRateLimit, requestAddress, securityHash } from "./rateLimit.js";

export const ADMIN_SESSION_COOKIE = "cap_admin_session";
const SESSION_MAX_AGE = 8 * 60 * 60;

function useSecureCookies() {
  return (
    process.env.SECURE_DEPLOYMENT === "true" ||
    process.env.VERCEL === "1" ||
    process.env.BETTER_AUTH_URL?.startsWith("https://")
  );
}

function sameToken(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function configuredToken() {
  const token = process.env.ADMIN_IMPORT_TOKEN || "";
  return token.length >= 32 ? token : "";
}

export function adminSessionHash(value) {
  return createHash("sha256")
    .update(`cap-predictor-admin-session:${value}`)
    .digest("hex");
}

function unconfiguredAccess() {
  return {
    allowed: false,
    status: 503,
    requiresToken: true,
    error: "Admin access is disabled until ADMIN_IMPORT_TOKEN is configured."
  };
}

export function verifyAdminToken(token) {
  const expectedToken = configuredToken();
  if (!expectedToken) return unconfiguredAccess();
  if (!sameToken(token, expectedToken)) {
    return { allowed: false, status: 401, requiresToken: true, error: "Admin sign-in failed." };
  }
  return { allowed: true, requiresToken: true };
}

export async function createAdminSession(request) {
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  const userAgent = request.headers.get("user-agent") || "unknown";
  const ipAddress =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  await prisma.adminSession.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  await prisma.adminSession.create({
    data: {
      tokenHash: adminSessionHash(rawToken),
      expiresAt,
      ipHash: securityHash(ipAddress),
      userAgentHash: securityHash(userAgent)
    }
  });

  return rawToken;
}

export async function checkAdminCookieAccess(cookieValue) {
  if (!configuredToken()) return unconfiguredAccess();
  if (!cookieValue) {
    return { allowed: false, status: 401, requiresToken: true, error: "An authenticated admin session is required." };
  }

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: adminSessionHash(cookieValue) },
    select: { id: true, expiresAt: true }
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.adminSession.delete({ where: { id: session.id } });
    return { allowed: false, status: 401, requiresToken: true, error: "The admin session has expired." };
  }

  await prisma.adminSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() }
  });
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

export async function checkAdminImportAccess(request) {
  const expectedToken = configuredToken();
  if (!expectedToken) return unconfiguredAccess();

  const providedToken = request.headers.get("x-admin-token");
  if (providedToken) {
    if (sameToken(providedToken, expectedToken)) {
      return { allowed: true, requiresToken: true };
    }

    const attempt = await consumeRateLimit(
      `admin-api:${securityHash(requestAddress(request))}`,
      { limit: 10, windowMs: 15 * 60 * 1000 }
    );
    if (!attempt.allowed) {
      return {
        allowed: false,
        status: 429,
        requiresToken: true,
        error: "Too many unauthorized admin requests. Try again later.",
        retryAfter: attempt.retryAfter
      };
    }
    return { allowed: false, status: 401, requiresToken: true, error: "Admin authentication failed." };
  }

  return checkAdminCookieAccess(requestCookie(request));
}

export async function revokeAdminSession(cookieValue) {
  if (!cookieValue) return;
  await prisma.adminSession.deleteMany({
    where: { tokenHash: adminSessionHash(cookieValue) }
  });
}

export function adminSessionCookie(sessionToken) {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: sessionToken,
    options: {
      httpOnly: true,
      sameSite: "strict",
      secure: useSecureCookies(),
      path: "/",
      maxAge: SESSION_MAX_AGE
    }
  };
}
