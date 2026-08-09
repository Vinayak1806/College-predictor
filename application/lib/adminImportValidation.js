import { z } from "zod";
import { currentInstituteCode } from "./instituteCodes.js";

export const ADMIN_DOCUMENT_TYPES = {
  CUTOFF_PDF: {
    label: "CAP cutoff PDF",
    description: "College, branch, seat type, rank and percentile records."
  },
  SEAT_MATRIX_PDF: {
    label: "Seat-matrix PDF",
    description: "FE intake or DSE lateral-entry, vacancy and category-seat information."
  }
};

export const adminImportMetadataSchema = z
  .object({
    documentType: z.enum(["CUTOFF_PDF", "SEAT_MATRIX_PDF"]),
    admissionRoute: z.enum(["FE", "DSE"]),
    academicYear: z.string().regex(/^20\d{2}-\d{2}$/, "Use an academic year such as 2026-27."),
    capRound: z.coerce.number().int().min(1).max(4).optional(),
    quota: z.enum(["MH"]).default("MH"),
    sourceUrl: z.union([z.literal(""), z.string().url()]).optional()
  })
  .superRefine((value, context) => {
    if (value.documentType === "CUTOFF_PDF" && !value.capRound) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capRound"],
        message: "CAP round is required for a cutoff PDF."
      });
    }
  });

const correctionValueSchema = z.union([
  z.string().max(500),
  z.number(),
  z.boolean(),
  z.null()
]);

export const adminRecordCorrectionSchema = z.object({
  data: z.record(correctionValueSchema).optional(),
  exclude: z.boolean().optional()
}).refine((value) => value.exclude === true || Boolean(value.data), {
  message: "Provide corrected record data or exclude the record."
});

export const adminBulkReviewSchema = z.object({
  action: z.enum(["APPROVE_INSTITUTES", "EXCLUDE_ROWS"]),
  instituteCode: z.string().regex(/^\d{5}$/).optional()
});

export const ADMIN_RECORD_FIELDS = {
  CUTOFF: new Set([
    "institute_code",
    "college_name",
    "branch_code",
    "branch_name",
    "seat_type",
    "category",
    "gender",
    "university_type",
    "opening_rank",
    "closing_rank",
    "opening_score",
    "closing_score",
    "stage",
    "section",
    "source_page"
  ]),
  SEAT_MATRIX: new Set([
    "institute_code",
    "college_name",
    "college_status",
    "college_type",
    "autonomous",
    "branch_code",
    "branch_name",
    "sanctioned_intake",
    "cap_seats",
    "maharashtra_seats",
    "minority_seats",
    "all_india_seats",
    "institute_seats",
    "orphan_seats",
    "ews_seats",
    "tfws_choice_code",
    "tfws_seats",
    "vacant_seats",
    "lateral_entry_seats",
    "pwd_seats",
    "defence_seats",
    "category_seats",
    "source_page"
  ])
};

export function sanitizeRecordCorrection(recordType, data) {
  const allowed = ADMIN_RECORD_FIELDS[recordType];
  if (!allowed) throw new Error("Unsupported staged record type.");

  return Object.fromEntries(
    Object.entries(data || {}).filter(([key]) => allowed.has(key))
  );
}

export function canonicalBranchCode(value) {
  const text = String(value || "").trim().toUpperCase();
  const match = text.match(/^(\d+)([A-Z]{0,3})$/);
  const digits = match?.[1] || "";
  const suffix = match?.[2] || "";
  if (!digits) return "";
  const normalized = digits.padStart(10, "0");
  return `${currentInstituteCode(normalized.slice(0, 5))}${normalized.slice(5)}${suffix}`;
}

export function repairSeatMatrixInstituteMismatches(records, colleges) {
  const collegeByCode = new Map(
    colleges.map((college) => [currentInstituteCode(college.instituteCode), college])
  );
  const repairs = [];

  const repairedRecords = records.map((record, index) => {
    if (record.recordType !== "SEAT_MATRIX") return record;

    const instituteCode = currentInstituteCode(record.data?.institute_code);
    const branchCode = canonicalBranchCode(record.data?.branch_code);
    const branchInstituteCode = branchCode.slice(0, 5);
    const matchedCollege = collegeByCode.get(branchInstituteCode);

    if (!instituteCode || !branchCode || instituteCode === branchInstituteCode || !matchedCollege) {
      return record;
    }

    repairs.push({
      rowNumber: index + 1,
      sourcePage: Number(record.data?.source_page) || null,
      branchCode,
      fromInstituteCode: instituteCode,
      fromCollegeName: String(record.data?.college_name || "").trim(),
      toInstituteCode: branchInstituteCode,
      toCollegeName: matchedCollege.name
    });

    return {
      ...record,
      data: {
        ...record.data,
        institute_code: branchInstituteCode,
        college_name: matchedCollege.name,
        college_type: matchedCollege.collegeType || record.data?.college_type || "",
        college_status: matchedCollege.collegeType || record.data?.college_status || "",
        autonomous: Boolean(matchedCollege.autonomous),
        review_reason: ""
      }
    };
  });

  return { records: repairedRecords, repairs };
}

export function stagedRecordKey(recordType, data) {
  const instituteCode = currentInstituteCode(data.institute_code);
  const branchCode = canonicalBranchCode(data.branch_code);

  return recordType === "CUTOFF"
    ? [
        instituteCode,
        data.academic_year,
        data.cap_round,
        branchCode,
        data.seat_type,
        data.stage || "",
        data.section || "STANDARD"
      ].join("|")
    : [
        instituteCode,
        data.academic_year,
        data.admission_route,
        branchCode
      ].join("|");
}

export function validateStagedRecords(records, knownInstituteCodes) {
  const checkedRecords = records.map((record) => {
    const checked = recordIssues({
      recordType: record.recordType,
      data: record.data,
      knownInstituteCodes
    });

    return {
      ...record,
      data: checked.data,
      issues: checked.issues
    };
  });
  const keyCounts = new Map();

  for (const record of checkedRecords) {
    const key = `${record.recordType}|${stagedRecordKey(record.recordType, record.data)}`;
    keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
  }

  return checkedRecords.map((record) => {
    const key = `${record.recordType}|${stagedRecordKey(record.recordType, record.data)}`;
    const issues = new Set(record.issues);
    if (keyCounts.get(key) > 1) issues.add("DUPLICATE_IMPORT_KEY");

    return {
      ...record,
      issues: [...issues].sort()
    };
  });
}

export function recordIssues({ recordType, data, knownInstituteCodes }) {
  const issues = new Set(
    String(data.review_reason || "")
      .split(";")
      .map((issue) => issue.trim())
      .filter(Boolean)
  );
  const instituteCode = currentInstituteCode(data.institute_code);
  const branchCode = canonicalBranchCode(data.branch_code);

  if (!instituteCode) issues.add("MISSING_INSTITUTE_CODE");
  if (instituteCode && !knownInstituteCodes.has(instituteCode)) issues.add("UNKNOWN_INSTITUTE_CODE");
  if (!branchCode) issues.add("MISSING_BRANCH_CODE");
  if (instituteCode && branchCode && branchCode.slice(0, 5) !== instituteCode) {
    issues.add("BRANCH_INSTITUTE_MISMATCH");
  }
  if (!String(data.college_name || "").trim()) issues.add("MISSING_COLLEGE_NAME");
  if (!String(data.branch_name || "").trim()) issues.add("MISSING_BRANCH_NAME");
  const sourcePage = Number(data.source_page);
  if (!Number.isInteger(sourcePage) || sourcePage < 1) issues.add("INVALID_SOURCE_PAGE");

  if (recordType === "CUTOFF") {
    if (!String(data.seat_type || "").trim()) issues.add("MISSING_SEAT_TYPE");
    const score = Number(data.closing_score);
    if (!Number.isFinite(score) || score < 0 || score > 100) issues.add("INVALID_CLOSING_SCORE");
    const rank = Number(data.closing_rank);
    if (data.closing_rank && (!Number.isInteger(rank) || rank <= 0)) issues.add("INVALID_CLOSING_RANK");
  }

  if (recordType === "SEAT_MATRIX") {
    const intake = Number(data.sanctioned_intake);
    const capSeats = Number(data.cap_seats);
    if (data.admission_route === "DSE") {
      if (!Number.isInteger(capSeats) || capSeats < 0) issues.add("INVALID_CAP_SEATS");
    } else if (!Number.isInteger(intake) || intake < 0) {
      issues.add("INVALID_SANCTIONED_INTAKE");
    }
  }

  return {
    data: {
      ...data,
      institute_code: instituteCode || "",
      branch_code: branchCode
    },
    issues: [...issues].sort()
  };
}
