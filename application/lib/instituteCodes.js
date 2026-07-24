export const CURRENT_INSTITUTE_CODE_ALIASES = {
  "04005": "14005",
  "06006": "16006"
};

export function normalizeInstituteCode(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? digits.padStart(5, "0") : null;
}

export function currentInstituteCode(value) {
  const code = normalizeInstituteCode(value);
  return code ? (CURRENT_INSTITUTE_CODE_ALIASES[code] || code) : null;
}

export function currentInstituteCodeSearch(value) {
  const text = String(value || "").trim();
  return /^\d{1,5}$/.test(text) ? currentInstituteCode(text) : null;
}
