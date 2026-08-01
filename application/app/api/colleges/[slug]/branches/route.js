import { NextResponse } from "next/server";
import { json } from "../../../../../lib/http";
import { prisma } from "../../../../../lib/prisma";

export async function GET(request, { params }) {
  const { slug } = await params;
  const routeValue = new URL(request.url).searchParams.get("route") || "FE";
  if (!["FE", "DSE"].includes(routeValue)) {
    return NextResponse.json({ error: "Admission route must be FE or DSE." }, { status: 400 });
  }

  const college = await prisma.college.findFirst({
    where: {
      slug,
      profile: { is: { currentCap2025: "Yes" } }
    },
    select: {
      instituteCode: true,
      collegeBranches: {
        select: {
          branch: true,
          cutoffs: {
            where: {
              needsReview: false,
              dataset: {
                admissionRoute: routeValue,
                status: { in: ["VERIFIED", "PUBLISHED"] }
              }
            },
            select: { id: true },
            take: 1
          }
        }
      }
    }
  });

  if (!college) {
    return NextResponse.json({ error: "College not found" }, { status: 404 });
  }

  const matrixBranches = await prisma.seatMatrix.findMany({
    where: {
      admissionRoute: routeValue,
      instituteCode: college.instituteCode,
      needsReview: false
    },
    select: { branchCode: true }
  });
  const matrixBranchCodes = new Set(matrixBranches.map((branch) => branch.branchCode));

  const branches = [...new Map(
    college.collegeBranches
      .filter(({ branch, cutoffs }) => cutoffs.length || matrixBranchCodes.has(branch.branchCode))
      .map(({ branch }) => [branch.branchCode, {
      branchCode: branch.branchCode,
      name: branch.displayName
    }])
  ).values()].sort((a, b) => a.name.localeCompare(b.name));

  return json({ data: branches });
}
