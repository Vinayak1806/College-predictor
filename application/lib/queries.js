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

export async function getPublishedCutoffs(where, page = 1, pageSize = 20, orderBy) {
  const query = {
    where: {
      needsReview: false,
      dataset: {
        status: { in: ["VERIFIED", "PUBLISHED"] },
        predictionEnabled: true
      },
      ...where
    },
    include: cutoffInclude(),
    orderBy: orderBy || [{ dataset: { academicYear: "desc" } }, { dataset: { capRound: "desc" } }],
    ...pagination(page, pageSize)
  };

  const [data, total] = await Promise.all([
    prisma.cutoff.findMany(query),
    prisma.cutoff.count({ where: query.where })
  ]);
  return { data, total };
}
