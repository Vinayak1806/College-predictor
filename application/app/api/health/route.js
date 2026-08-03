import { NextResponse } from "next/server";
import { logServerError } from "../../../lib/observability";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

function withTimeout(promise, milliseconds) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Database health check timed out.")), milliseconds);
    })
  ]);
}

export async function GET() {
  const startedAt = performance.now();

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 3000);
    const response = NextResponse.json({
      status: "ok",
      database: "reachable",
      timestamp: new Date().toISOString(),
      responseTimeMs: Math.round(performance.now() - startedAt),
      release: process.env.RELEASE_ID || null
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    logServerError("health.database", error);
    const response = NextResponse.json({
      status: "unhealthy",
      database: "unreachable",
      timestamp: new Date().toISOString()
    }, { status: 503 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
