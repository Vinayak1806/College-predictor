import { prisma } from "../../../lib/prisma";
import { json } from "../../../lib/http";
import { listQuerySchema } from "../../../lib/validation";
import { currentInstituteCodeSearch } from "../../../lib/instituteCodes";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = listQuerySchema.parse(Object.fromEntries(searchParams));
  const currentCodeQuery = currentInstituteCodeSearch(query.q);
  const routeFilter = query.route
    ? {
      collegeBranches: {
        some: {
          cutoffs: {
            some: {
              needsReview: false,
              dataset: {
                admissionRoute: query.route,
                status: { in: ["VERIFIED", "PUBLISHED"] }
              }
            }
          }
        }
      }
    }
    : {};
  const collegeRecords = await prisma.college.findMany({
    where: {
      profile: { is: { currentCap2025: "Yes" } },
      ...routeFilter,
      OR: query.q
        ? [
            { name: { contains: query.q, mode: "insensitive" } },
            { instituteCode: { contains: query.q, mode: "insensitive" } },
            { city: { name: { contains: query.q, mode: "insensitive" } } },
            ...(currentCodeQuery ? [{ instituteCode: currentCodeQuery }] : [])
          ]
        : undefined,
      city: query.city ? { name: { contains: query.city, mode: "insensitive" } } : undefined
    },
    include: { city: true, university: true },
    orderBy: { name: "asc" },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize * 3
  });

  const seenCodes = new Set();
  const colleges = collegeRecords.filter((college) => {
    const normalizedCode = String(college.instituteCode || "").replace(/^0+/, "");
    const key = normalizedCode || `${college.name.toLowerCase()}|${college.city?.name?.toLowerCase() || ""}`;
    if (seenCodes.has(key)) return false;
    seenCodes.add(key);
    return true;
  }).slice(0, query.pageSize);

  return json({ data: colleges, page: query.page, pageSize: query.pageSize });
}
