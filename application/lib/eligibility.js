const suffixByUniversity = {
  HOME: ["H", "S"],
  OTHER: ["O", "S"],
  STATE: ["S"]
};

export function eligibleSeatTypes(input) {
  const category = input.category.toUpperCase();
  const categories = new Set(["OPEN", category]);
  const prefixes = input.gender === "FEMALE" ? ["G", "L"] : ["G"];
  const suffixes = suffixByUniversity[input.universityType];
  const seatTypes = new Set();

  for (const prefix of prefixes) {
    for (const cat of categories) {
      for (const suffix of suffixes) {
        seatTypes.add(`${prefix}${cat}${suffix}`);
      }
    }
  }

  if (input.tfws) seatTypes.add("TFWS");
  if (input.ews) seatTypes.add("EWS");
  if (input.pwd) {
    for (const suffix of suffixes) seatTypes.add(`PWDOPEN${suffix}`);
  }
  if (input.defence) {
    for (const suffix of suffixes) seatTypes.add(`DEFOPEN${suffix}`);
  }

  return Array.from(seatTypes);
}

export function eligibleSeatTypesAcrossUniversities(input) {
  return [...new Set([
    ...eligibleSeatTypes({ ...input, universityType: "HOME" }),
    ...eligibleSeatTypes({ ...input, universityType: "OTHER" })
  ])];
}

export function universityEligibilityForCollege(homeUniversity, collegeUniversity) {
  if (!homeUniversity || !collegeUniversity) return "STATE";

  const normalize = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalize(homeUniversity) === normalize(collegeUniversity) ? "HOME" : "OTHER";
}

export function eligibleSeatTypesForCollege(input, collegeUniversity) {
  const universityType = universityEligibilityForCollege(input.homeUniversity, collegeUniversity);
  return eligibleSeatTypes({ ...input, universityType });
}
