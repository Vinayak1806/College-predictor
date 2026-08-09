function normalizedInstituteCode(value) {
  const text = String(value || "");
  return text.replace(/^0+/, "") || text;
}

export function groupCutoffRowsByCollegeBranch(rows, { branchIdentity = "name" } = {}) {
  const groups = new Map();

  for (const row of rows) {
    const college = row.collegeBranch.college;
    const branch = row.collegeBranch.branch;
    const instituteCode = normalizedInstituteCode(college.instituteCode);
    const branchKey = branchIdentity === "code"
      ? String(branch.branchCode || "").trim().toUpperCase()
      : String(branch.displayName || "").trim().toLowerCase();
    const key = `${instituteCode}:${branchKey}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }

  return [...groups.values()];
}
