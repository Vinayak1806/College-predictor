export const zoneClass = {
  SAFE: "border-success bg-emerald-50 text-success",
  TARGET: "border-action bg-cyan-50 text-action",
  AMBITIOUS: "border-warning bg-amber-50 text-warning",
  HIGHLY_AMBITIOUS: "border-danger bg-red-50 text-danger"
};

export const zoneBarClass = {
  SAFE: "bg-success",
  TARGET: "bg-action",
  AMBITIOUS: "bg-warning",
  HIGHLY_AMBITIOUS: "bg-danger"
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
