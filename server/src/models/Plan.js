const { query } = require('../config/db');
const { z } = require('zod');

const dateCoerce = z.union([z.string().datetime(), z.string().date(), z.date()]).nullable().optional();

const planSchema = z
  .object({
    name: z.string().trim().min(1, 'Plan name is required'),
    price: z.number().nonnegative('Price must be non-negative'),
    billingPeriod: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
      errorMap: () => ({ message: 'Billing period must be daily, weekly, monthly, or yearly' }),
    }),
    minQty: z.number().int().min(1, 'Minimum quantity must be at least 1').default(1),
    startDate: dateCoerce,
    endDate: dateCoerce,
    autoClose: z.boolean().default(false),
    closable: z.boolean().default(true),
    pausable: z.boolean().default(true),
    renewable: z.boolean().default(true),
    status: z.enum(['active', 'paused', 'closed']).default('active'),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  );

const planUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    price: z.number().nonnegative().optional(),
    billingPeriod: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    minQty: z.number().int().min(1).optional(),
    startDate: dateCoerce,
    endDate: dateCoerce,
    autoClose: z.boolean().optional(),
    closable: z.boolean().optional(),
    pausable: z.boolean().optional(),
    renewable: z.boolean().optional(),
    status: z.enum(['active', 'paused', 'closed']).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  );

const escLike = (s) => s.replace(/[\\%_]/g, '\\$&');

const toApi = (r) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    name: r.name,
    price: Number(r.price),
    billingPeriod: r.billing_period,
    minQty: r.min_qty != null ? Number(r.min_qty) : 1,
    startDate: r.start_date,
    endDate: r.end_date,
    autoClose: Boolean(r.auto_close),
    closable: Boolean(r.closable),
    pausable: Boolean(r.pausable),
    renewable: Boolean(r.renewable),
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

const findById = async (id) => {
  const res = await query('SELECT * FROM plans WHERE id = $1', [id]);
  return toApi(res.rows[0]);
};

const list = async ({ search, status, limit = 20, skip = 0, sort = 'desc' }) => {
  const where = [];
  const p = [];

  if (status && status.trim()) {
    p.push(status.trim().toLowerCase());
    where.push(`status = $${p.length}`);
  }

  if (search && search.trim()) {
    p.push(`%${escLike(search.trim())}%`);
    where.push(`(name ILIKE $${p.length} ESCAPE '\\' OR billing_period ILIKE $${p.length} ESCAPE '\\')`);
  }

  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sortDir = sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const [rows, count] = await Promise.all([
    query(
      `SELECT * FROM plans ${w} ORDER BY created_at ${sortDir}, id LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,
      [...p, limit, skip]
    ),
    query(`SELECT count(*) as total FROM plans ${w}`, p),
  ]);

  return {
    items: rows.rows.map(toApi),
    total: count.rows[0].total,
  };
};

const listPublic = async () => {
  const now = new Date().toISOString();
  const res = await query(
    `SELECT * FROM plans
     WHERE status = 'active'
       AND (start_date IS NULL OR start_date <= $1)
       AND (end_date IS NULL OR end_date >= $1)
     ORDER BY price ASC, name ASC`,
    [now]
  );
  return res.rows.map(toApi);
};

const create = async (data) => {
  const parsed = planSchema.parse(data);
  const res = await query(
    `INSERT INTO plans (name, price, billing_period, min_qty, start_date, end_date, auto_close, closable, pausable, renewable, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      parsed.name,
      parsed.price,
      parsed.billingPeriod,
      parsed.minQty,
      parsed.startDate ? new Date(parsed.startDate).toISOString() : null,
      parsed.endDate ? new Date(parsed.endDate).toISOString() : null,
      parsed.autoClose,
      parsed.closable,
      parsed.pausable,
      parsed.renewable,
      parsed.status,
    ]
  );
  return toApi(res.rows[0]);
};

const update = async (id, data) => {
  const parsed = planUpdateSchema.parse(data);
  const current = await findById(id);
  if (!current) return null;

  const merged = {
    name: parsed.name !== undefined ? parsed.name : current.name,
    price: parsed.price !== undefined ? parsed.price : current.price,
    billingPeriod: parsed.billingPeriod !== undefined ? parsed.billingPeriod : current.billingPeriod,
    minQty: parsed.minQty !== undefined ? parsed.minQty : current.minQty,
    startDate: parsed.startDate !== undefined ? parsed.startDate : current.startDate,
    endDate: parsed.endDate !== undefined ? parsed.endDate : current.endDate,
    autoClose: parsed.autoClose !== undefined ? parsed.autoClose : current.autoClose,
    closable: parsed.closable !== undefined ? parsed.closable : current.closable,
    pausable: parsed.pausable !== undefined ? parsed.pausable : current.pausable,
    renewable: parsed.renewable !== undefined ? parsed.renewable : current.renewable,
    status: parsed.status !== undefined ? parsed.status : current.status,
  };

  const res = await query(
    `UPDATE plans
     SET name = $2, price = $3, billing_period = $4, min_qty = $5, start_date = $6, end_date = $7,
         auto_close = $8, closable = $9, pausable = $10, renewable = $11, status = $12, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      merged.name,
      merged.price,
      merged.billingPeriod,
      merged.minQty,
      merged.startDate ? new Date(merged.startDate).toISOString() : null,
      merged.endDate ? new Date(merged.endDate).toISOString() : null,
      merged.autoClose,
      merged.closable,
      merged.pausable,
      merged.renewable,
      merged.status,
    ]
  );
  return toApi(res.rows[0]);
};

const deleteById = async (id) => {
  const res = await query('DELETE FROM plans WHERE id = $1 RETURNING id', [id]);
  return res.rowCount > 0;
};

// Daily cron or manual trigger: close plans with autoClose=true whose endDate has passed
const closeExpiredAutoClosePlans = async () => {
  const now = new Date().toISOString();
  const res = await query(
    `UPDATE plans
     SET status = 'closed', updated_at = now()
     WHERE auto_close = true
       AND status != 'closed'
       AND end_date IS NOT NULL
       AND end_date < $1
     RETURNING id, name`,
    [now]
  );
  return res.rows;
};

module.exports = {
  planSchema,
  planUpdateSchema,
  toApi,
  findById,
  list,
  listPublic,
  create,
  update,
  deleteById,
  closeExpiredAutoClosePlans,
};
