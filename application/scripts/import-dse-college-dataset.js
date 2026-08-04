import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const applyChanges = process.argv.includes("--apply");
const dataDir = path.resolve(process.cwd(), "..", "data", "processed", "dse_college_info");

async function readJson(filename) {
  return JSON.parse(await fs.readFile(path.join(dataDir, filename), "utf8"));
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function fillMissing(existing, incoming) {
  return hasValue(existing) || !hasValue(incoming) ? undefined : incoming;
}

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

function isAutonomous(value) {
  const text = String(value || "").toLowerCase();
  return text.includes("autonomous") && !text.includes("non-autonomous");
}

function fraInstituteId(instituteCode) {
  return `EN${Number(instituteCode)}`;
}

function matrixKey(row) {
  return `${row.academicYear}|${row.admissionRoute}|${row.branchCode}`;
}

function branchCodeBase(value) {
  return String(value || "").replace(/[A-Z]$/, "");
}

async function main() {
  const [profiles, matrices, fees, websites, rankings, colleges, knownBranches, existingMatrices, existingFees] =
    await Promise.all([
      readJson("profiles.json"),
      readJson("seat_matrices.json"),
      readJson("fees.json"),
      readJson("websites.json"),
      readJson("rankings.json"),
      prisma.college.findMany({
        where: { profile: { is: { currentCap2025: "Yes" } } },
        include: { profile: true }
      }),
      prisma.branch.findMany({ select: { branchCode: true } }),
      prisma.seatMatrix.findMany({
        where: { admissionRoute: "DSE", academicYear: "2025-26" },
        select: { academicYear: true, admissionRoute: true, branchCode: true }
      }),
      prisma.collegeFee.findMany({ select: { academicYear: true, fraInstituteId: true } })
    ]);

  const collegeByCode = new Map(colleges.map((college) => [college.instituteCode, college]));
  const branchCodes = new Set(knownBranches.map((branch) => branch.branchCode));
  const branchCodesByBase = new Map();
  for (const branch of knownBranches) {
    const base = branchCodeBase(branch.branchCode);
    branchCodesByBase.set(base, [...(branchCodesByBase.get(base) || []), branch.branchCode]);
  }
  const normalizedMatrices = matrices.map((row) => {
    if (branchCodes.has(row.branchCode)) return row;
    const equivalentCodes = branchCodesByBase.get(branchCodeBase(row.branchCode)) || [];
    return equivalentCodes.length === 1 ? { ...row, branchCode: equivalentCodes[0] } : row;
  });
  const matrixKeys = new Set(existingMatrices.map(matrixKey));
  const feeKeys = new Set(existingFees.map((fee) => `${fee.academicYear}|${fee.fraInstituteId}`));
  const websiteByCode = new Map(websites.filter((row) => row.verified).map((row) => [row.instituteCode, row]));
  const profileUpdates = [];
  const collegeUpdates = [];

  for (const row of profiles) {
    const college = collegeByCode.get(row.instituteCode);
    if (!college) continue;
    const website = websiteByCode.get(row.instituteCode);
    const profileData = compact({
      state: fillMissing(college.profile?.state, row.state),
      region: fillMissing(college.profile?.region, row.region),
      districtCity: fillMissing(college.profile?.districtCity, row.districtCity),
      address: fillMissing(college.profile?.address, row.address),
      ownershipType: fillMissing(college.profile?.ownershipType, row.ownershipType),
      autonomyStatus: fillMissing(college.profile?.autonomyStatus, row.autonomyStatus),
      minorityStatus: fillMissing(college.profile?.minorityStatus, row.minorityStatus),
      university: fillMissing(college.profile?.university, row.university),
      officialWebsite: fillMissing(college.profile?.officialWebsite, website?.officialWebsite),
      websiteCompletenessStatus: fillMissing(
        college.profile?.websiteCompletenessStatus,
        website?.websiteCompletenessStatus
      )
    });
    if (Object.keys(profileData).length) {
      profileUpdates.push({ instituteCode: row.instituteCode, data: profileData });
    }

    const collegeData = compact({
      collegeType: fillMissing(college.collegeType, row.ownershipType),
      officialWebsite: fillMissing(college.officialWebsite, website?.officialWebsite),
      autonomous: !college.autonomous && isAutonomous(row.autonomyStatus) ? true : undefined
    });
    if (Object.keys(collegeData).length) {
      collegeUpdates.push({ instituteCode: row.instituteCode, data: collegeData });
    }
  }

  const feeCreates = fees
    .filter((row) => row.verified && collegeByCode.has(row.instituteCode))
    .map((row) => ({ ...row, fraInstituteId: fraInstituteId(row.instituteCode) }))
    .filter((row) => !feeKeys.has(`${row.academicYear}|${row.fraInstituteId}`));

  const branchCreates = [...new Map(
    normalizedMatrices
      .filter((row) =>
        collegeByCode.has(row.instituteCode) &&
        row.branchCode.slice(0, 5) === row.instituteCode &&
        !branchCodes.has(row.branchCode)
      )
      .map((row) => [row.branchCode, {
        branchCode: row.branchCode,
        officialName: row.branchName,
        displayName: row.branchName,
        searchGroup: null,
        instituteCode: row.instituteCode,
        academicYear: row.academicYear
      }])
  ).values()];
  const importableBranchCodes = new Set([...branchCodes, ...branchCreates.map((row) => row.branchCode)]);

  const matrixCreates = normalizedMatrices
    .filter((row) =>
      row.academicYear === "2025-26" &&
      collegeByCode.has(row.instituteCode) &&
      importableBranchCodes.has(row.branchCode) &&
      row.branchCode.slice(0, 5) === row.instituteCode &&
      !matrixKeys.has(matrixKey(row))
    )
    .map((row) => ({
      academicYear: row.academicYear,
      admissionRoute: "DSE",
      instituteCode: row.instituteCode,
      collegeName: row.collegeName,
      collegeStatus: row.collegeStatus,
      collegeType: row.collegeStatus,
      autonomous: isAutonomous(row.collegeStatus),
      capSeats: row.totalDseSeats,
      branchCode: row.branchCode,
      branchName: row.branchName,
      sanctionedIntake: null,
      maharashtraSeats: row.maharashtraSeats,
      minoritySeats: row.minoritySeats,
      allIndiaSeats: null,
      instituteSeats: null,
      orphanSeats: null,
      ewsSeats: row.ewsSeats,
      tfwsChoiceCode: null,
      tfwsSeats: null,
      vacantSeats: null,
      lateralEntrySeats: row.totalDseSeats,
      pwdSeats: null,
      defenceSeats: null,
      categorySeats: {
        msSeats: row.maharashtraSeats,
        ewsSeats: row.ewsSeats,
        minoritySeats: row.minoritySeats,
        otherSeats: row.otherSeats,
        composition: row.seatCompositionText
      },
      sourceFile: row.sourceFile,
      sourcePage: 1,
      verified: true,
      needsReview: false,
      reviewReason: null
    }));

  const rankingRows = rankings.filter((row) => row.verified && collegeByCode.has(row.instituteCode));
  const unmatchedInstituteCodes = [...new Set([
    ...profiles,
    ...normalizedMatrices,
    ...fees,
    ...websites,
    ...rankings
  ].filter((row) => !collegeByCode.has(row.instituteCode)).map((row) => row.instituteCode))].sort();
  const unmatchedBranchRows = normalizedMatrices.filter((row) =>
    collegeByCode.has(row.instituteCode) && !importableBranchCodes.has(row.branchCode)
  );

  if (applyChanges) {
    await prisma.$transaction(async (transaction) => {
      for (const update of profileUpdates) {
        await transaction.collegeProfile.update({
          where: { instituteCode: update.instituteCode },
          data: update.data
        });
      }
      for (const update of collegeUpdates) {
        await transaction.college.update({
          where: { instituteCode: update.instituteCode },
          data: update.data
        });
      }
      for (const row of feeCreates) {
        await transaction.collegeFee.create({
          data: {
            academicYear: row.academicYear,
            fraInstituteId: row.fraInstituteId,
            instituteCode: row.instituteCode,
            instituteName: row.instituteName,
            district: row.district,
            approvalStatus: row.verificationStatus,
            meetingDate: null,
            tuitionFee: row.tuitionFee,
            developmentFee: row.developmentFee,
            totalApprovedFee: row.totalApprovedFee,
            sourceUrl: row.sourceUrl
          }
        });
        await transaction.collegeProfile.updateMany({
          where: { instituteCode: row.instituteCode, totalApprovedFee: null },
          data: { feeYear: row.academicYear, totalApprovedFee: row.totalApprovedFee }
        });
      }
      for (const row of branchCreates) {
        const branch = await transaction.branch.upsert({
          where: { branchCode: row.branchCode },
          create: {
            branchCode: row.branchCode,
            officialName: row.officialName,
            displayName: row.displayName,
            searchGroup: row.searchGroup
          },
          update: {}
        });
        await transaction.collegeBranch.upsert({
          where: {
            collegeId_branchId_academicYear: {
              collegeId: collegeByCode.get(row.instituteCode).id,
              branchId: branch.id,
              academicYear: row.academicYear
            }
          },
          create: {
            collegeId: collegeByCode.get(row.instituteCode).id,
            branchId: branch.id,
            academicYear: row.academicYear,
            intake: null
          },
          update: {}
        });
      }
      if (matrixCreates.length) {
        await transaction.seatMatrix.createMany({ data: matrixCreates, skipDuplicates: true });
      }
      for (const row of rankingRows) {
        await transaction.collegeRanking.upsert({
          where: {
            instituteCode_rankingSystem_rankingYear_category: {
              instituteCode: row.instituteCode,
              rankingSystem: row.rankingSystem,
              rankingYear: row.rankingYear,
              category: row.category
            }
          },
          create: row,
          update: row
        });
      }
    });
  }

  const report = {
    mode: applyChanges ? "apply" : "dry-run",
    source: path.resolve(process.cwd(), "..", "maharashtra_dse_engineering_college_dataset.xlsx"),
    currentColleges: colleges.length,
    sourceRows: {
      profiles: profiles.length,
      seatMatrices: matrices.length,
      verifiedFees: fees.filter((row) => row.verified).length,
      verifiedWebsites: websites.filter((row) => row.verified).length,
      verifiedNirfRankings: rankings.filter((row) => row.verified).length
    },
    proposedChanges: {
      profileUpdates: profileUpdates.length,
      collegeUpdates: collegeUpdates.length,
      newFeeRows: feeCreates.length,
      newBranchRows: branchCreates.length,
      newDseSeatMatrixRows: matrixCreates.length,
      nirfRankingUpserts: rankingRows.length
    },
    validation: {
      unmatchedInstituteCodes,
      addedBranchDefinitions: branchCreates.map((row) => ({
        instituteCode: row.instituteCode,
        branchCode: row.branchCode,
        branchName: row.displayName
      })),
      unmatchedBranchRows: unmatchedBranchRows.slice(0, 30).map((row) => ({
        instituteCode: row.instituteCode,
        branchCode: row.branchCode,
        branchName: row.branchName
      })),
      unmatchedBranchRowCount: unmatchedBranchRows.length
    }
  };

  const reportPath = path.join(dataDir, "import_report.json");
  try {
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    console.warn(`Could not save ${reportPath}: ${error.message}`);
  }
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
