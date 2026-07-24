import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { runFePredictionBacktest } from "../../../../lib/predictionBacktest";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await runFePredictionBacktest(prisma));
  } catch (error) {
    return NextResponse.json(
      { error: "Could not run prediction backtests.", detail: error.message },
      { status: 500 }
    );
  }
}
