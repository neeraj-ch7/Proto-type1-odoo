const router = require('express').Router();
const Invoice = require('../models/Invoice');
const { auth } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/error');
const { parsePagination, paginated } = require('../utils/pagination');

// GET /api/invoices - Admin & Staff
router.get('/', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const status = typeof req.query.status === 'string' && req.query.status.trim() ? req.query.status.trim() : undefined;
  const customer = typeof req.query.customer === 'string' && req.query.customer.trim() ? req.query.customer.trim() : undefined;
  const subscriptionId = typeof req.query.subscription === 'string' && req.query.subscription.trim() ? req.query.subscription.trim() : req.query.subscriptionId;
  const from = req.query.from;
  const to = req.query.to;
  const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;
  const sort = req.query.sort || 'desc';

  const { items, total } = await Invoice.list({
    status,
    customer,
    subscriptionId,
    from,
    to,
    search,
    limit,
    skip,
    sort,
  });

  res.json(paginated(items, total, page, limit));
}));

// GET /api/invoices/:id - Admin & Staff
router.get('/:id', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new ApiError(404, 'Invoice not found');
  res.json(invoice);
}));

// PATCH /api/invoices/:id/confirm - Admin & Staff
router.patch('/:id/confirm', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  try {
    const invoice = await Invoice.confirm(req.params.id);
    res.json(invoice);
  } catch (err) {
    if (err.status) {
      throw new ApiError(err.status, err.message);
    }
    throw err;
  }
}));

// PATCH /api/invoices/:id/cancel - Admin & Staff
router.patch('/:id/cancel', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  try {
    const invoice = await Invoice.cancel(req.params.id);
    res.json(invoice);
  } catch (err) {
    if (err.status) {
      throw new ApiError(err.status, err.message);
    }
    throw err;
  }
}));

// PATCH /api/invoices/:id/send - Admin & Staff
router.patch('/:id/send', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  try {
    const invoice = await Invoice.send(req.params.id);
    res.json(invoice);
  } catch (err) {
    if (err.status) {
      throw new ApiError(err.status, err.message);
    }
    throw err;
  }
}));

module.exports = router;
