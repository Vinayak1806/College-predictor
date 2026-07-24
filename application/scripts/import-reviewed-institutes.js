import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const projectDataDir = path.resolve(process.cwd(), "..", "data");
const reviewedPath = path.join(
  projectDataDir,
  "validated",
  "reviewed_cutoffs",
  "reviewed_missing_institutes.json"
);
const profilePath = path.join(
  projectDataDir,
  "processed",
  "college_info",
  "college_profiles.json"
);
const feePath = path.join(
  projectDataDir,
  "processed",
  "college_info",
  "college_fees.json"
);
const CITY_OVERRIDES = {
  "16361": { name: "Pune", region: "Pune" }
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function ensureCity(profile) {
  const override = CITY_OVERRIDES[profile.instituteCode];
  const name = override?.name || profile.districtCity;
  const region = override?.region || profile.region || null;
  if (!name) return null;

  const existing = await prisma.city.findFirst({
    where: { name, district: name }
  });
  if (existing) return existing;

  return prisma.city.create({
    data: { name, district: name, region }
  });
}

async function ensureDataset(record) {
  const existing = await prisma.cutoffDataset.findFirst({
    where: {
      academicYear: record.academic_year,
      admissionRoute: record.admission_route,
      capRound: Number(record.cap_round),
      quota: record.quota,
      sourceFilename: record.source_file
    }
  });
  if (existing) return existing;

  return prisma.cutoffDataset.create({
    data: {
      academicYear: record.academic_year,
      admissionRoute: record.admission_route,
      capRound: Number(record.cap_round),
      quota: record.quota,
      sourceFilename: record.source_file,
      status: "VERIFIED"
    }
  });
}

async function importCollege({ profile, records, fees }) {
  const latestRecord = [...records].sort((a, b) =>
    b.academic_year.localeCompare(a.academic_year) ||
    Number(b.cap_round) - Number(a.cap_round)
  )[0];
  const city = await ensureCity(profile);
  const statusText = latestRecord.college_status || profile.autonomyStatus || "";
  const college = await prisma.college.upsert({
    where: { instituteCode: profile.instituteCode },
    create: {
      instituteCode: profile.instituteCode,
      name: profile.instituteName,
      slug: slugify(`${profile.instituteCode}-${profile.instituteName}`),
      cityId: city?.id || null,
      collegeType: latestRecord.college_status || profile.ownershipType || null,
      autonomous: /autonomous/i.test(statusText) && !/non-autonomous/i.test(statusText),
      minorityType: profile.minorityStatus || null,
      officialWebsite: profile.officialWebsite || null
    },
    update: {
      name: profile.instituteName,
      cityId: city?.id || null,
      collegeType: latestRecord.college_status || profile.ownershipType || null,
      autonomous: /autonomous/i.test(statusText) && !/non-autonomous/i.test(statusText),
      minorityType: profile.minorityStatus || null
    }
  });

  await prisma.collegeProfile.upsert({
    where: { instituteCode: profile.instituteCode },
    create: profile,
    update: profile
  });

  for (const fee of fees) {
    await prisma.collegeFee.upsert({
      where: {
        academicYear_fraInstituteId: {
          academicYear: fee.academicYear,
          fraInstituteId: fee.fraInstituteId
        }
      },
      create: fee,
      update: fee
    });
  }

  for (const record of records) {
    const branch = await prisma.branch.upsert({
      where: { branchCode: record.branch_code },
      create: {
        branchCode: record.branch_code,
        officialName: record.branch_name,
        displayName: record.branch_name
      },
      update: {
        officialName: record.branch_name,
        displayName: record.branch_name
      }
    });
    const collegeBranch = await prisma.collegeBranch.upsert({
      where: {
        collegeId_branchId_academicYear: {
          collegeId: college.id,
          branchId: branch.id,
          academicYear: record.academic_year
        }
      },
      create: {
        collegeId: college.id,
        branchId: branch.id,
        academicYear: record.academic_year
      },
      update: {}
    });
    const seatType = await prisma.seatType.upsert({
      where: { code: record.seat_type },
      create: {
        code: record.seat_type,
        category: record.category,
        gender: record.gender,
        universityType: record.university_type,
        specialType: record.seat_type === "MI" ? "MINORITY" : null
      },
      update: {}
    });
    const dataset = await ensureDataset(record);
    const key = {
      datasetId: dataset.id,
      collegeBranchId: collegeBranch.id,
      seatTypeId: seatType.id,
      stage: record.stage,
      section: record.section || "STANDARD"
    };
    const data = {
      ...key,
      openingRank: toNumber(record.opening_rank),
      closingRank: toNumber(record.closing_rank),
      openingScore: record.opening_score || null,
      closingScore: record.closing_score || null,
      sourcePage: Number(record.source_page),
      verified: true,
      needsReview: false,
      reviewReason: null
    };

    await prisma.cutoff.upsert({
      where: {
        datasetId_collegeBranchId_seatTypeId_stage_section: key
      },
      create: data,
      update: data
    });
  }
}

async function main() {
  const applyChanges = process.argv.includes("--apply");
  const [records, profiles, fees] = await Promise.all([
    readJson(reviewedPath),
    readJson(profilePath),
    readJson(feePath)
  ]);
  const targetCodes = [...new Set(records.map((record) => record.institute_code))].sort();
  const targetProfiles = profiles.filter((profile) => targetCodes.includes(profile.instituteCode));
  const targetFees = fees.filter((fee) => targetCodes.includes(fee.instituteCode));
  const summary = {
    apply: applyChanges,
    institutes: targetCodes.length,
    profiles: targetProfiles.length,
    cutoffRecords: records.length,
    branches: new Set(records.map((record) => record.branch_code)).size,
    feeRecords: targetFees.length
  };

  if (targetProfiles.length !== targetCodes.length) {
    throw new Error("A reviewed institute is missing its canonical college profile.");
  }

  if (applyChanges) {
    for (const profile of targetProfiles) {
      await importCollege({
        profile,
        records: records.filter((record) => record.institute_code === profile.instituteCode),
        fees: targetFees.filter((fee) => fee.instituteCode === profile.instituteCode)
      });
    }
  }

  console.log(summary);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
