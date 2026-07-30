import { NextResponse } from "next/server";
import { checkAdminImportAccess } from "../../../../../lib/adminImportAuth";
import { serializeAdminImport } from "../../../../../lib/adminImports";
import { prisma } from "../../../../../lib/prisma";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const access = checkAdminImportAccess(request);
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid import ID." }, { status: 400 });
  const url = new URL(request.url);
  const recordState = url.searchParams.get("records") || "ALL";
  const where =
    recordState === "READY"
      ? { valid: true, needsReview: false }
      : recordState === "REVIEW"
        ? { needsReview: true }
        : recordState === "EXCLUDED"
          ? { valid: false, needsReview: false }
        : undefined;

  const adminImport = await prisma.adminImport.findUnique({
    where: { id: BigInt(id) },
    include: {
      records: {
        where,
        orderBy: { rowNumber: "asc" },
        take: 100
      },
      _count: { select: { records: true } }
    }
  });
  if (!adminImport) return NextResponse.json({ error: "Import not found." }, { status: 404 });
  return NextResponse.json({ data: serializeAdminImport(adminImport, true) });
}
