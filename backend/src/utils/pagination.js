export function getPaging(query, defaultLimit = 20) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export const paged = (items, total, { page, limit }) => ({
  items,
  total,
  page,
  limit,
  pages: Math.max(1, Math.ceil(total / limit)),
});

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
