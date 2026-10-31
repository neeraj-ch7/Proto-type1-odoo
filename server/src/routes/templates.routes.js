const router = require('express').Router();
const QuotationTemplate = require('../models/QuotationTemplate');
const { auth } = require('../middleware/auth');
const { asyncHandler, ApiError, validate } = require('../middleware/error');
const { parsePagination, paginated } = require('../utils/pagination');

// GET /api/templates - Admin and Staff, paginated with search
router.get('/', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;
  const sort = req.query.sort || 'desc';

  const { items, total } = await QuotationTemplate.list({ search, limit, skip, sort });
  res.json(paginated(items, total, page, limit));
}));

// GET /api/templates/:id - Admin and Staff
router.get('/:id', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const template = await QuotationTemplate.findById(req.params.id);
  if (!template) throw new ApiError(404, 'Template not found');
  res.json(template);
}));

// POST /api/templates - Admin only (Staff gets 403)
router.post('/', auth('admin'), validate(QuotationTemplate.quotationTemplateSchema), asyncHandler(async (req, res) => {
  const template = await QuotationTemplate.create(req.body);
  res.status(201).json(template);
}));

// PUT/PATCH /api/templates/:id - Admin only (Staff gets 403)
const updateHandler = asyncHandler(async (req, res) => {
  const template = await QuotationTemplate.update(req.params.id, req.body);
  if (!template) throw new ApiError(404, 'Template not found');
  res.json(template);
});
router.put('/:id', auth('admin'), validate(QuotationTemplate.quotationTemplateUpdateSchema), updateHandler);
router.patch('/:id', auth('admin'), validate(QuotationTemplate.quotationTemplateUpdateSchema), updateHandler);

// DELETE /api/templates/:id - Admin only (Staff gets 403)
router.delete('/:id', auth('admin'), asyncHandler(async (req, res) => {
  const success = await QuotationTemplate.deleteById(req.params.id);
  if (!success) throw new ApiError(404, 'Template not found');
  res.json({ message: 'Template deleted successfully', id: req.params.id });
}));

module.exports = router;
