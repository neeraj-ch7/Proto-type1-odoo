const router = require('express').Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/error');
const { parsePagination, paginated } = require('../utils/pagination');

// Responses never contain password_hash / reset_* (the model only selects public columns).
router.get('/', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const role = ['admin', 'staff', 'customer'].includes(req.query.role) ? req.query.role : undefined;
  const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;
  const { items, total } = await User.list({ role, search, limit, skip });
  res.json(paginated(items.map(User.toApi), total, page, limit));
}));
router.get('/:id', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const u = await User.findById(req.params.id); // invalid uuid -> 400 via error handler
  if (!u) throw new ApiError(404, 'User not found');
  res.json(User.toApi(u));
}));
module.exports = router;