import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { checkAdminImportAccess } from "../../../../lib/adminImportAuth";
import { listAdminDataControls, runAdminDataControl } from "../../../../lib/adminDataControls";

export const dynamic = "force-dynamic";

function denied(access) {
  return NextResponse.json({ error: access.error }, { status: access.status });
}

export async function GET(request) {
  const access = await checkAdminImportAccess(request);
  if (!access.allowed) return denied(access);
  return NextResponse.json({ data: await listAdminDataControls() });
}

export async function POST(request) {
  const access = await checkAdminImportAccess(request);
  if (!access.allowed) return denied(access);

  try {
    const result = await runAdminDataControl(await request.json());
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Check the selected route, year, round, and college." }, { status: 400 });
    }
    console.error("Admin data control failed", error);
    return NextResponse.json(
      { error: error.message || "The data control action failed." },
      { status: error.status || 500 }
    );
  }
}
