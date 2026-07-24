import { prisma } from "./prisma";

export async function getPublicStats() {
  const currentFilter = { profile: { is: { currentCap2025: "Yes" } } };
  const [currentInstitutes, verifiedCutoffs, exactSeatTypes, cityRows] = await Promise.all([
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
    })
  ]);

  return {
    currentInstitutes,
    verifiedCutoffs,
    districtsCovered: cityRows.length,
    exactSeatTypes
  };
}
