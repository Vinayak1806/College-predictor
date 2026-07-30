import { NextResponse } from "next/server";
import { json } from "../../../lib/http";
import { cutoffQuerySchema } from "../../../lib/validation";
import { getPublishedCutoffs } from "../../../lib/queries";
import { currentInstituteCodeSearch } from "../../../lib/instituteCodes";

const orderByOptions = {
  NEWEST: [{ dataset: { academicYear: "desc" } }, { dataset: { capRound: "desc" } }, { closingScore: "desc" }],
  CUTOFF_HIGH: [{ closingScore: "desc" }, { dataset: { academicYear: "desc" } }],
  CUTOFF_LOW: [{ closingScore: "asc" }, { dataset: { academicYear: "desc" } }],
  COLLEGE: [{ collegeBranch: { college: { name: "asc" } } }, { collegeBranch: { branch: { displayName: "asc" } } }]
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const validation = cutoffQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid cutoff filters.", fields: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const query = validation.data;
  const currentCodeQuery = currentInstituteCodeSearch(query.q);
  const result = await getPublishedCutoffs(
    {
      dataset: {
        status: { in: ["VERIFIED", "PUBLISHED"] },
        admissionRoute: query.route,
        academicYear: query.year,
        capRound: query.round
      },
      seatType: {
        category: query.category,
        code: query.seatType
      },
      collegeBranch: {
        branch: query.branch ? { displayName: { contains: query.branch, mode: "insensitive" } } : undefined,
        college: {
          profile: { is: { currentCap2025: "Yes" } },
          city: query.city ? { name: { equals: query.city, mode: "insensitive" } } : undefined,
          OR: query.q
            ? [
                { name: { contains: query.q, mode: "insensitive" } },
                { instituteCode: { contains: query.q, mode: "insensitive" } },
                ...(currentCodeQuery ? [{ instituteCode: currentCodeQuery }] : [])
              ]
            : undefined
        }
      }
    },
    query.page,
    query.pageSize,
    orderByOptions[query.sort]
  );
  return json({
    data: result.data,
    page: query.page,
    pageSize: query.pageSize,
    total: result.total,
    totalPages: Math.ceil(result.total / query.pageSize)
  });
}
