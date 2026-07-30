import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookie,
  checkAdminImportAccess,
  verifyAdminToken
} from "../../../../lib/adminImportAuth";

export async function GET(request) {
  const access = checkAdminImportAccess(request);
  return NextResponse.json({
    authenticated: access.allowed,
    requiresToken: access.requiresToken
  }, { status: access.allowed ? 200 : access.status });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter the admin token." }, { status: 400 });
  }

  const access = verifyAdminToken(body?.token);
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const response = NextResponse.json({
    authenticated: true,
    requiresToken: access.requiresToken
  });

  if (access.requiresToken) {
    const cookie = adminSessionCookie(body.token);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
