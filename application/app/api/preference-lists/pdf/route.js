import { NextResponse } from "next/server";
import { z } from "zod";
import { createPreferenceListPdf } from "../../../../lib/preferencePdf";
import { limitPublicRequest } from "../../../../lib/rateLimit";
import { createRequestId, logServerError, publicServerError } from "../../../../lib/observability";

const itemSchema = z.object({
  instituteCode: z.string().min(2).max(20),
  college: z.string().min(2).max(250),
  branchCode: z.string().min(2).max(30),
  branch: z.string().min(2).max(180),
  city: z.string().max(100).optional().default(""),
  zone: z.enum(["AMBITIOUS", "TARGET", "SAFE", "BACKUP"]),
  cutoff: z.number().min(0).max(100).nullable().optional(),
  seatType: z.string().max(30).optional().default(""),
  year: z.string().max(20).optional().default(""),
  round: z.number().int().min(1).max(4).nullable().optional()
}).strip();

const requestSchema = z.object({
  items: z.array(itemSchema).min(1).max(150)
}).strict();

export async function POST(request) {
  const limited = await limitPublicRequest(request, "export");
  if (limited) return limited;

  try {
    const validation = requestSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0]?.message || "Check the CAP list." }, { status: 400 });
    }

    const pdf = createPreferenceListPdf(validation.data.items);
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=cap-predictor-preference-list.pdf",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    const requestId = createRequestId();
    logServerError("preference-list.pdf", error, { requestId });
    return NextResponse.json(publicServerError("The PDF could not be created.", requestId), { status: 500 });
  }
}
