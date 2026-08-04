import { buildCollegeCatalog } from "../../lib/aiDiscovery";
import { prisma } from "../../lib/prisma";
import { getSiteUrl } from "../../lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const colleges = await prisma.college.findMany({
    where: { profile: { is: { currentCap2025: "Yes" } } },
    select: {
      instituteCode: true,
      name: true,
      slug: true,
      officialWebsite: true,
      city: { select: { name: true } },
      university: { select: { name: true } },
      rankings: {
        where: { verified: true },
        select: {
          rankingSystem: true,
          rankingYear: true,
          category: true,
          rank: true,
          band: true,
          sourceUrl: true
        },
        orderBy: [{ rankingYear: "desc" }, { rank: "asc" }],
        take: 1
      }
    },
    orderBy: { instituteCode: "asc" }
  });
  const content = buildCollegeCatalog({ siteUrl: getSiteUrl(), colleges });

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800"
    }
  });
}
