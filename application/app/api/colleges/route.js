import { prisma } from "../../../lib/prisma";
import { json } from "../../../lib/http";
import { listQuerySchema } from "../../../lib/validation";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = listQuerySchema.parse(Object.fromEntries(searchParams));
  const colleges = await prisma.college.findMany({
    where: {
      name: query.q ? { contains: query.q, mode: "insensitive" } : undefined,
      city: query.city ? { name: { contains: query.city, mode: "insensitive" } } : undefined
    },
    include: { city: true, university: true },
    orderBy: { name: "asc" },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize
  });
  return json({ data: colleges, page: query.page, pageSize: query.pageSize });
}
