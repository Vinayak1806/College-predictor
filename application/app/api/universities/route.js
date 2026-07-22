import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const universities = await prisma.university.findMany({ orderBy: { name: "asc" } });
  return json({ data: universities });
}
