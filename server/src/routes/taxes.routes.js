const router = require('express').Router();
const Tax = require('../models/Tax');
const { auth } = require('../middleware/auth');
const { asyncHandler, ApiError, validate } = require('../middleware/error');
const { parsePagination, paginated } = require('../utils/pagination');

// GET /api/taxes - Admin and Staff, paginated with search
router.get('/', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;
  const active = req.query.active !== undefined ? req.query.active : undefined;
  const sort = req.query.sort || 'desc';

  const { items, total } = await Tax.list({ search, active, limit, skip, sort });
  res.json(paginated(items, total, page, limit));
}));

// GET /api/taxes/:id - Admin and Staff
router.get('/:id', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const tax = await Tax.findById(req.params.id);
  if (!tax) throw new ApiError(404, 'Tax not found');
  res.json(tax);
}));

// POST /api/taxes - Admin only (Staff gets 403)
router.post('/', auth('admin'), validate(Tax.taxSchema), asyncHandler(async (req, res) => {
  const tax = await Tax.create(req.body);
  res.status(201).json(tax);
}));

// PUT/PATCH /api/taxes/:id - Admin only (Staff gets 403)
const updateHandler = asyncHandler(async (req, res) => {
  const tax = await Tax.update(req.params.id, req.body);
  if (!tax) throw new ApiError(404, 'Tax not found');
  res.json(tax);
});
router.put('/:id', auth('admin'), validate(Tax.taxUpdateSchema), updateHandler);
router.patch('/:id', auth('admin'), validate(Tax.taxUpdateSchema), updateHandler);

// DELETE /api/taxes/:id - Admin only (Staff gets 403)
router.delete('/:id', auth('admin'), asyncHandler(async (req, res) => {
  const success = await Tax.deleteById(req.params.id);
  if (!success) throw new ApiError(404, 'Tax not found');
  res.json({ message: 'Tax deleted successfully', id: req.params.id });
}));

module.exports = router;
