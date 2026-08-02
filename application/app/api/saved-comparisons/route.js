import { z } from "zod";
import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";
import { requireStudent } from "../../../lib/studentAuth";

const comparisonSchema = z.object({
  name: z.string().trim().min(1).max(80),
  items: z.array(z.object({
    instituteCode: z.string().trim().min(1).max(10),
    college: z.string().trim().min(1).max(300),
    collegeSlug: z.string().trim().min(1).max(300),
    branchCode: z.string().trim().max(30),
    branch: z.string().trim().max(200),
    admissionRoute: z.enum(["FE", "DSE"]),
    prediction: z.record(z.unknown()).nullable().optional().default(null)
  }).strict()).min(2).max(3)
}).strict();

function unauthorized() {
  return json({ error: "Sign in to save comparisons." }, { status: 401 });
}

export async function GET(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const comparisons = await prisma.savedComparison.findMany({
    where: { userId: student.userId },
    orderBy: { updatedAt: "desc" },
    take: 50
  });
  return json({ data: comparisons });
}

export async function POST(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const parsed = comparisonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "The comparison is invalid.", details: parsed.error.flatten() }, { status: 400 });
  }

  const comparison = await prisma.savedComparison.create({
    data: { userId: student.userId, name: parsed.data.name, items: parsed.data.items }
  });
  return json(comparison, { status: 201 });
}

export async function PUT(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const parsed = comparisonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "The comparison is invalid.", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.savedComparison.findFirst({
    where: { userId: student.userId, name: parsed.data.name },
    select: { id: true }
  });
  const comparison = existing
    ? await prisma.savedComparison.update({
        where: { id: existing.id },
        data: { items: parsed.data.items }
      })
    : await prisma.savedComparison.create({
        data: { userId: student.userId, name: parsed.data.name, items: parsed.data.items }
      });

  return json({ data: comparison }, { status: existing ? 200 : 201 });
}

export async function DELETE(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const id = z.coerce.bigint().positive().safeParse(new URL(request.url).searchParams.get("id"));
  if (!id.success) return json({ error: "Comparison ID is required." }, { status: 400 });

  const removed = await prisma.savedComparison.deleteMany({
    where: { id: id.data, userId: student.userId }
  });
  if (!removed.count) return json({ error: "Comparison not found." }, { status: 404 });
  return json({ deleted: true });
}
