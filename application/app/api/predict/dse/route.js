import { NextResponse } from "next/server";
import { dsePredictSchema } from "../../../../lib/validation";

export async function POST(request) {
  dsePredictSchema.parse(await request.json());
  return NextResponse.json(
    {
      results: [],
      message: "DSE API contract is ready, but DSE cutoff PDFs must be imported before predictions can be returned."
    },
    { status: 501 }
  );
}
