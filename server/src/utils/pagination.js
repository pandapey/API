function getPagination(query, defaults = {}) {
  const defLimit = defaults.limit || 20;
  const maxLimit = defaults.maxLimit || 100;
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defLimit;
  if (limit > maxLimit) limit = maxLimit;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildPaginatedResponse(items, total, page, limit) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

module.exports = { getPagination, buildPaginatedResponse };
