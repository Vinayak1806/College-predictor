import { NextResponse } from "next/server";
import { json } from "../../../../lib/http";
import { prisma } from "../../../../lib/prisma";

export async function GET(request, { params }) {
  const { slug } = await params;
  const college = await prisma.college.findFirst({
    where: {
      slug,
      profile: { is: { currentCap2025: "Yes" } }
    },
    include: {
      city: true,
      university: true,
      collegeBranches: {
        include: {
          branch: true,
          cutoffs: { include: { dataset: true, seatType: true }, take: 100 }
        }
      }
    }
  });
  if (!college) return NextResponse.json({ error: "College not found" }, { status: 404 });
  return json(college);
}
