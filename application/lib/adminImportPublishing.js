import { canonicalBranchCode } from "./adminImportValidation.js";
import { currentInstituteCode } from "./instituteCodes.js";
import { prisma } from "./prisma.js";

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function booleanValue(value) {
  return String(value).toLowerCase() === "true";
}

function chunk(items, size = 500) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

export async function publishCutoffs(adminImport, records) {
  const rows = records.map((record) => record.data);
  const branchRows = [...new Map(rows.map((row) => [
    canonicalBranchCode(row.branch_code),
    { branchCode: canonicalBranchCode(row.branch_code), officialName: row.branch_name, displayName: row.branch_name }
  ])).values()];
  const seatRows = [...new Map(rows.map((row) => [
    row.seat_type,
    {
      code: row.seat_type,
      category: row.category,
      gender: row.gender,
      universityType: row.university_type,
      specialType: row.seat_type.startsWith("PWD")
        ? "PWD"
        : row.seat_type.startsWith("DEF")
          ? "DEFENCE"
          : row.seat_type.startsWith("ORPHAN") || row.seat_type === "ORP"
            ? "ORPHAN"
            : ["TFWS", "EWS"].includes(row.seat_type)
              ? row.seat_type
              : row.seat_type === "MI" ? "MINORITY" : null
    }
  ])).values()];
  const instituteCodes = [...new Set(rows.map((row) => currentInstituteCode(row.institute_code)))];

  return prisma.$transaction(async (transaction) => {
    await transaction.branch.createMany({ data: branchRows, skipDuplicates: true });
    await transaction.seatType.createMany({ data: seatRows, skipDuplicates: true });

    const [colleges, branches, seatTypes] = await Promise.all([
      transaction.college.findMany({ where: { instituteCode: { in: instituteCodes } }, select: { id: true, instituteCode: true } }),
      transaction.branch.findMany({ where: { branchCode: { in: branchRows.map((row) => row.branchCode) } }, select: { id: true, branchCode: true } }),
      transaction.seatType.findMany({ where: { code: { in: seatRows.map((row) => row.code) } }, select: { id: true, code: true } })
    ]);
    const collegeByCode = new Map(colleges.map((college) => [college.instituteCode, college.id]));
    const branchByCode = new Map(branches.map((branch) => [branch.branchCode, branch.id]));
    const seatByCode = new Map(seatTypes.map((seatType) => [seatType.code, seatType.id]));

    await transaction.collegeRouteArchive.deleteMany({
      where: { admissionRoute: adminImport.admissionRoute, collegeId: { in: [...collegeByCode.values()] } }
    });

    const collegeBranchRows = [...new Map(rows.map((row) => {
      const collegeId = collegeByCode.get(currentInstituteCode(row.institute_code));
      const branchId = branchByCode.get(canonicalBranchCode(row.branch_code));
      const key = `${collegeId}|${branchId}|${row.academic_year}`;
      return [key, { collegeId, branchId, academicYear: row.academic_year }];
    })).values()];
    await transaction.collegeBranch.createMany({ data: collegeBranchRows, skipDuplicates: true });
    const collegeBranches = await transaction.collegeBranch.findMany({
      where: {
        collegeId: { in: [...new Set(collegeBranchRows.map((row) => row.collegeId))] },
        branchId: { in: [...new Set(collegeBranchRows.map((row) => row.branchId))] },
        academicYear: adminImport.academicYear
      },
      select: { id: true, collegeId: true, branchId: true, academicYear: true }
    });
    const collegeBranchByKey = new Map(
      collegeBranches.map((row) => [`${row.collegeId}|${row.branchId}|${row.academicYear}`, row.id])
    );

    const dataset = await transaction.cutoffDataset.create({
      data: {
        academicYear: adminImport.academicYear,
        admissionRoute: adminImport.admissionRoute,
        capRound: adminImport.capRound,
        quota: adminImport.quota,
        sourceFilename: adminImport.originalFilename,
        sourceUrl: adminImport.sourceUrl,
        fileHash: adminImport.fileHash,
        status: "PUBLISHED",
        verifiedAt: new Date()
      }
    });

    const cutoffRows = rows.map((row) => {
      const collegeId = collegeByCode.get(currentInstituteCode(row.institute_code));
      const branchId = branchByCode.get(canonicalBranchCode(row.branch_code));
      return {
        datasetId: dataset.id,
        collegeBranchId: collegeBranchByKey.get(`${collegeId}|${branchId}|${row.academic_year}`),
        seatTypeId: seatByCode.get(row.seat_type),
        stage: row.stage || null,
        section: row.section || "STANDARD",
        openingRank: numberOrNull(row.opening_rank),
        closingRank: numberOrNull(row.closing_rank),
        openingScore: numberOrNull(row.opening_score),
        closingScore: numberOrNull(row.closing_score),
        sourcePage: Number(row.source_page),
        verified: true,
        needsReview: false,
        reviewReason: null
      };
    });
    for (const batch of chunk(cutoffRows)) {
      await transaction.cutoff.createMany({ data: batch, skipDuplicates: true });
    }

    return { publishedRecords: cutoffRows.length, rollback: { datasetId: dataset.id.toString() } };
  }, { maxWait: 10000, timeout: 120000 });
}

function seatMatrixData(row) {
  let categorySeats = null;
  try {
    categorySeats = row.category_seats
      ? (typeof row.category_seats === "string" ? JSON.parse(row.category_seats) : row.category_seats)
      : null;
  } catch {
    categorySeats = null;
  }

  return {
    academicYear: row.academic_year,
    admissionRoute: row.admission_route,
    instituteCode: currentInstituteCode(row.institute_code),
    collegeName: row.college_name,
    collegeStatus: row.college_status || null,
    collegeType: row.college_type || null,
    autonomous: booleanValue(row.autonomous),
    capSeats: numberOrNull(row.cap_seats),
    branchCode: canonicalBranchCode(row.branch_code),
    branchName: row.branch_name,
    sanctionedIntake: numberOrNull(row.sanctioned_intake),
    maharashtraSeats: numberOrNull(row.maharashtra_seats),
    minoritySeats: numberOrNull(row.minority_seats),
    allIndiaSeats: numberOrNull(row.all_india_seats),
    instituteSeats: numberOrNull(row.institute_seats),
    orphanSeats: numberOrNull(row.orphan_seats),
    ewsSeats: numberOrNull(row.ews_seats),
    tfwsChoiceCode: row.tfws_choice_code ? canonicalBranchCode(row.tfws_choice_code) : null,
    tfwsSeats: numberOrNull(row.tfws_seats),
    vacantSeats: numberOrNull(row.vacant_seats),
    lateralEntrySeats: numberOrNull(row.lateral_entry_seats),
    pwdSeats: numberOrNull(row.pwd_seats),
    defenceSeats: numberOrNull(row.defence_seats),
    categorySeats,
    sourceFile: row.source_file,
    sourcePage: Number(row.source_page),
    verified: true,
    needsReview: false,
    reviewReason: null
  };
}

export async function publishSeatMatrices(adminImport, records) {
  const rows = records.map((record) => seatMatrixData(record.data));
  const branchCodes = rows.map((row) => row.branchCode);
  const previousRows = await prisma.seatMatrix.findMany({
    where: { academicYear: adminImport.academicYear, admissionRoute: adminImport.admissionRoute, branchCode: { in: branchCodes } }
  });
  const previousKeys = new Set(previousRows.map((row) => `${row.academicYear}|${row.admissionRoute}|${row.branchCode}`));
  const insertedKeys = rows
    .filter((row) => !previousKeys.has(`${row.academicYear}|${row.admissionRoute}|${row.branchCode}`))
    .map((row) => ({ academicYear: row.academicYear, admissionRoute: row.admissionRoute, branchCode: row.branchCode }));

  await prisma.$transaction(async (transaction) => {
    for (const row of rows) {
      await transaction.seatMatrix.upsert({
        where: {
          academicYear_admissionRoute_branchCode: {
            academicYear: row.academicYear,
            admissionRoute: row.admissionRoute,
            branchCode: row.branchCode
          }
        },
        create: row,
        update: row
      });
    }
    await transaction.collegeRouteArchive.deleteMany({
      where: {
        admissionRoute: adminImport.admissionRoute,
        college: { instituteCode: { in: [...new Set(rows.map((row) => row.instituteCode))] } }
      }
    });
  }, { maxWait: 10000, timeout: 120000 });

  return {
    publishedRecords: rows.length,
    rollback: {
      previousRows: previousRows.map(({ id, ...row }) => row),
      insertedKeys
    }
  };
}
