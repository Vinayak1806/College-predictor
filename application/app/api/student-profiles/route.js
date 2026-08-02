import { z } from "zod";
import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";
import { requireStudent } from "../../../lib/studentAuth";
import { studentProfileSchema } from "../../../lib/studentProfileValidation";

function unauthorized() {
  return json({ error: "Sign in to use saved student profiles." }, { status: 401 });
}

export async function GET(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const route = z.enum(["FE", "DSE"]).optional().safeParse(new URL(request.url).searchParams.get("route") || undefined);
  if (!route.success) return json({ error: "Admission route must be FE or DSE." }, { status: 400 });

  const profiles = await prisma.studentProfile.findMany({
    where: { userId: student.userId, ...(route.data ? { admissionRoute: route.data } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 25
  });
  return json({ data: profiles });
}

export async function POST(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const parsed = studentProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "The student profile is invalid.", details: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await prisma.studentProfile.upsert({
    where: {
      userId_admissionRoute_name: {
        userId: student.userId,
        admissionRoute: parsed.data.admissionRoute,
        name: parsed.data.name
      }
    },
    create: {
      userId: student.userId,
      name: parsed.data.name,
      admissionRoute: parsed.data.admissionRoute,
      formData: parsed.data.formData
    },
    update: { formData: parsed.data.formData }
  });
  return json({ data: profile }, { status: 201 });
}

export async function DELETE(request) {
  const student = await requireStudent(request);
  if (!student) return unauthorized();

  const id = z.coerce.bigint().positive().safeParse(new URL(request.url).searchParams.get("id"));
  if (!id.success) return json({ error: "Profile ID is required." }, { status: 400 });

  const removed = await prisma.studentProfile.deleteMany({
    where: { id: id.data, userId: student.userId }
  });
  if (!removed.count) return json({ error: "Student profile not found." }, { status: 404 });
  return json({ deleted: true });
}
