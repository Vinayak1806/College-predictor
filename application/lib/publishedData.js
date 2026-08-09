export function publishedDatasetWhere(admissionRoute, academicYear) {
  return {
    // Legacy verified datasets were approved before the admin publish workflow
    // existed. Both states are public; staged and review records are not.
    status: { in: ["VERIFIED", "PUBLISHED"] },
    predictionEnabled: true,
    admissionRoute: admissionRoute || undefined,
    academicYear: academicYear || undefined
  };
}

export function historicalDatasetWhere(admissionRoute, academicYear) {
  return {
    status: { in: ["VERIFIED", "PUBLISHED"] },
    historyEnabled: true,
    admissionRoute: admissionRoute || undefined,
    academicYear: academicYear || undefined
  };
}

export function publishedCutoffWhere(admissionRoute, academicYear) {
  return {
    needsReview: false,
    dataset: publishedDatasetWhere(admissionRoute, academicYear)
  };
}

export function activeCollegeWhere(admissionRoute, academicYear) {
  return {
    AND: [
      {
        routeArchives: {
          none: admissionRoute ? { admissionRoute } : {}
        }
      },
      {
        collegeBranches: {
          some: {
            cutoffs: {
              some: publishedCutoffWhere(admissionRoute, academicYear)
            }
          }
        }
      }
    ]
  };
}

export async function latestPublishedDataset(prisma, admissionRoute) {
  return prisma.cutoffDataset.findFirst({
    where: publishedDatasetWhere(admissionRoute),
    orderBy: [{ academicYear: "desc" }, { capRound: "desc" }, { id: "desc" }],
    select: { id: true, academicYear: true, capRound: true, admissionRoute: true }
  });
}

export async function predictionDataRevision(prisma, admissionRoute) {
  const [latestDataset, latestCollegeArchive] = await Promise.all([
    latestPublishedDataset(prisma, admissionRoute),
    prisma.collegeRouteArchive.aggregate({
      where: { admissionRoute },
      _max: { archivedAt: true }
    })
  ]);

  return [
    latestDataset?.id?.toString() || "none",
    latestCollegeArchive._max.archivedAt?.getTime() || 0
  ].join(":");
}

export async function currentCollegeWhere(prisma, admissionRoute) {
  if (admissionRoute) {
    const latest = await latestPublishedDataset(prisma, admissionRoute);
    return activeCollegeWhere(admissionRoute, latest?.academicYear);
  }

  const latestDatasets = await Promise.all([
    latestPublishedDataset(prisma, "FE"),
    latestPublishedDataset(prisma, "DSE")
  ]);
  const filters = latestDatasets
    .filter(Boolean)
    .map((dataset) => activeCollegeWhere(dataset.admissionRoute, dataset.academicYear));

  if (!filters.length) return activeCollegeWhere();
  if (filters.length === 1) return filters[0];
  return { OR: filters };
}
