const { query } = require('../config/db');
const { z } = require('zod');
const { round2, add } = require('../utils/money');
const mailService = require('../services/mail.service');

const lineSchema = z.object({
  description: z.string().optional().default(''),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().nonnegative().optional().default(0),
  amount: z.number().nonnegative(),
});

const invoiceCreateSchema = z.object({
  number: z.string().min(1, 'Invoice number is required'),
  subscription: z.string().nullable().optional(),
  customer: z.string().min(1, 'Customer ID is required'),
  periodStart: z.union([z.string().datetime(), z.string().date(), z.date()]),
  periodEnd: z.union([z.string().datetime(), z.string().date(), z.date()]),
  status: z.enum(['draft', 'confirmed', 'paid', 'cancelled']).optional().default('draft'),
  lines: z.array(lineSchema).default([]),
  subtotal: z.number().nonnegative(),
  discountAmount: z.number().nonnegative().optional().default(0),
  taxAmount: z.number().nonnegative().optional().default(0),
  total: z.number().nonnegative(),
  amountPaid: z.number().nonnegative().optional().default(0),
  dueDate: z.union([z.string().datetime(), z.string().date(), z.date()]),
  issuedAt: z.union([z.string().datetime(), z.string().date(), z.date()]).nullable().optional(),
  sentAt: z.union([z.string().datetime(), z.string().date(), z.date()]).nullable().optional(),
  appliedDiscounts: z.array(z.string()).optional().default([]),
});

const escLike = (s) => s.replace(/[\\%_]/g, '\\$&');

const toApi = (r) => {
  if (!r) return null;
  const rawLines = Array.isArray(r.lines)
    ? r.lines
    : typeof r.lines === 'string'
    ? JSON.parse(r.lines)
    : [];

  const rawDiscounts = Array.isArray(r.applied_discounts)
    ? r.applied_discounts
    : typeof r.applied_discounts === 'string'
    ? JSON.parse(r.applied_discounts)
    : [];

  const total = Number(r.total || 0);
  const amountPaid = Number(r.amount_paid || 0);
  const dueDate = r.due_date;
  const isOverdue = r.status === 'confirmed' && dueDate && new Date(dueDate) < new Date();

  return {
    _id: r.id,
    id: r.id,
    number: r.number,
    subscription: r.subscription_id ? {
      _id: r.subscription_id,
      id: r.subscription_id,
      number: r.subscription_number,
    } : null,
    subscriptionId: r.subscription_id,
    customer: r.customer_name || r.customer_email ? {
      _id: r.customer_id,
      id: r.customer_id,
      name: r.customer_name || null,
      email: r.customer_email || null,
    } : r.customer_id,
    customerId: r.customer_id,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    status: r.status,
    isOverdue,
    lines: rawLines.map((l) => ({
      description: l.description || '',
      quantity: Number(l.quantity || 1),
      unitPrice: Number(l.unitPrice || 0),
      taxRate: Number(l.taxRate || 0),
      amount: Number(l.amount || 0),
    })),
    subtotal: Number(r.subtotal || 0),
    discountAmount: Number(r.discount_amount || 0),
    taxAmount: Number(r.tax_amount || 0),
    total,
    amountPaid,
    dueDate,
    issuedAt: r.issued_at,
    sentAt: r.sent_at,
    appliedDiscounts: rawDiscounts,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

const SELECT_FIELDS = `
  i.id, i.number, i.subscription_id, i.customer_id, i.period_start, i.period_end,
  i.status, i.lines, i.subtotal, i.discount_amount, i.tax_amount, i.total,
  i.amount_paid, i.due_date, i.issued_at, i.sent_at, i.applied_discounts,
  i.created_at, i.updated_at,
  u.name as customer_name, u.email as customer_email,
  s.number as subscription_number
`;

const findById = async (id) => {
  const res = await query(
    `SELECT ${SELECT_FIELDS}
     FROM invoices i
     LEFT JOIN users u ON i.customer_id = u.id
     LEFT JOIN subscriptions s ON i.subscription_id = s.id
     WHERE i.id = $1`,
    [id]
  );
  return toApi(res.rows[0]);
};

const findByNumber = async (number) => {
  const res = await query(
    `SELECT ${SELECT_FIELDS}
     FROM invoices i
     LEFT JOIN users u ON i.customer_id = u.id
     LEFT JOIN subscriptions s ON i.subscription_id = s.id
     WHERE i.number = $1`,
    [number]
  );
  return toApi(res.rows[0]);
};

const create = async (data) => {
  const parsed = invoiceCreateSchema.parse(data);

  const res = await query(
    `INSERT INTO invoices (
       number, subscription_id, customer_id, period_start, period_end,
       status, lines, subtotal, discount_amount, tax_amount, total,
       amount_paid, due_date, issued_at, sent_at, applied_discounts
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      parsed.number,
      parsed.subscription || null,
      parsed.customer,
      new Date(parsed.periodStart).toISOString(),
      new Date(parsed.periodEnd).toISOString(),
      parsed.status,
      JSON.stringify(parsed.lines),
      parsed.subtotal,
      parsed.discountAmount,
      parsed.taxAmount,
      parsed.total,
      parsed.amountPaid,
      new Date(parsed.dueDate).toISOString(),
      parsed.issuedAt ? new Date(parsed.issuedAt).toISOString() : null,
      parsed.sentAt ? new Date(parsed.sentAt).toISOString() : null,
      JSON.stringify(parsed.appliedDiscounts || []),
    ]
  );

  return findById(res.rows[0].id);
};

const list = async ({
  status,
  customer,
  from,
  to,
  subscriptionId,
  search,
  limit = 20,
  skip = 0,
  sort = 'desc',
}) => {
  const where = [];
  const p = [];

  if (status && status.trim()) {
    const s = status.trim().toLowerCase();
    if (s === 'overdue') {
      where.push(`i.status = 'confirmed' AND i.due_date < now()`);
    } else {
      p.push(s);
      where.push(`i.status = $${p.length}`);
    }
  }

  if (customer && customer.trim()) {
    p.push(customer.trim());
    where.push(`i.customer_id = $${p.length}`);
  }

  if (subscriptionId && subscriptionId.trim()) {
    p.push(subscriptionId.trim());
    where.push(`i.subscription_id = $${p.length}`);
  }

  if (from) {
    p.push(new Date(from).toISOString());
    where.push(`i.created_at >= $${p.length}`);
  }

  if (to) {
    p.push(new Date(to).toISOString());
    where.push(`i.created_at <= $${p.length}`);
  }

  if (search && search.trim()) {
    p.push(`%${escLike(search.trim())}%`);
    where.push(`(i.number ILIKE $${p.length} ESCAPE '\\' OR u.name ILIKE $${p.length} ESCAPE '\\' OR u.email ILIKE $${p.length} ESCAPE '\\' OR s.number ILIKE $${p.length} ESCAPE '\\')`);
  }

  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sortDir = sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const [rows, count] = await Promise.all([
    query(
      `SELECT ${SELECT_FIELDS}
       FROM invoices i
       LEFT JOIN users u ON i.customer_id = u.id
       LEFT JOIN subscriptions s ON i.subscription_id = s.id
       ${w}
       ORDER BY i.created_at ${sortDir}, i.id
       LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,
      [...p, limit, skip]
    ),
    query(
      `SELECT count(*) as total
       FROM invoices i
       LEFT JOIN users u ON i.customer_id = u.id
       LEFT JOIN subscriptions s ON i.subscription_id = s.id
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
 * Confirm invoice:
 * Draft > Confirmed. Sets issued_at if empty.
 */
const confirm = async (id) => {
  const current = await findById(id);
  if (!current) {
    const err = new Error('Invoice not found');
    err.status = 404;
    throw err;
  }

  if (current.status !== 'draft') {
    const err = new Error(`Cannot confirm invoice with status "${current.status}"`);
    err.status = 400;
    throw err;
  }

  const issuedAt = current.issuedAt ? new Date(current.issuedAt).toISOString() : new Date().toISOString();

  await query(
    `UPDATE invoices
     SET status = 'confirmed', issued_at = $2, updated_at = now()
     WHERE id = $1`,
    [id, issuedAt]
  );

  return findById(id);
};

/**
 * Cancel invoice:
 * cancel is allowed from draft/confirmed only if amountPaid = 0.
 */
const cancel = async (id) => {
  const current = await findById(id);
  if (!current) {
    const err = new Error('Invoice not found');
    err.status = 404;
    throw err;
  }

  if (current.status === 'cancelled') {
    return current;
  }

  if (current.status === 'paid') {
    const err = new Error('Cannot cancel a paid invoice');
    err.status = 400;
    throw err;
  }

  if (Number(current.amountPaid || 0) > 0) {
    const err = new Error('Cannot cancel an invoice with payments recorded');
    err.status = 400;
    throw err;
  }

  await query(
    `UPDATE invoices
     SET status = 'cancelled', updated_at = now()
     WHERE id = $1`,
    [id]
  );

  return findById(id);
};

/**
 * Send invoice:
 * only confirmed (or paid); emails customer via mail.service; sets sent_at.
 */
const send = async (id) => {
  const current = await findById(id);
  if (!current) {
    const err = new Error('Invoice not found');
    err.status = 404;
    throw err;
  }

  if (current.status !== 'confirmed' && current.status !== 'paid') {
    const err = new Error('Only confirmed or paid invoices can be sent to customers');
    err.status = 400;
    throw err;
  }

  const customerEmail = current.customer?.email;
  if (!customerEmail) {
    const err = new Error('Customer has no valid email address');
    err.status = 400;
    throw err;
  }

  // Send email summary via mailService
  try {
    await mailService.sendMail({
      to: customerEmail,
      subject: `Invoice ${current.number} from Brightloop`,
      text: `Hello ${current.customer?.name || 'Customer'},\n\nYour invoice ${current.number} for amount INR ${current.total} is ready.\nDue date: ${current.dueDate}.\n\nThank you for choosing Brightloop!`,
      html: `<h3>Invoice ${current.number}</h3><p>Dear ${current.customer?.name || 'Customer'},</p><p>Your invoice <strong>${current.number}</strong> for amount <strong>INR ${current.total}</strong> is ready.</p><p>Due date: ${current.dueDate}</p><p>Thank you for choosing Brightloop!</p>`,
    });
  } catch (mailErr) {
    console.warn(`[mail] Could not send email for invoice ${current.number}:`, mailErr.message);
  }

  const sentAt = new Date().toISOString();
  await query(
    `UPDATE invoices
     SET sent_at = $2, updated_at = now()
     WHERE id = $1`,
    [id, sentAt]
  );

  return findById(id);
};

module.exports = {
  create,
  findById,
  findByNumber,
  list,
  confirm,
  cancel,
  send,
  toApi,
};

