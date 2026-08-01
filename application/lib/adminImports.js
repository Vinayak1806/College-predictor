import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { currentInstituteCode } from "./instituteCodes.js";
import { prisma } from "./prisma.js";
import {
  canonicalBranchCode,
  recordIssues,
  sanitizeRecordCorrection,
  validateStagedRecords
} from "./adminImportValidation.js";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(process.cwd(), "..");
const importsRoot = path.join(projectRoot, "data", "admin-imports");
const processorPath = path.join(projectRoot, "data-pipeline", "process_admin_upload.py");
const MAX_FILE_SIZE = 30 * 1024 * 1024;

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
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function publicSummary(summary) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return summary;
  const { rollback, ...visible } = summary;
  return visible;
}

export function serializeAdminImport(adminImport, includeRecords = false) {
  const result = {
    id: adminImport.id.toString(),
    documentType: adminImport.documentType,
    admissionRoute: adminImport.admissionRoute,
    academicYear: adminImport.academicYear,
    capRound: adminImport.capRound,
    quota: adminImport.quota,
    originalFilename: adminImport.originalFilename,
    mimeType: adminImport.mimeType,
    fileSize: adminImport.fileSize,
    sourceUrl: adminImport.sourceUrl,
    status: adminImport.status,
    summary: publicSummary(adminImport.summary),
    errorMessage: adminImport.errorMessage,
    createdAt: adminImport.createdAt,
    processedAt: adminImport.processedAt,
    publishedAt: adminImport.publishedAt,
    rolledBackAt: adminImport.rolledBackAt,
    recordCount: adminImport._count?.records
  };

  if (includeRecords) {
    result.records = (adminImport.records || []).map((record) => ({
      id: record.id.toString(),
      rowNumber: record.rowNumber,
      recordType: record.recordType,
      data: record.data,
      valid: record.valid,
      needsReview: record.needsReview,
      issues: record.issues
    }));
  }

  return result;
}

export function validatePdfUpload(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("Choose an official PDF file.");
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are supported by this importer.");
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    throw new Error("The PDF must be larger than 0 bytes and no more than 30 MB.");
  }
}

async function runPython(args) {
  const configured = process.env.PYTHON_EXECUTABLE;
  const bundledPython = path.join(
    os.homedir(),
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "python",
    "python.exe"
  );
  const candidates = configured
    ? [{ command: configured, prefix: [] }]
    : process.platform === "win32"
      ? [
          { command: "python", prefix: [] },
          { command: "py", prefix: ["-3"] },
          { command: bundledPython, prefix: [] }
        ]
      : [{ command: "python3", prefix: [] }, { command: "python", prefix: [] }];

  let unavailableRuntimeError;
  for (const candidate of candidates) {
    try {
      return await execFileAsync(candidate.command, [...candidate.prefix, processorPath, ...args], {
        cwd: projectRoot,
        timeout: 30 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true
      });
    } catch (error) {
      const missingDependency =
        /ModuleNotFoundError|No module named ['"](?:pdfplumber|pandas|pypdf)['"]/i.test(String(error.stderr || ""));
      if (error.code !== "ENOENT" && !missingDependency) throw error;
      unavailableRuntimeError = error;
    }
  }
  throw new Error(
    `A Python runtime with the data-pipeline requirements could not be started. Configure PYTHON_EXECUTABLE. ${unavailableRuntimeError?.message || ""}`.trim()
  );
}

export async function createAndProcessImport({ file, metadata }) {
  validatePdfUpload(file);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("The uploaded file does not contain a valid PDF signature.");
  }

  const fileHash = crypto.createHash("sha256").update(bytes).digest("hex");
  const duplicate = await prisma.adminImport.findUnique({ where: { fileHash } });
  if (duplicate) {
    const error = new Error(`This exact file was already uploaded as import #${duplicate.id}.`);
    error.status = 409;
    error.importId = duplicate.id.toString();
    throw error;
  }

  const uploadKey = crypto.randomUUID();
  const importDir = path.join(importsRoot, uploadKey);
  const storedPath = path.join(importDir, "source.pdf");
  await fs.mkdir(importDir, { recursive: true });
  await fs.writeFile(storedPath, bytes);

  const adminImport = await prisma.adminImport.create({
    data: {
      documentType: metadata.documentType,
      admissionRoute: metadata.admissionRoute,
      academicYear: metadata.academicYear,
      capRound: metadata.capRound || null,
      quota: metadata.quota,
      originalFilename: file.name,
      storedPath,
      mimeType: file.type || "application/pdf",
      fileSize: file.size,
      fileHash,
      sourceUrl: metadata.sourceUrl || null,
      status: "UPLOADED"
    }
  });

  try {
    await prisma.adminImport.update({
      where: { id: adminImport.id },
      data: { status: "PROCESSING", errorMessage: null }
    });

    const args = [
      "--document-type", metadata.documentType,
      "--input", storedPath,
      "--output-dir", importDir,
      "--original-filename", file.name,
      "--route", metadata.admissionRoute,
      "--academic-year", metadata.academicYear,
      "--quota", metadata.quota
    ];
    if (metadata.capRound) args.push("--cap-round", String(metadata.capRound));
    await runPython(args);

    const [rawRecords, report, colleges] = await Promise.all([
      fs.readFile(path.join(importDir, "records.json"), "utf8").then(JSON.parse),
      fs.readFile(path.join(importDir, "report.json"), "utf8").then(JSON.parse),
      prisma.college.findMany({ select: { instituteCode: true } })
    ]);
    const knownInstituteCodes = new Set(colleges.map((college) => college.instituteCode));
    const issueCounts = {};
    const checkedRecords = validateStagedRecords(rawRecords, knownInstituteCodes);

    const stagedRecords = checkedRecords.map((record, index) => {
      const issues = record.issues;
      for (const issue of issues) issueCounts[issue] = (issueCounts[issue] || 0) + 1;

      return {
        importId: adminImport.id,
        rowNumber: index + 1,
        recordType: record.recordType,
        data: record.data,
        valid: issues.length === 0,
        needsReview: issues.length > 0,
        issues
      };
    });

    await prisma.adminImportRecord.deleteMany({ where: { importId: adminImport.id } });
    for (const records of chunk(stagedRecords)) {
      await prisma.adminImportRecord.createMany({ data: records });
    }

    const publishableRecords = stagedRecords.filter((record) => record.valid && !record.needsReview).length;
    const recordsNeedingReview = stagedRecords.length - publishableRecords;
    const summary = {
      ...report,
      totalRecords: stagedRecords.length,
      publishableRecords,
      recordsNeedingReview,
      excludedRecords: 0,
      issueCounts
    };
    const status = recordsNeedingReview ? "NEEDS_REVIEW" : "VERIFIED";

    return await prisma.adminImport.update({
      where: { id: adminImport.id },
      data: {
        status,
        summary,
        processedAt: new Date()
      },
      include: { _count: { select: { records: true } } }
    });
  } catch (error) {
    await prisma.adminImport.update({
      where: { id: adminImport.id },
      data: {
        status: "REJECTED",
        errorMessage: String(error.stderr || error.message || error).slice(0, 4000),
        processedAt: new Date()
      }
    });
    throw error;
  }
}

async function refreshImportReviewState(transaction, adminImport) {
  const records = await transaction.adminImportRecord.findMany({
    where: { importId: adminImport.id },
    orderBy: { rowNumber: "asc" }
  });
  const colleges = await transaction.college.findMany({ select: { instituteCode: true } });
  const knownInstituteCodes = new Set(colleges.map((college) => college.instituteCode));
  const excludedRecords = records.filter((record) =>
    !record.valid && !record.needsReview && (record.issues || []).includes("EXCLUDED_BY_ADMIN")
  );
  const excludedIds = new Set(excludedRecords.map((record) => record.id.toString()));
  const checkedRecords = validateStagedRecords(
    records
      .filter((record) => !excludedIds.has(record.id.toString()))
      .map((record) => ({ id: record.id, recordType: record.recordType, data: record.data })),
    knownInstituteCodes
  );
  const checkedById = new Map(checkedRecords.map((record) => [record.id.toString(), record]));

  for (const record of records) {
    const checked = checkedById.get(record.id.toString());
    if (!checked) continue;
    const valid = checked.issues.length === 0;
    const needsReview = checked.issues.length > 0;
    if (
      JSON.stringify(record.data) !== JSON.stringify(checked.data) ||
      JSON.stringify(record.issues || []) !== JSON.stringify(checked.issues) ||
      record.valid !== valid ||
      record.needsReview !== needsReview
    ) {
      await transaction.adminImportRecord.update({
        where: { id: record.id },
        data: {
          data: checked.data,
          issues: checked.issues,
          valid,
          needsReview
        }
      });
    }
  }

  const finalRecords = records.map((record) => {
    const checked = checkedById.get(record.id.toString());
    if (!checked) return record;
    return {
      ...record,
      valid: checked.issues.length === 0,
      needsReview: checked.issues.length > 0,
      issues: checked.issues
    };
  });
  const publishableRecords = finalRecords.filter((record) => record.valid && !record.needsReview).length;
  const recordsNeedingReview = finalRecords.filter((record) => record.needsReview).length;
  const issueCounts = {};

  for (const record of finalRecords) {
    if (!record.needsReview) continue;
    for (const issue of record.issues || []) {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    }
  }

  return transaction.adminImport.update({
    where: { id: adminImport.id },
    data: {
      status: recordsNeedingReview ? "NEEDS_REVIEW" : "VERIFIED",
      summary: {
        ...(adminImport.summary || {}),
        totalRecords: finalRecords.length,
        publishableRecords,
        recordsNeedingReview,
        excludedRecords: excludedRecords.length,
        issueCounts
      }
    }
  });
}

export async function updateAdminImportRecord(importId, recordId, correction) {
  return prisma.$transaction(async (transaction) => {
    const adminImport = await transaction.adminImport.findUnique({
      where: { id: BigInt(importId) }
    });
    if (!adminImport) throw Object.assign(new Error("Import not found."), { status: 404 });
    if (!["VERIFIED", "NEEDS_REVIEW"].includes(adminImport.status)) {
      throw Object.assign(new Error("Only an unpublished processed import can be corrected."), { status: 409 });
    }

    const record = await transaction.adminImportRecord.findFirst({
      where: {
        id: BigInt(recordId),
        importId: adminImport.id
      }
    });
    if (!record) throw Object.assign(new Error("Staged record not found."), { status: 404 });

    if (correction.exclude) {
      await transaction.adminImportRecord.update({
        where: { id: record.id },
        data: {
          valid: false,
          needsReview: false,
          issues: ["EXCLUDED_BY_ADMIN"]
        }
      });
    } else {
      const patch = sanitizeRecordCorrection(record.recordType, correction.data);
      if (!Object.keys(patch).length) {
        throw Object.assign(new Error("No supported correction fields were provided."), { status: 400 });
      }

      const data = {
        ...record.data,
        ...patch,
        review_reason: ""
      };
      const colleges = await transaction.college.findMany({ select: { instituteCode: true } });
      const checked = recordIssues({
        recordType: record.recordType,
        data,
        knownInstituteCodes: new Set(colleges.map((college) => college.instituteCode))
      });
      const issues = [...new Set(checked.issues)].sort();

      await transaction.adminImportRecord.update({
        where: { id: record.id },
        data: {
          data: checked.data,
          valid: issues.length === 0,
          needsReview: issues.length > 0,
          issues
        }
      });
    }

    await refreshImportReviewState(transaction, adminImport);
    return transaction.adminImport.findUnique({
      where: { id: adminImport.id },
      include: { _count: { select: { records: true } } }
    });
  }, { maxWait: 10000, timeout: 120000 });
}

async function publishCutoffs(adminImport, records) {
  const rows = records.map((record) => record.data);
  const branchRows = [...new Map(rows.map((row) => [
    canonicalBranchCode(row.branch_code),
    {
      branchCode: canonicalBranchCode(row.branch_code),
      officialName: row.branch_name,
      displayName: row.branch_name
    }
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
          : ["ORP", "ORPHAN"].includes(row.seat_type)
            ? "ORPHAN"
            : ["TFWS", "EWS"].includes(row.seat_type)
              ? row.seat_type
              : row.seat_type === "MI"
                ? "MINORITY"
                : null
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

    return {
      publishedRecords: cutoffRows.length,
      rollback: { datasetId: dataset.id.toString() }
    };
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

async function publishSeatMatrices(adminImport, records) {
  const rows = records.map((record) => seatMatrixData(record.data));
  const branchCodes = rows.map((row) => row.branchCode);
  const previousRows = await prisma.seatMatrix.findMany({
    where: {
      academicYear: adminImport.academicYear,
      admissionRoute: adminImport.admissionRoute,
      branchCode: { in: branchCodes }
    }
  });
  const previousKeys = new Set(previousRows.map((row) => `${row.academicYear}|${row.admissionRoute}|${row.branchCode}`));
  const insertedKeys = rows
    .filter((row) => !previousKeys.has(`${row.academicYear}|${row.admissionRoute}|${row.branchCode}`))
    .map((row) => ({
      academicYear: row.academicYear,
      admissionRoute: row.admissionRoute,
      branchCode: row.branchCode
    }));

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
  }, { maxWait: 10000, timeout: 120000 });

  return {
    publishedRecords: rows.length,
    rollback: {
      previousRows: previousRows.map(({ id, ...row }) => row),
      insertedKeys
    }
  };
}

export async function publishAdminImport(id) {
  const adminImport = await prisma.adminImport.findUnique({
    where: { id: BigInt(id) },
    include: {
      records: {
        where: { valid: true, needsReview: false },
        orderBy: { rowNumber: "asc" }
      }
    }
  });
  if (!adminImport) throw Object.assign(new Error("Import not found."), { status: 404 });
  if (adminImport.status !== "VERIFIED") {
    throw Object.assign(new Error("Resolve or exclude every review row before publishing."), { status: 409 });
  }
  if (!adminImport.records.length) {
    throw Object.assign(new Error("No validated records are available to publish."), { status: 409 });
  }

  const published = adminImport.documentType === "CUTOFF_PDF"
    ? await publishCutoffs(adminImport, adminImport.records)
    : await publishSeatMatrices(adminImport, adminImport.records);
  const summary = {
    ...(adminImport.summary || {}),
    publishedRecords: published.publishedRecords,
    rollback: published.rollback
  };

  return prisma.adminImport.update({
    where: { id: adminImport.id },
    data: {
      status: "PUBLISHED",
      summary,
      publishedAt: new Date(),
      rolledBackAt: null
    },
    include: { _count: { select: { records: true } } }
  });
}

export async function rollbackAdminImport(id) {
  const adminImport = await prisma.adminImport.findUnique({ where: { id: BigInt(id) } });
  if (!adminImport) throw Object.assign(new Error("Import not found."), { status: 404 });
  if (adminImport.status !== "PUBLISHED") {
    throw Object.assign(new Error("Only a published import can be rolled back."), { status: 409 });
  }
  const rollback = adminImport.summary?.rollback;
  if (!rollback) throw Object.assign(new Error("Rollback information is unavailable."), { status: 409 });

  if (adminImport.documentType === "CUTOFF_PDF") {
    const datasetId = BigInt(rollback.datasetId);
    await prisma.$transaction([
      prisma.cutoff.deleteMany({ where: { datasetId } }),
      prisma.cutoffDataset.delete({ where: { id: datasetId } })
    ]);
  } else {
    await prisma.$transaction(async (transaction) => {
      for (const key of rollback.insertedKeys || []) {
        await transaction.seatMatrix.deleteMany({ where: key });
      }
      for (const row of rollback.previousRows || []) {
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
    }, { maxWait: 10000, timeout: 120000 });
  }

  return prisma.adminImport.update({
    where: { id: adminImport.id },
    data: {
      status: "ROLLED_BACK",
      rolledBackAt: new Date()
    },
    include: { _count: { select: { records: true } } }
  });
}
