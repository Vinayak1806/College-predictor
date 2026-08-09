import assert from "node:assert/strict";
import test from "node:test";
import {
  adminBulkReviewSchema,
  adminImportMetadataSchema,
  adminRecordCorrectionSchema,
  canonicalBranchCode,
  repairSeatMatrixInstituteMismatches,
  recordIssues,
  sanitizeRecordCorrection,
  stagedRecordKey,
  validateStagedRecords
} from "./adminImportValidation.js";

test("bulk review accepts only explicit approval or exclusion actions", () => {
  assert.equal(adminBulkReviewSchema.safeParse({ action: "APPROVE_INSTITUTES" }).success, true);
  assert.equal(adminBulkReviewSchema.safeParse({ action: "EXCLUDE_ROWS", instituteCode: "06041" }).success, true);
  assert.equal(adminBulkReviewSchema.safeParse({ action: "PUBLISH_EVERYTHING" }).success, false);
});

test("requires a CAP round for cutoff PDFs", () => {
  const result = adminImportMetadataSchema.safeParse({
    documentType: "CUTOFF_PDF",
    admissionRoute: "FE",
    academicYear: "2026-27",
    quota: "MH"
  });

  assert.equal(result.success, false);
  assert.ok(result.error.flatten().fieldErrors.capRound);
});

test("seat-matrix uploads support DSE", () => {
  const result = adminImportMetadataSchema.safeParse({
    documentType: "SEAT_MATRIX_PDF",
    admissionRoute: "DSE",
    academicYear: "2026-27",
    quota: "MH"
  });

  assert.equal(result.success, true);
});

test("current institute aliases are applied to branch codes", () => {
  assert.equal(canonicalBranchCode("0600624210"), "1600624210");
});

test("seat-matrix boundary rows use the branch prefix to match an existing college", () => {
  const result = repairSeatMatrixInstituteMismatches(
    [{
      recordType: "SEAT_MATRIX",
      data: {
        institute_code: "06283",
        college_name: "Previous college",
        branch_code: "0628419110",
        branch_name: "Civil Engineering",
        cap_seats: "10",
        autonomous: false,
        source_page: "720"
      }
    }],
    [{
      instituteCode: "06284",
      name: "Correct college",
      collegeType: "Un-Aided Autonomous",
      autonomous: true
    }]
  );

  assert.equal(result.repairs.length, 1);
  assert.equal(result.records[0].data.institute_code, "06284");
  assert.equal(result.records[0].data.college_name, "Correct college");
  assert.equal(result.records[0].data.autonomous, true);
  assert.equal(result.records[0].data.cap_seats, "10");
});

test("seat-matrix mismatches remain for review when the branch institute is unknown", () => {
  const record = {
    recordType: "SEAT_MATRIX",
    data: {
      institute_code: "06283",
      college_name: "Previous college",
      branch_code: "0999919110"
    }
  };
  const result = repairSeatMatrixInstituteMismatches([record], []);

  assert.equal(result.repairs.length, 0);
  assert.equal(result.records[0], record);
});

test("official branch variants keep multi-letter suffixes", () => {
  assert.equal(canonicalBranchCode("0303337293LK"), "0303337293LK");
});

test("unknown institutes are held for review", () => {
  const result = recordIssues({
    recordType: "CUTOFF",
    knownInstituteCodes: new Set(["16006"]),
    data: {
      institute_code: "99999",
      college_name: "Example College",
      branch_code: "9999924210",
      branch_name: "Computer Engineering",
      seat_type: "GOPENS",
      closing_score: "90.25",
      closing_rank: "12000",
      source_page: "1",
      review_reason: ""
    }
  });

  assert.deepEqual(result.issues, ["UNKNOWN_INSTITUTE_CODE"]);
});

test("a branch code from another institute is held for review", () => {
  const result = recordIssues({
    recordType: "CUTOFF",
    knownInstituteCodes: new Set(["06179", "06155"]),
    data: {
      institute_code: "06179",
      college_name: "Example College",
      branch_code: "0615524510",
      branch_name: "Computer Engineering",
      seat_type: "GOPENS",
      closing_score: "90.25",
      closing_rank: "12000",
      source_page: "1",
      review_reason: ""
    }
  });

  assert.deepEqual(result.issues, ["BRANCH_INSTITUTE_MISMATCH"]);
});

test("record correction accepts editable values and rejects an empty request", () => {
  assert.equal(adminRecordCorrectionSchema.safeParse({
    data: { institute_code: "16006", closing_score: "99.25" }
  }).success, true);
  assert.equal(adminRecordCorrectionSchema.safeParse({}).success, false);
});

test("record correction removes unsupported fields", () => {
  assert.deepEqual(
    sanitizeRecordCorrection("CUTOFF", {
      institute_code: "16006",
      closing_score: "99.25",
      publishedRecordId: "unsafe"
    }),
    {
      institute_code: "16006",
      closing_score: "99.25"
    }
  );
});

test("cutoff duplicate keys remain separate across institutes", () => {
  const shared = {
    academic_year: "2025-26",
    cap_round: "1",
    branch_name: "Computer Engineering",
    seat_type: "GOPENS",
    stage: "I",
    section: "STANDARD"
  };

  const first = stagedRecordKey("CUTOFF", {
    ...shared,
    institute_code: "06179",
    branch_code: "0617924510"
  });
  const second = stagedRecordKey("CUTOFF", {
    ...shared,
    institute_code: "06155",
    branch_code: "0615524510"
  });

  assert.notEqual(first, second);
});

test("both copies of an exact staged duplicate require review", () => {
  const data = {
    institute_code: "06179",
    college_name: "Example College",
    academic_year: "2025-26",
    cap_round: "1",
    branch_code: "0617924510",
    branch_name: "Computer Engineering",
    seat_type: "GOPENS",
    closing_score: "90.25",
    closing_rank: "12000",
    source_page: "1",
    stage: "I",
    section: "STANDARD"
  };
  const records = validateStagedRecords([
    { recordType: "CUTOFF", data },
    { recordType: "CUTOFF", data: { ...data } }
  ], new Set(["06179"]));

  assert.deepEqual(records[0].issues, ["DUPLICATE_IMPORT_KEY"]);
  assert.deepEqual(records[1].issues, ["DUPLICATE_IMPORT_KEY"]);
});
