const DEFAULT_BATCH_SIZE = 4000;
const DEFAULT_MAX_ROWS = 30000;

export class CutoffQueryTooLargeError extends Error {
  constructor(maxRows) {
    super(`The cutoff query matched more than ${maxRows.toLocaleString("en-IN")} records.`);
    this.name = "CutoffQueryTooLargeError";
    this.maxRows = maxRows;
  }
}

export async function findCutoffsInBatches({
  where,
  include,
  batchSize = DEFAULT_BATCH_SIZE,
  maxRows = DEFAULT_MAX_ROWS
}) {
  const rows = [];
  let cursor;

  while (rows.length < maxRows) {
    const batch = await prismaFindMany(where, include, batchSize, cursor);
    rows.push(...batch);

    if (batch.length < batchSize) return rows;
    cursor = batch[batch.length - 1].id;
  }

  const hasMore = await prismaHasMore(where, cursor);
  if (hasMore) throw new CutoffQueryTooLargeError(maxRows);
  return rows;
}

// Kept behind small functions so tests can replace the Prisma client without
// changing prediction logic.
async function prismaFindMany(where, include, take, cursor) {
  const { prisma } = await import("./prisma.js");
  return prisma.cutoff.findMany({
    where,
    include,
    orderBy: { id: "asc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });
}

async function prismaHasMore(where, cursor) {
  const { prisma } = await import("./prisma.js");
  return Boolean(await prisma.cutoff.findFirst({
    where: { AND: [where, { id: { gt: cursor } }] },
    select: { id: true },
    orderBy: { id: "asc" }
  }));
}
