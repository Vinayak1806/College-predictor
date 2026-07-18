const categoryNames = [
  ["SEBC", "SEBC"],
  ["OPEN", "OPEN"],
  ["OBC", "OBC"],
  ["NT1", "NT1"],
  ["NT2", "NT2"],
  ["NT3", "NT3"],
  ["SC", "SC"],
  ["ST", "ST"],
  ["VJ", "VJ"]
];

const universityNames = {
  H: "Home University",
  O: "Other Than Home University",
  S: "State Level"
};

const exactSeatTypes = {
  EWS: {
    label: "EWS - Economically Weaker Section seat",
    title: "Economically Weaker Section seat",
    note: "Special state-level seat for eligible EWS candidates."
  },
  TFWS: {
    label: "TFWS - Tuition Fee Waiver Scheme seat",
    title: "Tuition Fee Waiver Scheme seat",
    note: "Special state-level seat for eligible TFWS candidates."
  },
  ORPHAN: {
    label: "ORPHAN - Orphan candidate seat",
    title: "Orphan candidate seat",
    note: "Special state-level seat for eligible orphan candidates."
  }
};

export const seatTypeGroups = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "OPEN" },
  { value: "OBC", label: "OBC" },
  { value: "SC", label: "SC" },
  { value: "ST", label: "ST" },
  { value: "SEBC", label: "SEBC" },
  { value: "NT_VJ", label: "NT/VJ" },
  { value: "LADIES", label: "Ladies" },
  { value: "PWD", label: "PWD" },
  { value: "TFWS", label: "TFWS" },
  { value: "EWS", label: "EWS" },
  { value: "DEFENCE", label: "Defence" },
  { value: "ORPHAN", label: "Orphan" }
];

function findCategory(code) {
  return categoryNames.find(([shortCode]) => code.includes(shortCode))?.[1] || "Category";
}

function findUniversityType(code) {
  const lastLetter = code.slice(-1);
  return universityNames[lastLetter] || "State/Institute quota";
}

function findSeatGroup(code) {
  if (code.startsWith("L")) return "Ladies";
  if (code.startsWith("G")) return "General";
  if (code.startsWith("PWD")) return "PWD";
  if (code.startsWith("DEF")) return "Defence";
  return "Special";
}

export function matchesSeatGroup(code, group) {
  const cleanCode = String(code || "").trim().toUpperCase();

  if (group === "ALL") return true;
  if (group === "TFWS") return cleanCode === "TFWS";
  if (group === "EWS") return cleanCode === "EWS";
  if (group === "ORPHAN") return cleanCode === "ORPHAN";
  if (group === "PWD") return cleanCode.startsWith("PWD");
  if (group === "DEFENCE") return cleanCode.startsWith("DEF");
  if (group === "LADIES") return cleanCode.startsWith("L");
  if (group === "NT_VJ") return cleanCode.includes("NT") || cleanCode.includes("VJ");

  return cleanCode.includes(group);
}

export function explainSeatType(code) {
  if (!code) {
    return {
      code: "N/A",
      label: "N/A",
      title: "Seat type not available",
      note: "This cutoff record does not have a seat type."
    };
  }

  const cleanCode = String(code).trim().toUpperCase();

  if (exactSeatTypes[cleanCode]) {
    return {
      code: cleanCode,
      ...exactSeatTypes[cleanCode]
    };
  }

  const category = findCategory(cleanCode);
  const group = findSeatGroup(cleanCode);
  const universityType = findUniversityType(cleanCode);
  const title = `${category} ${group} ${universityType} seat`;

  return {
    code: cleanCode,
    label: `${cleanCode} - ${title}`,
    title,
    note: `This cutoff is for ${category} category, ${group} seat group, ${universityType}.`
  };
}
