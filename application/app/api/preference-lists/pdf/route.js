import { NextResponse } from "next/server";
import { z } from "zod";
import { createPreferenceListPdf } from "../../../../lib/preferencePdf";
import { consumeRateLimit } from "../../../../lib/rateLimit";
import { createRequestId, logServerError, publicServerError } from "../../../../lib/observability";
import { requireStudent } from "../../../../lib/studentAuth";

const itemSchema = z.object({
  instituteCode: z.string().min(2).max(20),
  college: z.string().min(2).max(250),
  branch: z.string().min(2).max(180),
  cutoff: z.number().min(0).max(100).nullable().optional(),
  year: z.string().max(20).optional().default("")
}).strip();

const requestSchema = z.object({
  items: z.array(itemSchema).min(1).max(150)
}).strict();

export async function POST(request) {
  const student = await requireStudent(request);
  if (!student) {
    return NextResponse.json({ error: "Sign in to download your CAP preference list." }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit(`student:preference-pdf:${student.userId}`, {
    limit: 12,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "PDF download limit reached. Please try again later." },
      { status: 429, headers: { "retry-after": String(rateLimit.retryAfter) } }
    );
  }

  try {
    const validation = requestSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0]?.message || "Check the CAP list." }, { status: 400 });
    }

    const pdf = await createPreferenceListPdf(validation.data.items);
    return new NextResponse(pdf, {
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
