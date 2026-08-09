import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const route = new URL(request.url).searchParams.get("route");
    const publishedDataset = {
      status: { in: ["VERIFIED", "PUBLISHED"] },
      predictionEnabled: true,
      admissionRoute: ["FE", "DSE"].includes(route) ? route : undefined
    };
    const [datasets, seatTypes, branches, cities, universities] = await Promise.all([
      prisma.cutoffDataset.findMany({
        where: publishedDataset,
        distinct: ["academicYear", "admissionRoute", "capRound"],
        select: { academicYear: true, admissionRoute: true, capRound: true },
        orderBy: [{ academicYear: "desc" }, { capRound: "asc" }]
      }),
      prisma.seatType.findMany({
        where: { cutoffs: { some: { needsReview: false, dataset: publishedDataset } } },
        select: { code: true, category: true },
        orderBy: { code: "asc" }
      }),
      prisma.branch.findMany({
        where: {
          collegeBranches: {
            some: {
              cutoffs: { some: { needsReview: false, dataset: publishedDataset } }
            }
          }
        },
        distinct: ["displayName"],
        select: { displayName: true },
        orderBy: { displayName: "asc" }
      }),
      prisma.city.findMany({
        where: {
          colleges: {
            some: {
              collegeBranches: {
                some: { cutoffs: { some: { needsReview: false, dataset: publishedDataset } } }
              }
            }
          }
        },
        distinct: ["name"],
        select: { name: true },
        orderBy: { name: "asc" }
      }),
      prisma.university.findMany({
        where: {
          colleges: {
            some: {
              collegeBranches: {
                some: { cutoffs: { some: { needsReview: false, dataset: publishedDataset } } }
              }
            }
          }
        },
        distinct: ["name"],
        select: { name: true },
        orderBy: { name: "asc" }
      })
    ]);

    return NextResponse.json({
      years: [...new Set(datasets.map((dataset) => dataset.academicYear))],
      routes: [...new Set(datasets.map((dataset) => dataset.admissionRoute))],
      rounds: [...new Set(datasets.map((dataset) => dataset.capRound))].sort((left, right) => left - right),
      categories: [...new Set(seatTypes.map((seatType) => seatType.category))].sort(),
      seatTypes: seatTypes.map((seatType) => seatType.code),
      branches: branches.map((branch) => branch.displayName),
      cities: cities.map((city) => city.name),
      universities: universities.map((university) => university.name)
    });
  } catch (error) {
    console.error("Cutoff options failed", error);
    return NextResponse.json({ error: "Cutoff filter options could not be loaded." }, { status: 500 });
  }
}
