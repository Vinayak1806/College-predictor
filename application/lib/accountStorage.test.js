import test from "node:test";
import assert from "node:assert/strict";
import {
  comparisonItemsForAccount,
  preferenceItemsForAccount,
  preferenceItemsFromAccount
} from "./accountStorage.js";

test("preference items keep useful labels and receive stable account order", () => {
  const items = preferenceItemsForAccount([
    {
      id: "16006:CE",
      instituteCode: "16006",
      collegeSlug: "16006-coep",
      college: "COEP Technological University",
      branchCode: "CE",
      branch: "Computer Engineering",
      city: "Pune",
      zone: "TARGET",
      cutoff: "99.25",
      margin: "0.40",
      seatType: "GOPENH",
      year: "2025-26",
      round: "2"
    }
  ]);

  assert.equal(items[0].order, 1);
  assert.equal(items[0].college, "COEP Technological University");
  assert.equal(items[0].cutoff, 99.25);
  assert.equal(items[0].round, 2);
});

test("account preference items restore in saved CAP order", () => {
  const restored = preferenceItemsFromAccount([
    { collegeBranchId: "second", id: "second", order: 2, college: "Second" },
    { collegeBranchId: "first", id: "first", order: 1, college: "First" }
  ]);

  assert.deepEqual(restored.map((item) => item.id), ["first", "second"]);
  assert.equal("order" in restored[0], false);
  assert.equal("collegeBranchId" in restored[0], false);
});

test("comparison account conversion separates FE and DSE and limits each route", () => {
  const items = [
    ...Array.from({ length: 4 }, (_, index) => ({
      admissionRoute: "FE",
      instituteCode: String(index + 1),
      college: `FE College ${index + 1}`,
      collegeSlug: `fe-${index + 1}`,
      branchCode: "CE",
      branch: "Computer Engineering"
    })),
    {
      admissionRoute: "DSE",
      instituteCode: "9",
      college: "DSE College",
      collegeSlug: "dse-9",
      branchCode: "CE",
      branch: "Computer Engineering"
    }
  ];

  const feItems = comparisonItemsForAccount(items, "FE");
  assert.equal(feItems.length, 3);
  assert.ok(feItems.every((item) => item.admissionRoute === "FE"));
});
