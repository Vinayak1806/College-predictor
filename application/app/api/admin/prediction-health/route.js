import { NextResponse } from "next/server";
import { checkAdminImportAccess } from "../../../../lib/adminImportAuth";
import { prisma } from "../../../../lib/prisma";
import { runDsePredictionBacktest, runFePredictionBacktest } from "../../../../lib/predictionBacktest";
import { createRequestId, logServerError, publicServerError } from "../../../../lib/observability";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const access = await checkAdminImportAccess(request);
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const route = new URL(request.url).searchParams.get("route") === "DSE" ? "DSE" : "FE";
    const report = route === "DSE"
      ? await runDsePredictionBacktest(prisma)
      : await runFePredictionBacktest(prisma);
    return NextResponse.json({ ...report, admissionRoute: route });
  } catch (error) {
    const requestId = createRequestId();
    logServerError("admin.prediction-health", error, { requestId });
    return NextResponse.json(
      publicServerError("Could not run prediction backtests.", requestId),
      { status: 500 }
    );
  }
}
