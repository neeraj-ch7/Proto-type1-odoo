const { query, tx } = require('../config/db');
const { z } = require('zod');
const { round2, add, mul } = require('../utils/money');
const { nextNumber } = require('../utils/sequence');
const Plan = require('./Plan');
const Product = require('./Product');
const Tax = require('./Tax');
const pricing = require('../services/pricing.service');

const dateCoerce = z.union([z.string().datetime(), z.string().date(), z.date()]).nullable().optional();

const lineSchema = z.object({
  product: z.string().min(1, 'Product ID is required'),
  variantValue: z.string().nullable().optional(),
  description: z.string().optional().default(''),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  unitPrice: z.number().nonnegative().optional(),
  tax: z.string().nullable().optional(),
  taxRate: z.number().nonnegative().optional(),
  amount: z.number().nonnegative().optional(),
});

const subscriptionCreateSchema = z.object({
  customer: z.string().min(1, 'Customer ID is required'),
  plan: z.string().min(1, 'Plan ID is required'),
  startDate: z.union([z.string().datetime(), z.string().date(), z.date()]),
  expiryDate: dateCoerce,
  paymentTerms: z.number().int().nonnegative().optional().default(15),
  status: z.enum(['draft', 'quotation', 'confirmed', 'active', 'closed']).optional().default('draft'),
  quotationValidUntil: dateCoerce,
  notes: z.string().optional().default(''),
  lines: z.array(lineSchema).min(1, 'At least one line is required'),
});

const escLike = (s) => s.replace(/[\\%_]/g, '\\$&');

const toApi = (r) => {
  if (!r) return null;
  const rawLines = Array.isArray(r.lines)
    ? r.lines
    : typeof r.lines === 'string'
    ? JSON.parse(r.lines)
    : [];

  return {
    _id: r.id,
    id: r.id,
    number: r.number,
    customer: r.customer_name || r.customer_email ? {
      _id: r.customer_id,
      id: r.customer_id,
      name: r.customer_name || null,
      email: r.customer_email || null,
    } : r.customer_id,
    customerId: r.customer_id,
    plan: r.plan_name ? {
      _id: r.plan_id,
      id: r.plan_id,
      name: r.plan_name,
      billingPeriod: r.plan_billing_period,
      price: r.plan_price != null ? Number(r.plan_price) : undefined,
    } : r.plan_id,
    planId: r.plan_id,
    startDate: r.start_date,
    expiryDate: r.expiry_date,
    paymentTerms: r.payment_terms != null ? Number(r.payment_terms) : 15,
    status: r.status,
    nextInvoiceDate: r.next_invoice_date,
    quotationValidUntil: r.quotation_valid_until,
    notes: r.notes || '',
    lines: rawLines.map((l) => ({
      product: l.product,
      productId: l.product?.id || l.product?._id || l.product,
      variantValue: l.variantValue || null,
      description: l.description || '',
      quantity: Number(l.quantity || 1),
      unitPrice: Number(l.unitPrice || 0),
      tax: l.tax || null,
      taxRate: Number(l.taxRate || 0),
      amount: Number(l.amount || 0),
    })),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

const SELECT_FIELDS = `
  s.id, s.number, s.customer_id, s.plan_id, s.start_date, s.expiry_date,
  s.payment_terms, s.status, s.next_invoice_date, s.quotation_valid_until,
  s.notes, s.lines, s.created_at, s.updated_at,
  u.name as customer_name, u.email as customer_email,
  p.name as plan_name, p.billing_period as plan_billing_period, p.price as plan_price
`;

const findById = async (id) => {
  const res = await query(
    `SELECT ${SELECT_FIELDS}
     FROM subscriptions s
     LEFT JOIN users u ON s.customer_id = u.id
     LEFT JOIN plans p ON s.plan_id = p.id
     WHERE s.id = $1`,
    [id]
  );
  return toApi(res.rows[0]);
};

const findByNumber = async (number) => {
  const res = await query(
    `SELECT ${SELECT_FIELDS}
     FROM subscriptions s
     LEFT JOIN users u ON s.customer_id = u.id
     LEFT JOIN plans p ON s.plan_id = p.id
     WHERE s.number = $1`,
    [number]
  );
  return toApi(res.rows[0]);
};

/**
 * Snapshot lines helper: fetches products and taxes, calculates amounts.
 */
const buildSnapshotLines = async (lines) => {
  const snapshotLines = [];
  for (const line of lines) {
    const prodId = line.product?.id || line.product?._id || line.product;
    const prod = await Product.findById(prodId);
    if (!prod) {
      throw new Error(`Product not found: ${prodId}`);
    }

    const unitPrice = line.unitPrice !== undefined
      ? Number(line.unitPrice)
      : pricing.getUnitPrice(prod, line.variantValue);

    let taxRate = 0;
    const taxId = line.tax?.id || line.tax?._id || line.tax;
    if (taxId) {
      const taxDoc = await Tax.findById(taxId);
      if (taxDoc) taxRate = Number(taxDoc.rate || 0);
    } else if (line.taxRate !== undefined) {
      taxRate = Number(line.taxRate || 0);
    }

    const qty = Number(line.quantity || 1);
    const amount = mul(qty, unitPrice);

    snapshotLines.push({
      product: prodId,
      variantValue: line.variantValue || null,
      description: line.description || prod.name || '',
      quantity: qty,
      unitPrice,
      tax: taxId || null,
      taxRate,
      amount,
    });
  }
  return snapshotLines;
};

/**
 * Create subscription
 */
const create = async (data) => {
  const parsed = subscriptionCreateSchema.parse(data);

  // 1. Verify plan exists and is active (reject paused or closed)
  const plan = await Plan.findById(parsed.plan);
  if (!plan) {
    const err = new Error('Plan not found');
    err.status = 404;
    throw err;
  }
  if (plan.status !== 'active') {
    const err = new Error(`Cannot subscribe to ${plan.status} plan`);
    err.status = 400;
    throw err;
  }

  // 2. Enforce plan.minQty
  const totalQty = parsed.lines.reduce((acc, l) => acc + Number(l.quantity || 1), 0);
  if (totalQty < (plan.minQty || 1)) {
    const err = new Error(`Minimum quantity for plan "${plan.name}" is ${plan.minQty}`);
    err.status = 400;
    throw err;
  }

  // 3. Snapshot lines
  const snapshotLines = await buildSnapshotLines(parsed.lines);

  // 4. Generate SUB number
  const number = await nextNumber('SUB');

  const startDateIso = new Date(parsed.startDate).toISOString();
  const expiryDateIso = parsed.expiryDate ? new Date(parsed.expiryDate).toISOString() : null;
  const quotationValidUntilIso = parsed.quotationValidUntil
    ? new Date(parsed.quotationValidUntil).toISOString()
    : null;

  // Next invoice date is set on active
  let nextInvoiceDate = null;
  if (parsed.status === 'active') {
    nextInvoiceDate = startDateIso;
  }

  const res = await query(
    `INSERT INTO subscriptions (
       number, customer_id, plan_id, start_date, expiry_date,
       payment_terms, status, next_invoice_date, quotation_valid_until,
       notes, lines
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      number,
      parsed.customer,
      parsed.plan,
      startDateIso,
      expiryDateIso,
      parsed.paymentTerms ?? 15,
      parsed.status,
      nextInvoiceDate,
      quotationValidUntilIso,
      parsed.notes || '',
      JSON.stringify(snapshotLines),
    ]
  );

  return findById(res.rows[0].id);
};

/**
 * List subscriptions with filters and pagination
 */
const list = async ({ status, customer, search, limit = 20, skip = 0, sort = 'desc' }) => {
  const where = [];
  const p = [];

  if (status && status.trim()) {
    p.push(status.trim().toLowerCase());
    where.push(`s.status = $${p.length}`);
  }

  if (customer && customer.trim()) {
    p.push(customer.trim());
    where.push(`s.customer_id = $${p.length}`);
  }

  if (search && search.trim()) {
    p.push(`%${escLike(search.trim())}%`);
    where.push(`(s.number ILIKE $${p.length} ESCAPE '\\' OR s.notes ILIKE $${p.length} ESCAPE '\\' OR u.name ILIKE $${p.length} ESCAPE '\\' OR u.email ILIKE $${p.length} ESCAPE '\\')`);
  }

  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sortDir = sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const [rows, count] = await Promise.all([
    query(
      `SELECT ${SELECT_FIELDS}
       FROM subscriptions s
       LEFT JOIN users u ON s.customer_id = u.id
       LEFT JOIN plans p ON s.plan_id = p.id
       ${w}
       ORDER BY s.created_at ${sortDir}, s.id
       LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,
      [...p, limit, skip]
    ),
    query(
      `SELECT count(*) as total
       FROM subscriptions s
       LEFT JOIN users u ON s.customer_id = u.id
       ${w}`,
      p
    ),
  ]);

  return {
    items: rows.rows.map(toApi),
    total: count.rows[0].total,
  };
};

/**
 * Enforce allowed status transitions
 * draft > quotation > confirmed > active > closed
 * plus any non-closed > closed
 */
const isValidTransition = (current, target) => {
  if (current === target) return true;
  if (current === 'closed') return false; // terminal
  if (target === 'closed') return true; // any non-closed > closed

  const flow = {
    draft: ['quotation', 'confirmed'],
    quotation: ['confirmed'],
    confirmed: ['active'],
    active: ['closed'],
  };

  return (flow[current] || []).includes(target);
};

/**
 * Update status
 */
const updateStatus = async (id, targetStatus) => {
  const current = await findById(id);
  if (!current) {
    const err = new Error('Subscription not found');
    err.status = 404;
    throw err;
  }

  const valid = isValidTransition(current.status, targetStatus);
  if (!valid) {
    const err = new Error(`Invalid status transition from "${current.status}" to "${targetStatus}"`);
    err.status = 400;
    throw err;
  }

  // Check quotation expiry when confirming from quotation
  if (targetStatus === 'confirmed' && current.status === 'quotation') {
    if (current.quotationValidUntil && new Date(current.quotationValidUntil) < new Date()) {
      const err = new Error('Cannot confirm an expired quotation');
      err.status = 400;
      throw err;
    }
  }

  // On entering active, set nextInvoiceDate = startDate if empty
  let nextInvoiceDate = current.nextInvoiceDate;
  if (targetStatus === 'active' && !nextInvoiceDate) {
    nextInvoiceDate = current.startDate;
  }

  const nextIso = nextInvoiceDate ? new Date(nextInvoiceDate).toISOString() : null;

  await query(
    `UPDATE subscriptions
     SET status = $2, next_invoice_date = $3, updated_at = now()
     WHERE id = $1`,
    [id, targetStatus, nextIso]
  );

  return findById(id);
};

/**
 * Update nextInvoiceDate atomically (for billing concurrency guard)
 */
const advanceNextInvoiceDate = async (id, expectedDate, nextDate, targetStatus = null) => {
  const expIso = expectedDate instanceof Date ? expectedDate.toISOString() : new Date(expectedDate).toISOString();
  const nextIso = nextDate instanceof Date ? nextDate.toISOString() : new Date(nextDate).toISOString();

  let sql = `UPDATE subscriptions SET next_invoice_date = $3, updated_at = now()`;
  const params = [id, expIso, nextIso];

  if (targetStatus) {
    params.push(targetStatus);
    sql += `, status = $4`;
  }

  sql += ` WHERE id = $1 AND next_invoice_date = $2`;

  const res = await query(sql, params);
  return res.rowCount > 0;
};

module.exports = {
  create,
  findById,
  findByNumber,
  list,
  updateStatus,
  advanceNextInvoiceDate,
  toApi,
};

