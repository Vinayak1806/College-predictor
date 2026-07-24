export function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 0) return [];

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "end-ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "start-ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "start-ellipsis", currentPage - 1, currentPage, currentPage + 1, "end-ellipsis", totalPages];
}

export function getPageRange(currentPage, pageSize, totalResults) {
  if (totalResults <= 0) return { start: 0, end: 0 };

  return {
    start: (currentPage - 1) * pageSize + 1,
    end: Math.min(currentPage * pageSize, totalResults)
  };
}
