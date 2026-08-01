import { z } from "zod";
import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";
import { requireStudent } from "../../../lib/studentAuth";

const createSchema = z.object({
  collegeBranchId: z.coerce.bigint().positive()
}).strict();

function unauthorized() {
  return json({ error: "Sign in to use saved colleges." }, { status: 401 });
}

export async function GET(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const items = await prisma.shortlist.findMany({
    where: { userId: student.userId },
    include: {
      collegeBranch: { include: { college: { include: { city: true } }, branch: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return json({ data: items });
}

export async function POST(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "Choose a valid college branch." }, { status: 400 });
  }

  const collegeBranch = await prisma.collegeBranch.findUnique({
    where: { id: parsed.data.collegeBranchId },
    select: { id: true }
  });
  if (!collegeBranch) return json({ error: "College branch not found." }, { status: 404 });

  const item = await prisma.shortlist.upsert({
    where: {
      userId_collegeBranchId: {
        userId: student.userId,
        collegeBranchId: parsed.data.collegeBranchId
      }
    },
    create: {
      userId: student.userId,
      collegeBranchId: parsed.data.collegeBranchId
    },
    update: {}
  });
  return json(item, { status: 201 });
}

export async function DELETE(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const parsed = z.coerce.bigint().positive().safeParse(new URL(request.url).searchParams.get("id"));
  if (!parsed.success) return json({ error: "Saved college ID is required." }, { status: 400 });

  const removed = await prisma.shortlist.deleteMany({
    where: { id: parsed.data, userId: student.userId }
  });
  if (!removed.count) return json({ error: "Saved college not found." }, { status: 404 });
  return json({ deleted: true });
}
