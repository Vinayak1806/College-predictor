import { NextResponse } from "next/server";
import { json } from "../../../../../lib/http";
import { prisma } from "../../../../../lib/prisma";

export async function GET(request, { params }) {
  const { slug } = await params;
  const college = await prisma.college.findFirst({
    where: {
      slug,
      profile: { is: { currentCap2025: "Yes" } }
    },
    select: {
      collegeBranches: {
        select: { branch: true }
      }
    }
  });

  if (!college) {
    return NextResponse.json({ error: "College not found" }, { status: 404 });
  }

  const branches = [...new Map(
    college.collegeBranches.map(({ branch }) => [branch.branchCode, {
      branchCode: branch.branchCode,
      name: branch.displayName
    }])
  ).values()].sort((a, b) => a.name.localeCompare(b.name));

  return json({ data: branches });
}
