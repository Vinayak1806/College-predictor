import { NextResponse } from "next/server";
import { checkAdminImportAccess } from "../../../../../../lib/adminImportAuth";
import { bulkResolveAdminImportReview, serializeAdminImport } from "../../../../../../lib/adminImports";
import { adminBulkReviewSchema } from "../../../../../../lib/adminImportValidation";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(request, { params }) {
  const access = await checkAdminImportAccess(request);
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid import ID." }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid bulk-review request." }, { status: 400 });
  }
  const validation = adminBulkReviewSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: "Check the bulk-review action." }, { status: 400 });
  }

  try {
    const result = await bulkResolveAdminImportReview(id, validation.data);
    return NextResponse.json({
      data: serializeAdminImport(result.adminImport),
      action: {
        affectedRecords: result.affectedRecords,
        affectedInstitutes: result.affectedInstitutes
      }
    });
  } catch (error) {
    console.error("Admin bulk review failed", error);
    return NextResponse.json(
      { error: error.message || "The review rows could not be updated." },
      { status: error.status || 500 }
    );
  }
}
