import { NextResponse } from "next/server";
import { checkAdminImportAccess } from "../../../../lib/adminImportAuth";
import { createAndProcessImport, serializeAdminImport } from "../../../../lib/adminImports";
import { adminImportMetadataSchema } from "../../../../lib/adminImportValidation";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 600;

function denied(access) {
  return NextResponse.json({ error: access.error }, { status: access.status });
}

export async function GET(request) {
  const access = checkAdminImportAccess(request);
  if (!access.allowed) return denied(access);

  const imports = await prisma.adminImport.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { _count: { select: { records: true } } }
  });
  return NextResponse.json({
    requiresToken: access.requiresToken,
    data: imports.map((adminImport) => serializeAdminImport(adminImport))
  });
}

export async function POST(request) {
  const access = checkAdminImportAccess(request);
  if (!access.allowed) return denied(access);

  try {
    const formData = await request.formData();
    const validation = adminImportMetadataSchema.safeParse({
      documentType: formData.get("documentType"),
      admissionRoute: formData.get("admissionRoute"),
      academicYear: formData.get("academicYear"),
      capRound: formData.get("capRound") || undefined,
      quota: formData.get("quota") || "MH",
      sourceUrl: formData.get("sourceUrl") || ""
    });
    if (!validation.success) {
      return NextResponse.json(
        { error: "Check the upload details.", fields: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const adminImport = await createAndProcessImport({
      file: formData.get("file"),
      metadata: validation.data
    });
    return NextResponse.json({ data: serializeAdminImport(adminImport) }, { status: 201 });
  } catch (error) {
    console.error("Admin import failed", error);
    return NextResponse.json(
      {
        error: error.message || "The file could not be processed.",
        importId: error.importId
      },
      { status: error.status || 500 }
    );
  }
}

