import { z } from "zod";
import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";
import { requireStudent } from "../../../lib/studentAuth";
import { predictionHistorySchema } from "../../../lib/studentProfileValidation";

function unauthorized() {
  return json({ error: "Sign in to use prediction history." }, { status: 401 });
}

export async function GET(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const route = z.enum(["FE", "DSE"]).optional().safeParse(new URL(request.url).searchParams.get("route") || undefined);
  if (!route.success) return json({ error: "Admission route must be FE or DSE." }, { status: 400 });

  const history = await prisma.predictionHistory.findMany({
    where: { userId: student.userId, ...(route.data ? { admissionRoute: route.data } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  return json({ data: history });
}

export async function POST(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const parsed = predictionHistorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "The prediction history entry is invalid." }, { status: 400 });
  }

  const entry = await prisma.$transaction(async (database) => {
    const created = await database.predictionHistory.create({
      data: {
        userId: student.userId,
        admissionRoute: parsed.data.admissionRoute,
        formData: parsed.data.formData,
        resultCount: parsed.data.resultCount,
        zoneCounts: parsed.data.zoneCounts
      }
    });
    const olderEntries = await database.predictionHistory.findMany({
      where: { userId: student.userId },
      orderBy: { createdAt: "desc" },
      skip: 50,
      select: { id: true }
    });
    if (olderEntries.length) {
      await database.predictionHistory.deleteMany({
        where: { id: { in: olderEntries.map((item) => item.id) }, userId: student.userId }
      });
    }
    return created;
  });
  return json({ data: entry }, { status: 201 });
}

export async function DELETE(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const id = z.coerce.bigint().positive().safeParse(new URL(request.url).searchParams.get("id"));
  if (!id.success) return json({ error: "History ID is required." }, { status: 400 });

  const removed = await prisma.predictionHistory.deleteMany({
    where: { id: id.data, userId: student.userId }
  });
  if (!removed.count) return json({ error: "Prediction history entry not found." }, { status: 404 });
  return json({ deleted: true });
}
