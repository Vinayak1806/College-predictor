import { NextResponse } from "next/server";

const privatePaths = ["/admin", "/api", "/account", "/login", "/results"];

export function middleware(request) {
  const response = NextResponse.next();
  const publicIndexing = process.env.ALLOW_SEARCH_INDEXING === "true";
  const privatePage = privatePaths.some((path) =>
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`)
  );

  response.headers.set(
    "X-Robots-Tag",
    publicIndexing && !privatePage ? "index, follow" : "noindex, nofollow, noarchive"
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
