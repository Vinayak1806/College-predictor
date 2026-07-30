import { NextResponse } from "next/server";
import { checkAdminImportAccess } from "../../../../lib/adminImportAuth";

export async function GET(request) {
  const access = checkAdminImportAccess(request);
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  return NextResponse.json({
    message: "Use /api/admin/imports for upload, extraction, validation, publication history and rollback.",
    endpoint: "/api/admin/imports"
  });
}
