import { toNextJsHandler } from "better-auth/next-js";
import { auth, studentAuthConfigured } from "../../../../lib/auth";

const handler = toNextJsHandler(auth);

function unavailable() {
  return Response.json(
    { error: "Student login is not configured yet." },
    { status: 503 }
  );
}

export function GET(request) {
  if (!studentAuthConfigured) return unavailable();
  return handler.GET(request);
}

export function POST(request) {
  if (!studentAuthConfigured) return unavailable();
  return handler.POST(request);
}
