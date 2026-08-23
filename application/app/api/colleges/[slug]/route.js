import { NextResponse } from "next/server";
import { json } from "../../../../lib/http";
import { prisma } from "../../../../lib/prisma";
import { currentCollegeWhere } from "../../../../lib/publishedData";

export async function GET(request, { params }) {
  const { slug } = await params;
  const currentFilter = await currentCollegeWhere(prisma);
  const college = await prisma.college.findFirst({
    where: {
      slug,
      ...currentFilter
    },
    include: {
      city: true,
      university: true,
      profile: true,
      fees: { orderBy: { academicYear: "desc" }, take: 5 },
      rankings: {
        where: { verified: true },
        orderBy: [{ rankingYear: "desc" }, { rank: "asc" }]
      },
      collegeBranches: {
        include: {
          branch: true,
          cutoffs: {
            where: { needsReview: false, closingScore: { not: null } },
            include: { dataset: true, seatType: true },
            orderBy: [
              { dataset: { academicYear: "desc" } },
              { dataset: { capRound: "desc" } },
              { closingScore: "desc" }
            ],
            take: 1000
          }
        }
      }
    }
  });
  if (!college) return NextResponse.json({ error: "College not found" }, { status: 404 });
  return json(college);
}
