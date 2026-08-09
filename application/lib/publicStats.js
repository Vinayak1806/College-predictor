import { prisma } from "./prisma";
import { activeCollegeWhere, latestPublishedDataset } from "./publishedData";

export async function getPublicStats() {
  const [latestFeDataset, latestDseDataset] = await Promise.all([
    latestPublishedDataset(prisma, "FE"),
    latestPublishedDataset(prisma, "DSE")
  ]);
  const currentFeFilter = latestFeDataset
    ? activeCollegeWhere("FE", latestFeDataset.academicYear)
    : activeCollegeWhere("FE");
  const currentDseFilter = latestDseDataset
    ? activeCollegeWhere("DSE", latestDseDataset.academicYear)
    : activeCollegeWhere("DSE");
  const currentFilter = { OR: [currentFeFilter, currentDseFilter] };
  const [currentInstitutes, currentFeInstitutes, currentDseInstitutes, verifiedCutoffs, exactSeatTypes, cityRows, coverageDatasets] = await Promise.all([
    prisma.college.count({ where: currentFilter }),
    prisma.college.count({ where: currentFeFilter }),
    prisma.college.count({ where: currentDseFilter }),
    prisma.cutoff.count({
      where: {
        needsReview: false,
        dataset: {
          admissionRoute: "FE",
          status: { in: ["VERIFIED", "PUBLISHED"] },
          predictionEnabled: true
        }
      }
    }),
    prisma.seatType.count({
      where: {
        cutoffs: {
          some: {
            needsReview: false,
            dataset: {
              status: { in: ["VERIFIED", "PUBLISHED"] },
              predictionEnabled: true
            }
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
        status: { in: ["VERIFIED", "PUBLISHED"] },
        predictionEnabled: true
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
    currentFeInstitutes,
    currentDseInstitutes,
    verifiedCutoffs,
    districtsCovered: cityRows.length,
    exactSeatTypes,
    cutoffCoverage: [...coverageByYear.values()].sort((a, b) => a.academicYear.localeCompare(b.academicYear))
  };
}
