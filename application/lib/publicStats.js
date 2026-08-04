import { prisma } from "./prisma";

export async function getPublicStats() {
  const currentFilter = { profile: { is: { currentCap2025: "Yes" } } };
  const [currentInstitutes, verifiedCutoffs, exactSeatTypes, cityRows, coverageDatasets] = await Promise.all([
    prisma.college.count({ where: currentFilter }),
    prisma.cutoff.count({
      where: {
        needsReview: false,
        dataset: {
          admissionRoute: "FE",
          status: { in: ["VERIFIED", "PUBLISHED"] }
        }
      }
    }),
    prisma.seatType.count({
      where: {
        cutoffs: {
          some: {
            needsReview: false,
            dataset: { status: { in: ["VERIFIED", "PUBLISHED"] } }
          }
        }
      }
    }),
    prisma.college.findMany({
      where: {
        ...currentFilter,
        cityId: { not: null }
      },
      distinct: ["cityId"],
      select: { cityId: true }
    }),
    prisma.cutoffDataset.findMany({
      where: {
        admissionRoute: { in: ["FE", "DSE"] },
        status: { in: ["VERIFIED", "PUBLISHED"] }
      },
      select: {
        academicYear: true,
        admissionRoute: true,
        _count: {
          select: {
            cutoffs: { where: { needsReview: false } }
          }
        }
      }
    })
  ]);

  const coverageByYear = new Map();
  for (const dataset of coverageDatasets) {
    const row = coverageByYear.get(dataset.academicYear) || {
      academicYear: dataset.academicYear,
      FE: 0,
      DSE: 0
    };
    row[dataset.admissionRoute] += dataset._count.cutoffs;
    coverageByYear.set(dataset.academicYear, row);
  }

  return {
    currentInstitutes,
    verifiedCutoffs,
    districtsCovered: cityRows.length,
    exactSeatTypes,
    cutoffCoverage: [...coverageByYear.values()].sort((a, b) => a.academicYear.localeCompare(b.academicYear))
  };
}
