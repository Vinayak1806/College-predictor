import { NextResponse } from "next/server";
import { checkAdminImportAccess } from "../../../../lib/adminImportAuth";
import { prisma } from "../../../../lib/prisma";
import { runFePredictionBacktest } from "../../../../lib/predictionBacktest";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const access = await checkAdminImportAccess(request);
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    return NextResponse.json(await runFePredictionBacktest(prisma));
  } catch (error) {
    return NextResponse.json(
      { error: "Could not run prediction backtests.", detail: error.message },
      { status: 500 }
    );
  }
}
