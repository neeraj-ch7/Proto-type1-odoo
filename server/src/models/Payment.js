const { query, tx } = require('../config/db');
const { z } = require('zod');
const { round2, add, sub } = require('../utils/money');

const paymentSchema = z.object({
  invoice: z.string().min(1, 'Invoice ID is required'),
  method: z.enum(['cash', 'card', 'bank_transfer', 'upi', 'other']),
  amount: z.number().positive('Amount must be greater than 0'),
  date: z.union([z.string().datetime(), z.string().date(), z.date()]).optional(),
  note: z.string().optional().default(''),
});

const toApi = (r) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    invoice: r.invoice_number
      ? {
          _id: r.invoice_id,
          id: r.invoice_id,
          number: r.invoice_number,
          total: Number(r.invoice_total || 0),
          amountPaid: Number(r.invoice_amount_paid || 0),
          status: r.invoice_status,
        }
      : r.invoice_id,
    invoiceId: r.invoice_id,
    customer:
      r.customer_name || r.customer_email
        ? {
            _id: r.customer_id,
            id: r.customer_id,
            name: r.customer_name || null,
            email: r.customer_email || null,
          }
        : r.customer_id,
    customerId: r.customer_id,
    method: r.method,
    amount: Number(r.amount),
    date: r.date,
    note: r.note || '',
    recordedBy:
      r.recorded_by_name || r.recorded_by_email
        ? {
            _id: r.recorded_by,
            id: r.recorded_by,
            name: r.recorded_by_name || null,
            email: r.recorded_by_email || null,
          }
        : r.recorded_by,
    recordedById: r.recorded_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

const SELECT_FIELDS = `
  p.id, p.invoice_id, p.customer_id, p.method, p.amount, p.date, p.note, p.recorded_by,
  p.created_at, p.updated_at,
  i.number as invoice_number, i.total as invoice_total, i.amount_paid as invoice_amount_paid, i.status as invoice_status,
  u.name as customer_name, u.email as customer_email,
  rec.name as recorded_by_name, rec.email as recorded_by_email
`;

const findById = async (id) => {
  const res = await query(
    `SELECT ${SELECT_FIELDS}
     FROM payments p
     LEFT JOIN invoices i ON p.invoice_id = i.id
     LEFT JOIN users u ON p.customer_id = u.id
     LEFT JOIN users rec ON p.recorded_by = rec.id
     WHERE p.id = $1`,
    [id]
  );
  return toApi(res.rows[0]);
};

/**
 * Record a payment against a confirmed invoice atomically.
 * Prevents overpayments and simultaneously flips status to 'paid' if fully paid.
 */
const recordPayment = async ({ invoiceId, method, amount, date, note, recordedBy }) => {
  const parsed = paymentSchema.parse({
    invoice: invoiceId,
    method,
    amount: round2(amount),
    date: date || new Date().toISOString(),
    note: note || '',
  });

  return await tx(async (q) => {
    // 1. Lock invoice row FOR UPDATE to prevent concurrency race conditions
    const invRes = await q(
      `SELECT id, number, customer_id, total, amount_paid, status
       FROM invoices
       WHERE id = $1
       FOR UPDATE`,
      [parsed.invoice]
    );

    if (invRes.rows.length === 0) {
      const err = new Error('Invoice not found');
      err.status = 404;
      throw err;
    }

    const inv = invRes.rows[0];

    // Payments allowed ONLY on confirmed invoices
    if (inv.status === 'paid') {
      const err = new Error('Invoice is already fully paid');
      err.status = 400;
      throw err;
    }
    if (inv.status === 'draft') {
      const err = new Error('Payments cannot be recorded against draft invoices');
      err.status = 400;
      throw err;
    }
    if (inv.status === 'cancelled') {
      const err = new Error('Payments cannot be recorded against cancelled invoices');
      err.status = 400;
      throw err;
    }
    if (inv.status !== 'confirmed') {
      const err = new Error(`Cannot record payment on invoice with status "${inv.status}"`);
      err.status = 400;
      throw err;
    }

    const total = Number(inv.total);
    const amountPaid = Number(inv.amount_paid || 0);
    const remaining = sub(total, amountPaid);

    if (parsed.amount <= 0) {
      const err = new Error('Payment amount must be greater than 0');
      err.status = 400;
      throw err;
    }

    if (parsed.amount > remaining) {
      const err = new Error(`Payment amount (INR ${parsed.amount}) exceeds remaining balance of INR ${remaining}`);
      err.status = 400;
      throw err;
    }

    const paymentDate = parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString();

    // 2. Insert Payment record
    const payRes = await q(
      `INSERT INTO payments (
         invoice_id, customer_id, method, amount, date, note, recorded_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        inv.id,
        inv.customer_id,
        parsed.method,
        parsed.amount,
        paymentDate,
        parsed.note,
        recordedBy || null,
      ]
    );

    const newPaymentId = payRes.rows[0].id;

    // 3. Increment invoice amount_paid and update status to 'paid' if fully paid
    const newAmountPaid = add(amountPaid, parsed.amount);
    const newStatus = newAmountPaid >= total ? 'paid' : 'confirmed';

    await q(
      `UPDATE invoices
       SET amount_paid = $2,
           status = $3,
           updated_at = now()
       WHERE id = $1`,
      [inv.id, newAmountPaid, newStatus]
    );

    // 4. Return full payment details
    const finalRes = await q(
      `SELECT ${SELECT_FIELDS}
       FROM payments p
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN users u ON p.customer_id = u.id
       LEFT JOIN users rec ON p.recorded_by = rec.id
       WHERE p.id = $1`,
      [newPaymentId]
    );

    return toApi(finalRes.rows[0]);
  });
};

const findByInvoiceId = async (invoiceId) => {
  const res = await query(
    `SELECT ${SELECT_FIELDS}
     FROM payments p
     LEFT JOIN invoices i ON p.invoice_id = i.id
     LEFT JOIN users u ON p.customer_id = u.id
     LEFT JOIN users rec ON p.recorded_by = rec.id
     WHERE p.invoice_id = $1
     ORDER BY p.date DESC, p.created_at DESC`,
    [invoiceId]
  );
  return res.rows.map(toApi);
};

const list = async ({
  method,
  from,
  to,
  customer,
  invoiceId,
  search,
  limit = 20,
  skip = 0,
}) => {
  const where = [];
  const p = [];

  if (method && method.trim()) {
    p.push(method.trim());
    where.push(`p.method = $${p.length}`);
  }

  if (customer && customer.trim()) {
    p.push(customer.trim());
    where.push(`p.customer_id = $${p.length}`);
  }

  if (invoiceId && invoiceId.trim()) {
    p.push(invoiceId.trim());
    where.push(`p.invoice_id = $${p.length}`);
  }

  if (from) {
    p.push(new Date(from).toISOString());
    where.push(`p.date >= $${p.length}`);
  }

  if (to) {
    p.push(new Date(to).toISOString());
    where.push(`p.date <= $${p.length}`);
  }

  if (search && search.trim()) {
    const esc = search.trim().replace(/[\\%_]/g, '\\$&');
    p.push(`%${esc}%`);
    where.push(`(i.number ILIKE $${p.length} ESCAPE '\\' OR u.name ILIKE $${p.length} ESCAPE '\\' OR u.email ILIKE $${p.length} ESCAPE '\\' OR p.note ILIKE $${p.length} ESCAPE '\\')`);
  }

  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [rows, count] = await Promise.all([
    query(
      `SELECT ${SELECT_FIELDS}
       FROM payments p
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN users u ON p.customer_id = u.id
       LEFT JOIN users rec ON p.recorded_by = rec.id
       ${w}
       ORDER BY p.date DESC, p.created_at DESC
       LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,
      [...p, limit, skip]
    ),
    query(
      `SELECT count(*) as total
       FROM payments p
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN users u ON p.customer_id = u.id
       ${w}`,
      p
    ),
  ]);

  return {
    items: rows.rows.map(toApi),
    total: count.rows[0].total,
  };
};

module.exports = {
  recordPayment,
  findById,
  findByInvoiceId,
  list,
  toApi,
};
