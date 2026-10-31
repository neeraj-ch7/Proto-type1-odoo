const parsePagination = (q = {}) => {
  const page = Math.max(parseInt(q.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};
const paginated = (items, total, page, limit) => ({ items, page, limit, total, totalPages: Math.ceil(total / limit) || 1 });
module.exports = { parsePagination, paginated };
