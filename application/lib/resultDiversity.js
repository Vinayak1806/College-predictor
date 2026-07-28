import { compareUsefulResults } from "./prediction.js";

export const resultModes = [
  {
    value: "BEST_BRANCH_PER_COLLEGE",
    label: "Best branch per college"
  },
  {
    value: "BEST_COLLEGES_FIRST",
    label: "Best colleges first"
  },
  {
    value: "ALL_MATCHING_BRANCHES",
    label: "All matching branches"
  }
];

function groupByCollege(results) {
  const groups = new Map();

  for (const result of results) {
    const key = result.instituteCode || result.collegeSlug || result.college;
    const group = groups.get(key) || [];
    group.push(result);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => [...group].sort(compareUsefulResults));
}

function compareCollegeGroups(a, b) {
  const strengthDifference = (b[0]?.strengthIndex ?? -1) - (a[0]?.strengthIndex ?? -1);
  if (strengthDifference !== 0) return strengthDifference;
  return compareUsefulResults(a[0], b[0]);
}

function roundRobin(groups) {
  const ordered = [];
  const longestGroup = Math.max(0, ...groups.map((group) => group.length));

  for (let branchIndex = 0; branchIndex < longestGroup; branchIndex += 1) {
    for (const group of groups) {
      if (group[branchIndex]) ordered.push(group[branchIndex]);
    }
  }

  return ordered;
}

export function applyResultMode(results, mode) {
  const sortedResults = [...results].sort(compareUsefulResults);
  const groups = groupByCollege(sortedResults);

  if (mode === "BEST_BRANCH_PER_COLLEGE") {
    return groups.map((group) => group[0]).sort(compareUsefulResults);
  }

  if (mode === "BEST_COLLEGES_FIRST") {
    const collegeGroups = groups.sort(compareCollegeGroups).map((group) => group.slice(0, 2));
    return roundRobin(collegeGroups);
  }

  return roundRobin(groups);
}
