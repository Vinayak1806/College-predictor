import assert from "node:assert/strict";
import test from "node:test";
import {
  adminImportMetadataSchema,
  adminRecordCorrectionSchema,
  canonicalBranchCode,
  recordIssues,
  sanitizeRecordCorrection
} from "./adminImportValidation.js";

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
      review_reason: ""
    }
  });

  assert.deepEqual(result.issues, ["UNKNOWN_INSTITUTE_CODE"]);
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
