import assert from "node:assert/strict";
import test from "node:test";
import {
  activeCollegeWhere,
  historicalDatasetWhere,
  publishedCutoffWhere,
  publishedDatasetWhere
} from "./publishedData.js";

test("published dataset filters include both legacy and admin-approved datasets", () => {
  assert.deepEqual(publishedDatasetWhere("FE", "2026-27"), {
    status: { in: ["VERIFIED", "PUBLISHED"] },
    predictionEnabled: true,
    admissionRoute: "FE",
    academicYear: "2026-27"
  });
});

test("published cutoff filters exclude records that still need review", () => {
  assert.deepEqual(publishedCutoffWhere("DSE", "2025-26"), {
    needsReview: false,
    dataset: {
      status: { in: ["VERIFIED", "PUBLISHED"] },
      predictionEnabled: true,
      admissionRoute: "DSE",
      academicYear: "2025-26"
    }
  });
});

test("active colleges are derived from published route cutoffs, not profile spreadsheets", () => {
  assert.deepEqual(activeCollegeWhere("FE", "2026-27"), {
    AND: [
      { routeArchives: { none: { admissionRoute: "FE" } } },
      {
        collegeBranches: {
          some: {
            cutoffs: {
              some: {
                needsReview: false,
                dataset: {
                  status: { in: ["VERIFIED", "PUBLISHED"] },
                  predictionEnabled: true,
                  admissionRoute: "FE",
                  academicYear: "2026-27"
                }
              }
            }
          }
        }
      }
    ]
  });
});

test("historical filters retain archived prediction datasets for analysis", () => {
  assert.deepEqual(historicalDatasetWhere("FE", "2024-25"), {
    status: { in: ["VERIFIED", "PUBLISHED"] },
    historyEnabled: true,
    admissionRoute: "FE",
    academicYear: "2024-25"
  });
});
