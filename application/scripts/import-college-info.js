import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { currentInstituteCode } from "../lib/instituteCodes.js";

const prisma = new PrismaClient();
const dataDir = path.resolve(process.cwd(), "..", "data", "processed", "college_info");

async function readJson(filename) {
  const filePath = path.join(dataDir, filename);
  const text = await fs.readFile(filePath, "utf-8");
  return JSON.parse(text);
}

function keepKnownProfiles(rows, knownCollegeCodes) {
  const profilesByCode = new Map();

  for (const row of rows) {
    const instituteCode = currentInstituteCode(row.instituteCode);
    if (!instituteCode || !knownCollegeCodes.has(instituteCode)) continue;

    const candidate = { ...row, instituteCode };
    const existing = profilesByCode.get(instituteCode);
    if (!existing || candidate.currentCap2025 === "Yes") {
      profilesByCode.set(instituteCode, candidate);
    }
  }

  return [...profilesByCode.values()];
}

function prepareFees(rows, knownCollegeCodes) {
  return rows.map((row) => {
    const instituteCode = currentInstituteCode(row.instituteCode);
    return {
      ...row,
      instituteCode: instituteCode && knownCollegeCodes.has(instituteCode) ? instituteCode : null
    };
  });
}

async function main() {
  const [profiles, fees, colleges] = await Promise.all([
    readJson("college_profiles.json"),
    readJson("college_fees.json"),
    prisma.college.findMany({ select: { instituteCode: true } })
  ]);

  const knownCollegeCodes = new Set(colleges.map((college) => college.instituteCode));
  const profileRows = keepKnownProfiles(profiles, knownCollegeCodes);
  const feeRows = prepareFees(fees, knownCollegeCodes);

  await prisma.collegeProfile.deleteMany();
  await prisma.collegeFee.deleteMany();

  if (profileRows.length) {
    await prisma.collegeProfile.createMany({ data: profileRows });
  }

  if (feeRows.length) {
    await prisma.collegeFee.createMany({ data: feeRows, skipDuplicates: true });
  }

  console.log({
    sourceProfiles: profiles.length,
    importedProfiles: profileRows.length,
    sourceFees: fees.length,
    importedFees: feeRows.length,
    matchedFeeRows: feeRows.filter((row) => row.instituteCode).length
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
