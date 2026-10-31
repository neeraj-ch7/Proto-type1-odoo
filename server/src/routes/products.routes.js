const router = require('express').Router();
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const { asyncHandler, ApiError, validate } = require('../middleware/error');
const { parsePagination, paginated } = require('../utils/pagination');

// GET /api/products - Admin and Staff, paginated with search
router.get('/', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;
  const active = req.query.active !== undefined ? req.query.active : undefined;
  const sort = req.query.sort || 'desc';

  const { items, total } = await Product.list({ search, active, limit, skip, sort });
  res.json(paginated(items, total, page, limit));
}));

// GET /api/products/:id - Admin and Staff
router.get('/:id', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(product);
}));

// POST /api/products - Admin only (Staff gets 403)
router.post('/', auth('admin'), validate(Product.productSchema), asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
}));

// PUT/PATCH /api/products/:id - Admin only (Staff gets 403)
const updateHandler = asyncHandler(async (req, res) => {
  const product = await Product.update(req.params.id, req.body);
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(product);
});
router.put('/:id', auth('admin'), validate(Product.productUpdateSchema), updateHandler);
router.patch('/:id', auth('admin'), validate(Product.productUpdateSchema), updateHandler);

// DELETE /api/products/:id - Admin only (Staff gets 403)
router.delete('/:id', auth('admin'), asyncHandler(async (req, res) => {
  const success = await Product.deleteById(req.params.id);
  if (!success) throw new ApiError(404, 'Product not found');
  res.json({ message: 'Product deleted successfully', id: req.params.id });
}));

module.exports = router;
