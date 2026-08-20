import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { currentInstituteCode } from "./instituteCodes.js";
import { prisma } from "./prisma.js";
import { clearResponseCache } from "./responseCache.js";
import {
  recordIssues,
  repairSeatMatrixInstituteMismatches,
  sanitizeRecordCorrection,
  validateStagedRecords
} from "./adminImportValidation.js";
import { publishCutoffs, publishSeatMatrices } from "./adminImportPublishing.js";
import {
  adminImportsRoot,
  createTempProcessingDir,
  cleanupTempDir,
  runAdminImportProcessor
} from "./adminImportRuntime.js";
import {
  uploadFile,
  downloadToTempFile,
  getStorageType
} from "./supabaseStorage.js";

const MAX_FILE_SIZE = 30 * 1024 * 1024;

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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}

const VERIFIED_FE_2026_LOCATIONS = new Map([
  ["02805", { district: "Chhatrapati Sambhajinagar", region: "Aurangabad" }],
  ["04026", { district: "Gadchiroli", region: "Nagpur" }],
  ["04762", { district: "Chandrapur", region: "Nagpur" }],
  ["05413", { district: "Dhule", region: "Nashik" }],
  ["05682", { district: "Ahilyanagar", region: "Nashik" }],
  ["05683", { district: "Nashik", region: "Nashik" }],
  ["05686", { district: "Nashik", region: "Nashik" }],
  ["06041", { district: "Solapur", region: "Pune" }],
  ["06725", { district: "Solapur", region: "Pune" }],
  ["06814", { district: "Kolhapur", region: "Pune" }],
  ["16371", { district: "Pune", region: "Pune" }],
  ["16372", { district: "Satara", region: "Pune" }]
]);

function verifiedImportLocation(adminImport, instituteCode) {
  if (adminImport.admissionRoute !== "FE" || adminImport.academicYear !== "2026-27") return null;
  return VERIFIED_FE_2026_LOCATIONS.get(instituteCode) || null;
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

async function processAdminImport(adminImport) {
  // When using Supabase storage, storedPath is a relative key (e.g. "<uuid>/source.pdf").
  // The Python extractor needs local files, so we download to a temp dir first.
  const useSupabase = getStorageType() === "supabase";
  let localPdfPath = adminImport.storedPath;
  let tempDir = null;

  try {
    await prisma.adminImport.update({
      where: { id: adminImport.id },
      data: { status: "PROCESSING", errorMessage: null }
    });

    if (useSupabase) {
      localPdfPath = await downloadToTempFile(adminImport.storedPath);
      tempDir = path.dirname(localPdfPath);
    }

    // Use a temp dir for extractor output when on Supabase, otherwise use
    // the local import directory alongside the stored PDF.
    const importDir = tempDir || path.dirname(localPdfPath);

    const args = [
      "--document-type", adminImport.documentType,
      "--input", localPdfPath,
      "--output-dir", importDir,
      "--original-filename", adminImport.originalFilename,
      "--route", adminImport.admissionRoute,
      "--academic-year", adminImport.academicYear,
      "--quota", adminImport.quota
    ];
    if (adminImport.capRound) args.push("--cap-round", String(adminImport.capRound));
    await runAdminImportProcessor(args);

    const [rawRecords, report, colleges] = await Promise.all([
      fs.readFile(path.join(importDir, "records.json"), "utf8").then(JSON.parse),
      fs.readFile(path.join(importDir, "report.json"), "utf8").then(JSON.parse),
      prisma.college.findMany({
        select: { instituteCode: true, name: true, collegeType: true, autonomous: true }
      })
    ]);
    if (!rawRecords.length) {
      throw new Error("The extractor found no usable records. Nothing was staged or published.");
    }
    if (
      adminImport.documentType === "SEAT_MATRIX_PDF"
      && adminImport.admissionRoute === "DSE"
      && Number(report.unparsed_choice_codes) > 0
    ) {
      throw new Error(
        `Extraction stopped safely: ${report.unparsed_choice_codes} choice code(s) were detected in the PDF but not converted into rows. The import was not staged or published.`
      );
    }
    const knownInstituteCodes = new Set(colleges.map((college) => college.instituteCode));
    const issueCounts = {};
    const databaseComparison = repairSeatMatrixInstituteMismatches(rawRecords, colleges);
    const checkedRecords = validateStagedRecords(databaseComparison.records, knownInstituteCodes);

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

    const publishableRecords = stagedRecords.filter((record) => record.valid && !record.needsReview).length;
    const recordsNeedingReview = stagedRecords.length - publishableRecords;
    const summary = {
      ...report,
      totalRecords: stagedRecords.length,
      publishableRecords,
      recordsNeedingReview,
      excludedRecords: 0,
      automaticRepairs: databaseComparison.repairs,
      issueCounts
    };
    const status = recordsNeedingReview ? "NEEDS_REVIEW" : "VERIFIED";

    return await prisma.$transaction(async (transaction) => {
      await transaction.adminImportRecord.deleteMany({ where: { importId: adminImport.id } });
      for (const records of chunk(stagedRecords)) {
        await transaction.adminImportRecord.createMany({ data: records });
      }

      return transaction.adminImport.update({
        where: { id: adminImport.id },
        data: {
          status,
          summary,
          processedAt: new Date()
        },
        include: { _count: { select: { records: true } } }
      });
    }, { maxWait: 10000, timeout: 120000 });
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
  } finally {
    // Clean up temp files when using Supabase storage
    if (tempDir) await cleanupTempDir(tempDir);
  }
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
  const relativePath = `${uploadKey}/source.pdf`;

  // Upload to Supabase Storage or local filesystem
  const result = await uploadFile(relativePath, bytes, "application/pdf");
  // Store a relative path for Supabase, absolute path for local
  const storedPath = result.backend === "supabase" ? relativePath : result.path;

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

  return processAdminImport(adminImport);
}

export async function reprocessAdminImport(id) {
  const adminImport = await prisma.adminImport.findUnique({ where: { id: BigInt(id) } });
  if (!adminImport) throw Object.assign(new Error("Import not found."), { status: 404 });
  if (["PROCESSING", "PUBLISHED", "ROLLED_BACK"].includes(adminImport.status)) {
    throw Object.assign(
      new Error("Only an unpublished import that is not already processing can be reprocessed."),
      { status: 409 }
    );
  }

  // For Supabase storage, existence is verified during processAdminImport
  // when it downloads the file. For local storage, verify the file exists.
  if (getStorageType() === "local") {
    await fs.access(adminImport.storedPath);
  }
  return processAdminImport(adminImport);
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

export async function bulkResolveAdminImportReview(importId, { action, instituteCode }) {
  return prisma.$transaction(async (transaction) => {
    const adminImport = await transaction.adminImport.findUnique({
      where: { id: BigInt(importId) }
    });
    if (!adminImport) throw Object.assign(new Error("Import not found."), { status: 404 });
    if (!["VERIFIED", "NEEDS_REVIEW"].includes(adminImport.status)) {
      throw Object.assign(new Error("Only an unpublished processed import can be reviewed."), { status: 409 });
    }

    const reviewRecords = await transaction.adminImportRecord.findMany({
      where: { importId: adminImport.id, needsReview: true },
      orderBy: { rowNumber: "asc" }
    });
    const selectedRecords = instituteCode
      ? reviewRecords.filter((record) => currentInstituteCode(record.data?.institute_code) === instituteCode)
      : reviewRecords;
    if (!selectedRecords.length) {
      throw Object.assign(new Error("No review rows match this action."), { status: 409 });
    }

    const selectedIds = selectedRecords.map((record) => record.id);
    const instituteCodes = [...new Set(selectedRecords.map((record) =>
      currentInstituteCode(record.data?.institute_code)
    ).filter(Boolean))];

    if (action === "EXCLUDE_ROWS") {
      await transaction.adminImportRecord.updateMany({
        where: { id: { in: selectedIds }, importId: adminImport.id },
        data: { valid: false, needsReview: false, issues: ["EXCLUDED_BY_ADMIN"] }
      });
    } else {
      const unsafeRecord = selectedRecords.find((record) => {
        const issues = Array.isArray(record.issues) ? record.issues : [];
        return issues.length !== 1 || issues[0] !== "UNKNOWN_INSTITUTE_CODE";
      });
      if (unsafeRecord) {
        throw Object.assign(
          new Error("Bulk approval is allowed only when unknown institute code is the row's only issue."),
          { status: 409 }
        );
      }

      const existingUniversities = await transaction.university.findMany({
        select: { id: true, name: true }
      });
      const universityByName = new Map(existingUniversities.map((university) => [university.name, university.id]));
      const existingCities = await transaction.city.findMany({ select: { id: true, name: true } });
      const cityByName = new Map(existingCities.map((city) => [city.name, city.id]));

      for (const code of instituteCodes) {
        const instituteRows = selectedRecords.filter((record) =>
          currentInstituteCode(record.data?.institute_code) === code
        );
        const names = [...new Set(instituteRows.map((record) => String(record.data?.college_name || "").trim()).filter(Boolean))];
        const universities = [...new Set(instituteRows.map((record) => String(record.data?.university || "").trim()).filter(Boolean))];
        if (names.length !== 1 || universities.length !== 1) {
          throw Object.assign(
            new Error(`Institute ${code} has inconsistent names or university data and must be reviewed separately.`),
            { status: 409 }
          );
        }

        const universityId = universityByName.get(universities[0]);
        if (!universityId) {
          throw Object.assign(
            new Error(`University '${universities[0]}' is not available in the master university table.`),
            { status: 409 }
          );
        }

        const statusText = String(instituteRows[0].data?.college_status || "").trim();
        const location = verifiedImportLocation(adminImport, code);
        let cityId = location ? cityByName.get(location.district) : null;
        if (location && !cityId) {
          const city = await transaction.city.create({
            data: {
              name: location.district,
              district: location.district,
              region: location.region
            }
          });
          cityId = city.id;
          cityByName.set(location.district, city.id);
        }
        await transaction.college.upsert({
          where: { instituteCode: code },
          create: {
            instituteCode: code,
            name: names[0],
            slug: slugify(`${code}-${names[0]}`),
            cityId: cityId || null,
            universityId,
            collegeType: statusText || null,
            autonomous: /autonomous/i.test(statusText) && !/non-autonomous/i.test(statusText)
          },
          update: {
            name: names[0],
            cityId: cityId || null,
            universityId,
            collegeType: statusText || null,
            autonomous: /autonomous/i.test(statusText) && !/non-autonomous/i.test(statusText)
          }
        });
      }

      await transaction.adminImportRecord.updateMany({
        where: { id: { in: selectedIds }, importId: adminImport.id },
        data: { valid: true, needsReview: false, issues: [] }
      });
    }

    const updatedImport = await refreshImportReviewState(transaction, adminImport);
    const result = await transaction.adminImport.findUnique({
      where: { id: updatedImport.id },
      include: { _count: { select: { records: true } } }
    });
    return {
      adminImport: result,
      affectedRecords: selectedRecords.length,
      affectedInstitutes: instituteCodes.length
    };
  }, { maxWait: 10000, timeout: 120000 });
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

  const result = await prisma.adminImport.update({
    where: { id: adminImport.id },
    data: {
      status: "PUBLISHED",
      summary,
      publishedAt: new Date(),
      rolledBackAt: null
    },
    include: { _count: { select: { records: true } } }
  });
  clearResponseCache();
  return result;
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

  const result = await prisma.adminImport.update({
    where: { id: adminImport.id },
    data: {
      status: "ROLLED_BACK",
      rolledBackAt: new Date()
    },
    include: { _count: { select: { records: true } } }
  });
  clearResponseCache();
  return result;
}
