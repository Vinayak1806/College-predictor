import { z } from "zod";
import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";
import { requireStudent } from "../../../lib/studentAuth";

const itemSchema = z.object({
  collegeBranchId: z.coerce.string().min(1).max(80),
  id: z.string().trim().min(1).max(80),
  instituteCode: z.string().trim().min(1).max(10),
  collegeSlug: z.string().trim().min(1).max(300),
  college: z.string().trim().min(1).max(300),
  branchCode: z.string().trim().min(1).max(30),
  branch: z.string().trim().min(1).max(200),
  city: z.string().trim().max(100).optional().default(""),
  zone: z.enum(["AMBITIOUS", "TARGET", "SAFE", "BACKUP"]),
  order: z.number().int().min(1).max(200),
  cutoff: z.number().finite().nullable().optional().default(null),
  margin: z.number().finite().nullable().optional().default(null),
  seatType: z.string().trim().max(30).optional().default(""),
  year: z.string().trim().max(20).optional().default(""),
  round: z.number().int().min(1).max(10).nullable().optional().default(null),
  source: z.string().trim().max(30).optional().default("MANUAL"),
  addedAt: z.string().trim().max(40).optional().default("")
}).strict();

const listSchema = z.object({
  name: z.string().trim().min(1).max(80),
  items: z.array(itemSchema).max(200)
}).strict().superRefine((value, context) => {
  const choices = new Set();
  const positions = new Set();
  for (const item of value.items) {
    if (choices.has(item.collegeBranchId)) {
      context.addIssue({ code: "custom", message: "A college branch can appear only once." });
    }
    if (positions.has(item.order)) {
      context.addIssue({ code: "custom", message: "Every choice needs a unique order." });
    }
    choices.add(item.collegeBranchId);
    positions.add(item.order);
  }
});

function unauthorized() {
  return json({ error: "Sign in to save CAP preference lists." }, { status: 401 });
}

export async function GET(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const lists = await prisma.preferenceList.findMany({
    where: { userId: student.userId },
    orderBy: { updatedAt: "desc" },
    take: 50
  });
  return json({ data: lists });
}

export async function POST(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const parsed = listSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "The CAP list is invalid.", details: parsed.error.flatten() }, { status: 400 });
  }

  const list = await prisma.preferenceList.create({
    data: { userId: student.userId, name: parsed.data.name, items: parsed.data.items }
  });
  return json(list, { status: 201 });
}

export async function PUT(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const parsed = listSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "The CAP list is invalid.", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.preferenceList.findFirst({
    where: { userId: student.userId, name: parsed.data.name },
    select: { id: true }
  });
  const list = existing
    ? await prisma.preferenceList.update({
        where: { id: existing.id },
        data: { items: parsed.data.items }
      })
    : await prisma.preferenceList.create({
        data: { userId: student.userId, name: parsed.data.name, items: parsed.data.items }
      });

  return json({ data: list }, { status: existing ? 200 : 201 });
}

export async function PATCH(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const body = await request.json().catch(() => null);
  const id = z.coerce.bigint().positive().safeParse(body?.id);
  const list = listSchema.safeParse(body?.list);
  if (!id.success || !list.success) {
    return json({ error: "The CAP list update is invalid." }, { status: 400 });
  }

  const updated = await prisma.preferenceList.updateMany({
    where: { id: id.data, userId: student.userId },
    data: { name: list.data.name, items: list.data.items }
  });
  if (!updated.count) return json({ error: "CAP list not found." }, { status: 404 });
  return json({ updated: true });
}

export async function DELETE(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const id = z.coerce.bigint().positive().safeParse(new URL(request.url).searchParams.get("id"));
  if (!id.success) return json({ error: "CAP list ID is required." }, { status: 400 });

  const removed = await prisma.preferenceList.deleteMany({
    where: { id: id.data, userId: student.userId }
  });
  if (!removed.count) return json({ error: "CAP list not found." }, { status: 404 });
  return json({ deleted: true });
}
