const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/error');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const { parsePagination, paginated } = require('../utils/pagination');

/**
 * All /api/me routes are strictly scoped to the logged-in customer.
 * req.user.id is mandatory.
 */

/**
 * GET /api/me/subscriptions
 * Scoped to req.user.id
 */
router.get(
  '/subscriptions',
  auth('customer'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { status, search } = req.query;

    const result = await Subscription.list({
      customer: String(req.user.id),
      status,
      search,
      limit,
      skip,
    });

    res.json(paginated(result.items, result.total, page, limit));
  })
);

/**
 * GET /api/me/invoices
 * Scoped to req.user.id
 */
router.get(
  '/invoices',
  auth('customer'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { status, search, from, to } = req.query;

    const result = await Invoice.list({
      customer: String(req.user.id),
      status,
      search,
      from,
      to,
      limit,
      skip,
    });

    res.json(paginated(result.items, result.total, page, limit));
  })
);

/**
 * GET /api/me/invoices/:id
 * Scoped to req.user.id. Another customer's invoice returns 404.
 */
router.get(
  '/invoices/:id',
  auth('customer'),
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      throw new ApiError(404, 'Invoice not found');
    }

    const invoiceCustomerId =
      typeof invoice.customer === 'object' && invoice.customer !== null
        ? invoice.customer.id || invoice.customer._id
        : invoice.customer || invoice.customerId;

    if (String(invoiceCustomerId) !== String(req.user.id)) {
      throw new ApiError(404, 'Invoice not found');
    }

    res.json(invoice);
  })
);

module.exports = router;
