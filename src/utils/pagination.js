'use strict';

/**
 * Build pagination metadata from total count and query params
 */
function paginate(total, page, limit) {
  const pages = Math.ceil(total / limit);
  return {
    total,
    page: Number(page),
    limit: Number(limit),
    pages,
    hasNext: Number(page) < pages,
    hasPrev: Number(page) > 1,
  };
}

/**
 * Parse page/limit from query string with defaults and caps
 */
function parsePagination(query, defaultLimit = 10, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

module.exports = { paginate, parsePagination };
