const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');
const Payment = require('../models/Payment');
const { parsePagination, paginated } = require('../utils/pagination');

/**
 * POST /api/payments
 * Body: { invoice, method, amount, date, note }
 * Role: admin, staff
 */
router.post(
  '/payments',
  auth('admin', 'staff'),
  asyncHandler(async (req, res) => {
    const { invoice, method, amount, date, note } = req.body;
    const payment = await Payment.recordPayment({
      invoiceId: invoice,
      method,
      amount,
      date,
      note,
      recordedBy: req.user?.id,
    });
    res.status(201).json(payment);
  })
);

/**
 * GET /api/payments
 * Query: page, limit, method, from, to, search, customer, invoiceId
 * Role: admin, staff
 */
router.get(
  '/payments',
  auth('admin', 'staff'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { method, from, to, customer, invoiceId, search } = req.query;

    const result = await Payment.list({
      method,
      from,
      to,
      customer,
      invoiceId,
      search,
      limit,
      skip,
    });

    res.json(paginated(result.items, result.total, page, limit));
  })
);

/**
 * GET /api/invoices/:id/payments
 * Role: admin, staff, or customer who owns the invoice
 */
router.get(
  '/invoices/:id/payments',
  auth(),
  asyncHandler(async (req, res) => {
    const payments = await Payment.findByInvoiceId(req.params.id);
    if (req.user.role === 'customer') {
      const filtered = payments.filter(
        (p) => String(p.customerId) === String(req.user.id)
      );
      return res.json({ items: filtered });
    }
    res.json({ items: payments });
  })
);

module.exports = router;
