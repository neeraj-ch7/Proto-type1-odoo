const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');
const { query } = require('../config/db');
const { round2 } = require('../utils/money');

/**
 * GET /api/dashboard/summary
 * Query params: from, to, customer
 * Roles: admin, staff
 * Shape: {
 *   activeSubscriptions,
 *   revenueCollected,
 *   stillOwed,
 *   overdueCount,
 *   overdueAmount,
 *   invoicesByStatus: { draft, confirmed, paid, cancelled }
 * }
 */
router.get(
  '/summary',
  auth('admin', 'staff'),
  asyncHandler(async (req, res) => {
    const { from, to, customer } = req.query;

    const params = [];
    let p_from = null;
    let p_to = null;
    let p_cust = null;

    if (from) {
      params.push(new Date(from).toISOString());
      p_from = `$${params.length}`;
    }
    if (to) {
      params.push(new Date(to).toISOString());
      p_to = `$${params.length}`;
    }
    if (customer && customer.trim()) {
      params.push(customer.trim());
      p_cust = `$${params.length}`;
    }

    const payConds = [];
    if (p_from) payConds.push(`date >= ${p_from}`);
    if (p_to) payConds.push(`date <= ${p_to}`);
    if (p_cust) payConds.push(`customer_id = ${p_cust}`);
    const payWhere = payConds.length ? 'WHERE ' + payConds.join(' AND ') : '';

    const subConds = [`status = 'active'`];
    if (p_cust) subConds.push(`customer_id = ${p_cust}`);
    const subWhere = 'WHERE ' + subConds.join(' AND ');

    const invBaseConds = [];
    if (p_from) invBaseConds.push(`created_at >= ${p_from}`);
    if (p_to) invBaseConds.push(`created_at <= ${p_to}`);
    if (p_cust) invBaseConds.push(`customer_id = ${p_cust}`);
    const invBaseWhere = invBaseConds.length ? 'WHERE ' + invBaseConds.join(' AND ') : '';
    const invExtraAnd = invBaseConds.length ? ' AND ' + invBaseConds.join(' AND ') : '';

    // Execute aggregate in a SINGLE database roundtrip
    const resRow = await query(
      `SELECT
         (SELECT coalesce(sum(amount), 0) FROM payments ${payWhere}) as revenue,
         (SELECT count(*) FROM subscriptions ${subWhere}) as active_subscriptions,
         (SELECT coalesce(sum(total - amount_paid), 0) FROM invoices WHERE status = 'confirmed'${invExtraAnd}) as still_owed,
         (SELECT count(*) FROM invoices WHERE status = 'confirmed' AND due_date < now()${invExtraAnd}) as overdue_count,
         (SELECT coalesce(sum(total - amount_paid), 0) FROM invoices WHERE status = 'confirmed' AND due_date < now()${invExtraAnd}) as overdue_amount,
         (SELECT coalesce(json_object_agg(status, cnt), '{}'::json) FROM (
            SELECT status, count(*) as cnt FROM invoices ${invBaseWhere} GROUP BY status
          ) s) as status_counts`,
      params
    );

    const row = resRow.rows[0] || {};
    const statusCounts = row.status_counts || {};

    const invoicesByStatus = {
      draft: Number(statusCounts.draft || 0),
      confirmed: Number(statusCounts.confirmed || 0),
      paid: Number(statusCounts.paid || 0),
      cancelled: Number(statusCounts.cancelled || 0),
    };

    res.json({
      activeSubscriptions: Number(row.active_subscriptions || 0),
      revenueCollected: round2(row.revenue || 0),
      stillOwed: round2(row.still_owed || 0),
      overdueCount: Number(row.overdue_count || 0),
      overdueAmount: round2(row.overdue_amount || 0),
      invoicesByStatus,
    });
  })
);

/**
 * GET /api/dashboard/export
 * Query: from, to, customer, status
 * Roles: admin, staff
 * Returns CSV capped at 10,000 rows
 */
router.get(
  '/export',
  auth('admin', 'staff'),
  asyncHandler(async (req, res) => {
    const { from, to, customer, status } = req.query;

    const where = [];
    const p = [];

    if (from) {
      p.push(new Date(from).toISOString());
      where.push(`i.created_at >= $${p.length}`);
    }
    if (to) {
      p.push(new Date(to).toISOString());
      where.push(`i.created_at <= $${p.length}`);
    }
    if (customer && customer.trim()) {
      p.push(customer.trim());
      where.push(`i.customer_id = $${p.length}`);
    }
    if (status && status.trim()) {
      const s = status.trim().toLowerCase();
      if (s === 'overdue') {
        where.push(`i.status = 'confirmed' AND i.due_date < now()`);
      } else {
        p.push(s);
        where.push(`i.status = $${p.length}`);
      }
    }

    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const queryRes = await query(
      `SELECT
         i.number, u.name as customer_name, u.email as customer_email,
         i.period_start, i.period_end, i.status,
         i.subtotal, i.discount_amount, i.tax_amount, i.total, i.amount_paid,
         (i.total - i.amount_paid) as balance_due,
         i.due_date, i.issued_at, i.created_at
       FROM invoices i
       LEFT JOIN users u ON i.customer_id = u.id
       ${w}
       ORDER BY i.created_at DESC
       LIMIT 10000`,
      p
    );

    // Escape CSV cell
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'Invoice Number',
      'Customer Name',
      'Customer Email',
      'Period Start',
      'Period End',
      'Status',
      'Subtotal',
      'Discount',
      'Tax',
      'Total',
      'Amount Paid',
      'Still Owed',
      'Due Date',
      'Issued Date',
      'Created At',
    ];

    const lines = [headers.join(',')];

    for (const r of queryRes.rows) {
      lines.push(
        [
          escapeCsv(r.number),
          escapeCsv(r.customer_name),
          escapeCsv(r.customer_email),
          escapeCsv(r.period_start ? new Date(r.period_start).toISOString() : ''),
          escapeCsv(r.period_end ? new Date(r.period_end).toISOString() : ''),
          escapeCsv(r.status),
          escapeCsv(r.subtotal),
          escapeCsv(r.discount_amount),
          escapeCsv(r.tax_amount),
          escapeCsv(r.total),
          escapeCsv(r.amount_paid),
          escapeCsv(round2(Math.max(0, Number(r.balance_due || 0)))),
          escapeCsv(r.due_date ? new Date(r.due_date).toISOString() : ''),
          escapeCsv(r.issued_at ? new Date(r.issued_at).toISOString() : ''),
          escapeCsv(r.created_at ? new Date(r.created_at).toISOString() : ''),
        ].join(',')
      );
    }

    const csvContent = lines.join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices-export.csv"');
    res.status(200).send(csvContent);
  })
);

module.exports = router;
