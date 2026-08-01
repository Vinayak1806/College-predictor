import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookie,
  checkAdminImportAccess,
  createAdminSession,
  revokeAdminSession,
  verifyAdminToken
} from "../../../../lib/adminImportAuth";
import { clearRateLimit, consumeRateLimit, requestAddress, securityHash } from "../../../../lib/rateLimit";

const LOGIN_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

function cookieValue(request) {
  return request.cookies?.get?.(ADMIN_SESSION_COOKIE)?.value || "";
}

export async function GET(request) {
  const access = await checkAdminImportAccess(request);
  return NextResponse.json({
    authenticated: access.allowed,
    requiresToken: access.requiresToken
  }, { status: access.allowed ? 200 : access.status });
}

export async function POST(request) {
  const rateLimitKey = `admin-login:${securityHash(requestAddress(request))}`;
  const attempt = await consumeRateLimit(rateLimitKey, LOGIN_LIMIT);
  if (!attempt.allowed) {
    return NextResponse.json(
      { error: "Too many admin sign-in attempts. Try again later." },
      { status: 429, headers: { "retry-after": String(attempt.retryAfter) } }
    );
  }

  const body = await request.json().catch(() => null);
  const access = verifyAdminToken(body?.token);
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  await clearRateLimit(rateLimitKey);
  const sessionToken = await createAdminSession(request);
  const cookie = adminSessionCookie(sessionToken);
  const response = NextResponse.json({ authenticated: true, requiresToken: true });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

export async function DELETE(request) {
  await revokeAdminSession(cookieValue(request));
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.SECURE_DEPLOYMENT === "true" || process.env.VERCEL === "1" || process.env.BETTER_AUTH_URL?.startsWith("https://"),
    path: "/",
    maxAge: 0
  });
  return response;
}
