export const zoneClass = {
  SAFE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  TARGET: "border-indigo-200 bg-indigo-50 text-indigo-700",
  AMBITIOUS: "border-amber-200 bg-amber-50 text-amber-700",
  HIGHLY_AMBITIOUS: "border-red-200 bg-red-50 text-red-700"
};

export const zoneBarClass = {
  SAFE: "bg-gradient-to-r from-emerald-500 to-teal-400",
  TARGET: "bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500",
  AMBITIOUS: "bg-gradient-to-r from-amber-500 to-orange-400",
  HIGHLY_AMBITIOUS: "bg-gradient-to-r from-red-500 to-rose-400"
};

export const zoneText = {
  SAFE: "Safe",
  TARGET: "Target",
  AMBITIOUS: "Ambitious",
  HIGHLY_AMBITIOUS: "Highly Ambitious"
};

export function hasResultValue(value) {
  return value !== null && value !== undefined && value !== "" && value !== "N/A";
}

export function formatResultNumber(value) {
  return Number(value).toFixed(2);
}

export function formatResultMoney(value) {
  return `Rs. ${Number(value).toLocaleString("en-IN")}`;
}
