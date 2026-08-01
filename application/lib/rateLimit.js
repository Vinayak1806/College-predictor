import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export function securityHash(value) {
  return createHash("sha256").update(String(value || "unknown")).digest("hex");
}

export function requestAddress(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function consumeRateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      INSERT INTO "auth_rate_limits" ("key", "count", "last_request")
      VALUES (${key}, 1, ${BigInt(now)})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "auth_rate_limits"."last_request" <= ${BigInt(windowStart)} THEN 1
          ELSE "auth_rate_limits"."count" + 1
        END,
        "last_request" = CASE
          WHEN "auth_rate_limits"."last_request" <= ${BigInt(windowStart)} THEN ${BigInt(now)}
          ELSE "auth_rate_limits"."last_request"
        END
      RETURNING "count", "last_request"
    `
  );

  const count = Number(rows[0]?.count || 1);
  const startedAt = Number(rows[0]?.last_request || now);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfter: Math.max(1, Math.ceil((windowMs - (now - startedAt)) / 1000))
  };
}

export async function clearRateLimit(key) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

export async function limitPublicRequest(request, scope, { limit = 30, windowMs = 60_000 } = {}) {
  const key = `public:${scope}:${securityHash(requestAddress(request))}`;
  const result = await consumeRateLimit(key, { limit, windowMs });
  if (result.allowed) return null;

  return Response.json(
    { error: "Too many requests. Please wait a moment and try again." },
    {
      status: 429,
      headers: {
        "retry-after": String(result.retryAfter),
        "cache-control": "no-store"
      }
    }
  );
}
