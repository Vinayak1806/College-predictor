import { NextResponse } from "next/server";
import { checkAdminImportAccess } from "../../../../../../../lib/adminImportAuth";
import { serializeAdminImport, updateAdminImportRecord } from "../../../../../../../lib/adminImports";
import { adminRecordCorrectionSchema } from "../../../../../../../lib/adminImportValidation";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  const access = await checkAdminImportAccess(request);
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id, recordId } = await params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(recordId)) {
    return NextResponse.json({ error: "Invalid import or record ID." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid correction request." }, { status: 400 });
  }

  const validation = adminRecordCorrectionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Check the corrected record.", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const adminImport = await updateAdminImportRecord(id, recordId, validation.data);
    return NextResponse.json({ data: serializeAdminImport(adminImport) });
  } catch (error) {
    console.error("Admin staged-record correction failed", error);
    return NextResponse.json(
      { error: error.message || "The staged record could not be updated." },
      { status: error.status || 500 }
    );
  }
}
