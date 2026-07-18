import { json } from "../../../lib/http";
import { listQuerySchema } from "../../../lib/validation";
import { getPublishedCutoffs } from "../../../lib/queries";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = listQuerySchema.parse(Object.fromEntries(searchParams));
  const cutoffs = await getPublishedCutoffs(
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
        college: query.city ? { city: { name: { contains: query.city, mode: "insensitive" } } } : undefined
      }
    },
    query.page,
    query.pageSize
  );
  return json({ data: cutoffs, page: query.page, pageSize: query.pageSize });
}
