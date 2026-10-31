const router = require('express').Router();
const Subscription = require('../models/Subscription');
const QuotationTemplate = require('../models/QuotationTemplate');
const { auth } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/error');
const { parsePagination, paginated } = require('../utils/pagination');

// GET /api/subscriptions - Admin & Staff
router.get('/', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const status = typeof req.query.status === 'string' && req.query.status.trim() ? req.query.status.trim() : undefined;
  const customer = typeof req.query.customer === 'string' && req.query.customer.trim() ? req.query.customer.trim() : undefined;
  const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;
  const sort = req.query.sort || 'desc';

  const { items, total } = await Subscription.list({ status, customer, search, limit, skip, sort });
  res.json(paginated(items, total, page, limit));
}));

// GET /api/subscriptions/:id - Admin & Staff
router.get('/:id', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const subscription = await Subscription.findById(req.params.id);
  if (!subscription) throw new ApiError(404, 'Subscription not found');
  res.json(subscription);
}));

// POST /api/subscriptions - Admin & Staff
router.post('/', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  try {
    const subscription = await Subscription.create(req.body);
    res.status(201).json(subscription);
  } catch (err) {
    if (err.status) {
      throw new ApiError(err.status, err.message);
    }
    throw err;
  }
}));

// PATCH /api/subscriptions/:id/status - Admin & Staff
router.patch('/:id/status', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status || typeof status !== 'string') {
    throw new ApiError(400, 'Status is required');
  }

  try {
    const subscription = await Subscription.updateStatus(req.params.id, status.trim().toLowerCase());
    res.json(subscription);
  } catch (err) {
    if (err.status) {
      throw new ApiError(err.status, err.message);
    }
    throw err;
  }
}));

// POST /api/subscriptions/from-template/:templateId - Admin & Staff
router.post('/from-template/:templateId', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const template = await QuotationTemplate.findById(req.params.templateId);
  if (!template) {
    throw new ApiError(404, 'Quotation template not found');
  }

  const { customer, startDate } = req.body;
  if (!customer) {
    throw new ApiError(400, 'Customer ID is required');
  }

  const start = startDate ? new Date(startDate) : new Date();
  if (isNaN(start.getTime())) {
    throw new ApiError(400, 'Invalid startDate');
  }

  const validityDays = Number(template.validityDays || 30);
  const quotationValidUntil = new Date(start.getTime() + validityDays * 24 * 60 * 60 * 1000);

  const lines = (template.lines || []).map((l) => ({
    product: l.product,
    variantValue: l.variantValue || null,
    quantity: Number(l.quantity || 1),
  }));

  try {
    const subscription = await Subscription.create({
      customer,
      plan: template.planId || template.plan,
      startDate: start,
      quotationValidUntil,
      status: 'draft',
      lines,
      notes: `Created from quotation template: ${template.name}`,
    });

    res.status(201).json(subscription);
  } catch (err) {
    if (err.status) {
      throw new ApiError(err.status, err.message);
    }
    throw err;
  }
}));

module.exports = router;
