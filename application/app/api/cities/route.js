import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const cities = await prisma.city.findMany({ orderBy: { name: "asc" }, take: 500 });
  return json({ data: cities });
}
