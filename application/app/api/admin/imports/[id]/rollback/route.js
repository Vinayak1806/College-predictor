import { NextResponse } from "next/server";
import { checkAdminImportAccess } from "../../../../../../lib/adminImportAuth";
import { rollbackAdminImport, serializeAdminImport } from "../../../../../../lib/adminImports";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(request, { params }) {
  const access = await checkAdminImportAccess(request);
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid import ID." }, { status: 400 });
    const adminImport = await rollbackAdminImport(id);
    return NextResponse.json({ data: serializeAdminImport(adminImport) });
  } catch (error) {
    console.error("Admin import rollback failed", error);
    return NextResponse.json({ error: error.message || "The import could not be rolled back." }, { status: error.status || 500 });
  }
}
