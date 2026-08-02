function text(value, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function preferenceItemsForAccount(items) {
  return items.slice(0, 200).map((item, index) => ({
    collegeBranchId: text(item.id || `${item.instituteCode}:${item.branchCode}`),
    id: text(item.id || `${item.instituteCode}:${item.branchCode}`),
    instituteCode: text(item.instituteCode),
    collegeSlug: text(item.collegeSlug),
    college: text(item.college),
    branchCode: text(item.branchCode),
    branch: text(item.branch),
    city: text(item.city),
    zone: item.zone,
    order: index + 1,
    cutoff: finiteNumber(item.cutoff),
    margin: finiteNumber(item.margin),
    seatType: text(item.seatType),
    year: text(item.year),
    round: finiteNumber(item.round),
    source: text(item.source, "MANUAL"),
    addedAt: text(item.addedAt)
  }));
}

export function preferenceItemsFromAccount(items) {
  return [...items]
    .sort((left, right) => left.order - right.order)
    .map(({ collegeBranchId, order, ...item }) => ({
      ...item,
      id: item.id || collegeBranchId
    }));
}

export function comparisonItemsForAccount(items, route) {
  return items
    .filter((item) => item.admissionRoute === route)
    .slice(0, 3)
    .map((item) => ({
      admissionRoute: route,
      instituteCode: text(item.instituteCode),
      college: text(item.college),
      collegeSlug: text(item.collegeSlug),
      branchCode: text(item.branchCode),
      branch: text(item.branch),
      prediction: item.prediction || null
    }));
}

export async function saveCapListToAccount(items) {
  const response = await fetch("/api/preference-lists", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "My CAP Preference List",
      items: preferenceItemsForAccount(items)
    })
  });
  const payload = await response.json();
  return { response, payload };
}

export async function saveComparisonToAccount(items, route) {
  const routeItems = comparisonItemsForAccount(items, route);
  if (routeItems.length < 2) return { response: null, payload: null };

  const response = await fetch("/api/saved-comparisons", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: `${route} College Comparison`,
      items: routeItems
    })
  });
  const payload = await response.json();
  return { response, payload };
}
