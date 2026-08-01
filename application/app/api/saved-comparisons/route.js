import { z } from "zod";
import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";
import { requireStudent } from "../../../lib/studentAuth";

const comparisonSchema = z.object({
  name: z.string().trim().min(1).max(80),
  items: z.array(z.object({
    instituteCode: z.string().trim().min(1).max(10),
    branchCode: z.string().trim().min(1).max(30),
    admissionRoute: z.enum(["FE", "DSE"])
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
