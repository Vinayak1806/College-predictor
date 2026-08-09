import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";
import { listQuerySchema } from "../../../lib/validation";
import { currentCollegeWhere } from "../../../lib/publishedData";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = listQuerySchema.parse(Object.fromEntries(searchParams));
  const currentFilter = await currentCollegeWhere(prisma, query.route);
  const branches = await prisma.branch.findMany({
    where: {
      displayName: query.q ? { contains: query.q, mode: "insensitive" } : undefined,
      collegeBranches: { some: { college: currentFilter } }
    },
    orderBy: { displayName: "asc" },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize
  });
  return json({ data: branches, page: query.page, pageSize: query.pageSize });
}
