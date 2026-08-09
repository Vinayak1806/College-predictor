import { reprocessAdminImport } from "../lib/adminImports.js";
import { prisma } from "../lib/prisma.js";

const importId = process.argv[2];

if (!/^\d+$/.test(importId || "")) {
  console.error("Usage: pnpm admin:reprocess -- <import-id>");
  process.exitCode = 1;
} else {
  try {
    const result = await reprocessAdminImport(importId);
    console.log(JSON.stringify({
      id: result.id.toString(),
      status: result.status,
      totalRecords: result.summary?.totalRecords || 0,
      publishableRecords: result.summary?.publishableRecords || 0,
      recordsNeedingReview: result.summary?.recordsNeedingReview || 0,
      issueCounts: result.summary?.issueCounts || {}
    }, null, 2));
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
