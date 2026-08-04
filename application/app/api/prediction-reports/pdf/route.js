import { NextResponse } from "next/server";
import { z } from "zod";
import { createPredictionReportPdf } from "../../../../lib/predictionReportPdf";
import { consumeRateLimit } from "../../../../lib/rateLimit";
import { requireStudent } from "../../../../lib/studentAuth";

const resultSchema = z.object({
  instituteCode: z.string().trim().max(20),
  college: z.string().trim().max(250),
  branch: z.string().trim().max(180),
  zone: z.string().trim().max(30),
  latestCutoff: z.number().min(0).max(100).nullable().optional(),
  margin: z.number().min(-100).max(100).nullable().optional(),
  year: z.string().trim().max(20).optional(),
  round: z.number().int().min(1).max(10).nullable().optional()
}).strip();

const requestSchema = z.object({
  route: z.enum(["FE", "DSE"]),
  profile: z.record(z.union([z.string().max(250), z.number(), z.boolean(), z.null()])),
  totalResults: z.number().int().min(0).max(100000),
  results: z.array(resultSchema).min(1).max(30)
}).strict();

export async function POST(request) {
  const student = await requireStudent(request);
  if (!student) return NextResponse.json({ error: "Sign in to download a personalized prediction report." }, { status: 401 });

  const limited = await consumeRateLimit(`student:prediction-report:${student.userId}`, { limit: 12, windowMs: 60 * 60 * 1000 });
  if (!limited.allowed) return NextResponse.json({ error: "Report download limit reached. Please try again later." }, { status: 429 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The prediction report data is invalid." }, { status: 400 });

  const pdf = await createPredictionReportPdf({
    ...parsed.data,
    studentName: student.session.user.name,
    studentEmail: student.session.user.email
  });
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=cap-predictor-${parsed.data.route.toLowerCase()}-prediction.pdf`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
