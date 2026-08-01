import { auth, studentAuthConfigured } from "./auth";

export async function getStudentSession(headers) {
  if (!studentAuthConfigured) return null;

  try {
    return await auth.api.getSession({ headers });
  } catch {
    return null;
  }
}

export async function requireStudent(request) {
  const session = await getStudentSession(request.headers);
  if (!session?.user?.id) return null;

  const userId = Number(session.user.id);
  if (!Number.isSafeInteger(userId) || userId < 1) return null;

  return { session, userId };
}
