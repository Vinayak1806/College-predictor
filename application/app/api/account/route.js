import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireStudent } from "../../../lib/studentAuth";
import { createRequestId, logServerError, publicServerError } from "../../../lib/observability";

export async function DELETE(request) {
  const student = await requireStudent(request);
  if (!student) return NextResponse.json({ error: "Sign in to delete your account." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Type DELETE to confirm account deletion." }, { status: 400 });
  }

  if (body?.confirmation !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE exactly to confirm." }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id: student.userId } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const requestId = createRequestId();
    logServerError("account.delete", error, { requestId, userId: student.userId });
    return NextResponse.json(publicServerError("Your account could not be deleted.", requestId), { status: 500 });
  }
}
