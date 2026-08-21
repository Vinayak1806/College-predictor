import { NextResponse } from "next/server";
import { buildCollegeCatalog } from "../../lib/aiDiscovery";
import { prisma } from "../../lib/prisma";
import { currentCollegeWhere } from "../../lib/publishedData";
import { getSiteUrl } from "../../lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const currentFilter = await currentCollegeWhere(prisma);
  const colleges = await prisma.college.findMany({
    where: currentFilter,
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

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
