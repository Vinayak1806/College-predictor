import { prisma } from "./prisma";

export function pagination(page, pageSize) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize
  };
}

export function cutoffInclude() {
  return {
    dataset: true,
    seatType: true,
    collegeBranch: {
      include: {
        college: { include: { city: true, university: true } },
        branch: true
      }
    }
  };
}

export async function getPublishedCutoffs(where, page = 1, pageSize = 20) {
  return prisma.cutoff.findMany({
    where: {
      needsReview: false,
      dataset: { status: { in: ["VERIFIED", "PUBLISHED"] } },
      ...where
    },
    include: cutoffInclude(),
    orderBy: [{ dataset: { academicYear: "desc" } }, { dataset: { capRound: "desc" } }],
    ...pagination(page, pageSize)
  });
}
