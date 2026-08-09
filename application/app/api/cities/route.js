import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";
import { currentCollegeWhere } from "../../../lib/publishedData";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const route = new URL(request.url).searchParams.get("route");
  const admissionRoute = ["FE", "DSE"].includes(route) ? route : undefined;
  const currentFilter = await currentCollegeWhere(prisma, admissionRoute);
  const cities = await prisma.city.findMany({
    where: { colleges: { some: currentFilter } },
    orderBy: { name: "asc" },
    take: 500
  });
  return json({ data: cities });
}
