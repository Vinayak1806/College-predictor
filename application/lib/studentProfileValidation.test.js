import test from "node:test";
import assert from "node:assert/strict";
import { predictionHistorySchema, studentProfileSchema } from "./studentProfileValidation.js";

const feForm = {
  percentile: "89.20",
  academicYear: "",
  capRound: "",
  category: "OBC",
  gender: "MALE",
  homeUniversity: "Savitribai Phule Pune University",
  branches: ["Computer"],
  cities: ["Pune"],
  collegeTypes: [],
  autonomousOnly: false,
  tfws: false,
  pwd: false,
  defence: false,
  ews: false
};

const dseForm = {
  diplomaPercentage: "89.20",
  meritNumber: "",
  diplomaBranch: "Computer Engineering",
  academicYear: "",
  capRound: "",
  category: "OBC",
  gender: "MALE",
  branches: ["Computer Engineering"],
  cities: ["Pune"],
  universities: ["Savitribai Phule Pune University"],
  collegeTypes: [],
  autonomousOnly: false,
  ews: false,
  pwd: false,
  defence: false
};

test("accepts a bounded FE student profile", () => {
  assert.equal(studentProfileSchema.safeParse({
    name: "Computer in Pune",
    admissionRoute: "FE",
    formData: feForm
  }).success, true);
});

test("rejects unknown fields in saved predictor forms", () => {
  assert.equal(studentProfileSchema.safeParse({
    name: "Unsafe profile",
    admissionRoute: "FE",
    formData: { ...feForm, arbitraryData: "not allowed" }
  }).success, false);
});

test("accepts compact successful prediction history", () => {
  assert.equal(predictionHistorySchema.safeParse({
    admissionRoute: "FE",
    formData: feForm,
    resultCount: 25,
    zoneCounts: { TARGET: 10, SAFE: 5 }
  }).success, true);
});

test("accepts a DSE profile with preferred universities", () => {
  assert.equal(predictionHistorySchema.safeParse({
    admissionRoute: "DSE",
    formData: dseForm,
    resultCount: 12,
    zoneCounts: { TARGET: 6 }
  }).success, true);
});
