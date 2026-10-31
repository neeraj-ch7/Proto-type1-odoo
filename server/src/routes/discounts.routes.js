const router = require('express').Router();
const Discount = require('../models/Discount');
const { auth } = require('../middleware/auth');
const { asyncHandler, ApiError, validate } = require('../middleware/error');
const { parsePagination, paginated } = require('../utils/pagination');

// GET /api/discounts - Admin and Staff, paginated with search
router.get('/', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;
  const active = req.query.active !== undefined ? req.query.active : undefined;
  const appliesTo = typeof req.query.appliesTo === 'string' && req.query.appliesTo.trim() ? req.query.appliesTo.trim() : undefined;
  const sort = req.query.sort || 'desc';

  const { items, total } = await Discount.list({ search, active, appliesTo, limit, skip, sort });
  res.json(paginated(items, total, page, limit));
}));

// GET /api/discounts/:id - Admin and Staff
router.get('/:id', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const discount = await Discount.findById(req.params.id);
  if (!discount) throw new ApiError(404, 'Discount not found');
  res.json(discount);
}));

// POST /api/discounts - Admin only (Staff gets 403)
router.post('/', auth('admin'), validate(Discount.discountSchema), asyncHandler(async (req, res) => {
  const discount = await Discount.create(req.body);
  res.status(201).json(discount);
}));

// PUT/PATCH /api/discounts/:id - Admin only (Staff gets 403)
const updateHandler = asyncHandler(async (req, res) => {
  const discount = await Discount.update(req.params.id, req.body);
  if (!discount) throw new ApiError(404, 'Discount not found');
  res.json(discount);
});
router.put('/:id', auth('admin'), validate(Discount.discountUpdateSchema), updateHandler);
router.patch('/:id', auth('admin'), validate(Discount.discountUpdateSchema), updateHandler);

// DELETE /api/discounts/:id - Admin only (Staff gets 403)
router.delete('/:id', auth('admin'), asyncHandler(async (req, res) => {
  const success = await Discount.deleteById(req.params.id);
  if (!success) throw new ApiError(404, 'Discount not found');
  res.json({ message: 'Discount deleted successfully', id: req.params.id });
}));

module.exports = router;
