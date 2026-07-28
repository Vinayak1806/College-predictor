import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const reportPath = path.resolve(
  process.cwd(),
  "..",
  "data",
  "validated",
  "seat_matrix_2025_fixes.json"
);

async function main() {
  const applyChanges = process.argv.includes("--apply");
  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  const currentCodes = new Set((await prisma.college.findMany({
    where: { profile: { is: { currentCap2025: "Yes" } } },
    select: { instituteCode: true }
  })).map((college) => college.instituteCode));
  const invalidRecords = report.records.filter((record) => !currentCodes.has(record.instituteCode));

  if (invalidRecords.length) {
    throw new Error(`Refusing import: ${invalidRecords.length} records do not match a current institute code.`);
  }

  const existing = await prisma.seatMatrix.count({
    where: {
      academicYear: "2025-26",
      branchCode: { in: report.records.map((record) => record.branchCode) }
    }
  });

  console.log(JSON.stringify({
    mode: applyChanges ? "APPLY" : "DRY_RUN",
    records: report.records.length,
    colleges: new Set(report.records.map((record) => record.instituteCode)).size,
    existingRecordsToUpdate: existing,
    sourceSummary: report.summary
  }, null, 2));

  if (!applyChanges) return;

  for (const { coverage: _coverage, ...record } of report.records) {
    await prisma.seatMatrix.upsert({
      where: {
        academicYear_admissionRoute_branchCode: {
          academicYear: record.academicYear,
          admissionRoute: record.admissionRoute,
          branchCode: record.branchCode
        }
      },
      create: record,
      update: record
    });
  }

  console.log(`Applied ${report.records.length} verified seat-matrix records.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
