import test from "node:test";
import assert from "node:assert/strict";
import { groupCutoffRowsByCollegeBranch } from "./cutoffGroups.js";

function row(instituteCode, branchCode, displayName, year) {
  return {
    dataset: { academicYear: year },
    collegeBranch: {
      college: { instituteCode },
      branch: { branchCode, displayName }
    }
  };
}

test("groups historical rows by normalized institute and branch name", () => {
  const rows = [
    row("06179", "0617924510", "Computer Engineering", "2024-25"),
    row("6179", "0617924511", " Computer Engineering ", "2025-26"),
    row("06179", "0617924610", "Information Technology", "2025-26")
  ];

  const groups = groupCutoffRowsByCollegeBranch(rows);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].map((item) => item.dataset.academicYear), ["2024-25", "2025-26"]);
});

test("can keep DSE branch codes separate", () => {
  const rows = [
    row("06179", "0617924510", "Computer Engineering", "2025-26"),
    row("06179", "0617924511", "Computer Engineering", "2025-26")
  ];

  assert.equal(groupCutoffRowsByCollegeBranch(rows, { branchIdentity: "code" }).length, 2);
});
