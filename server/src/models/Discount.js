const { query } = require('../config/db');
const { z } = require('zod');

const dateCoerce = z.union([z.string().datetime(), z.string().date(), z.date()]).nullable().optional();

const discountSchema = z
  .object({
    name: z.string().trim().min(1, 'Discount name is required'),
    type: z.enum(['fixed', 'percent'], {
      errorMap: () => ({ message: 'Discount type must be fixed or percent' }),
    }),
    value: z.number().nonnegative('Discount value must be non-negative'),
    minPurchase: z.number().nonnegative('Minimum purchase must be non-negative').optional().default(0),
    minQty: z.number().int().min(0, 'Minimum quantity must be non-negative').optional().default(0),
    startDate: dateCoerce,
    endDate: dateCoerce,
    usageLimit: z.number().int().min(1, 'Usage limit must be at least 1').nullable().optional(),
    timesUsed: z.number().int().min(0).optional().default(0),
    appliesTo: z.enum(['product', 'subscription'], {
      errorMap: () => ({ message: 'Applies to must be product or subscription' }),
    }).default('subscription'),
    products: z.array(z.string()).optional().default([]),
    active: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      if (data.type === 'percent' && data.value > 100) return false;
      return true;
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['value'],
    }
  )
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

const discountUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    type: z.enum(['fixed', 'percent']).optional(),
    value: z.number().nonnegative().optional(),
    minPurchase: z.number().nonnegative().optional(),
    minQty: z.number().int().min(0).optional(),
    startDate: dateCoerce,
    endDate: dateCoerce,
    usageLimit: z.number().int().min(1).nullable().optional(),
    timesUsed: z.number().int().min(0).optional(),
    appliesTo: z.enum(['product', 'subscription']).optional(),
    products: z.array(z.string()).optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'percent' && data.value !== undefined && data.value > 100) return false;
      return true;
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['value'],
    }
  )
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
    type: r.type,
    value: Number(r.value),
    minPurchase: r.min_purchase != null ? Number(r.min_purchase) : 0,
    minQty: r.min_qty != null ? Number(r.min_qty) : 0,
    startDate: r.start_date,
    endDate: r.end_date,
    usageLimit: r.usage_limit != null ? Number(r.usage_limit) : null,
    timesUsed: Number(r.times_used || 0),
    appliesTo: r.applies_to,
    products: Array.isArray(r.products) ? r.products : [],
    active: Boolean(r.active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

const findById = async (id) => {
  const res = await query('SELECT * FROM discounts WHERE id = $1', [id]);
  return toApi(res.rows[0]);
};

const list = async ({ search, active, appliesTo, limit = 20, skip = 0, sort = 'desc' }) => {
  const where = [];
  const p = [];

  if (active !== undefined && active !== null && active !== '') {
    p.push(active === true || active === 'true');
    where.push(`active = $${p.length}`);
  }

  if (appliesTo && appliesTo.trim()) {
    p.push(appliesTo.trim().toLowerCase());
    where.push(`applies_to = $${p.length}`);
  }

  if (search && search.trim()) {
    p.push(`%${escLike(search.trim())}%`);
    where.push(`name ILIKE $${p.length} ESCAPE '\\'`);
  }

  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sortDir = sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const [rows, count] = await Promise.all([
    query(
      `SELECT * FROM discounts ${w} ORDER BY created_at ${sortDir}, id LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,
      [...p, limit, skip]
    ),
    query(`SELECT count(*) as total FROM discounts ${w}`, p),
  ]);

  return {
    items: rows.rows.map(toApi),
    total: count.rows[0].total,
  };
};

const create = async (data) => {
  const parsed = discountSchema.parse(data);
  const res = await query(
    `INSERT INTO discounts (name, type, value, min_purchase, min_qty, start_date, end_date, usage_limit, times_used, applies_to, products, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      parsed.name,
      parsed.type,
      parsed.value,
      parsed.minPurchase,
      parsed.minQty,
      parsed.startDate ? new Date(parsed.startDate).toISOString() : null,
      parsed.endDate ? new Date(parsed.endDate).toISOString() : null,
      parsed.usageLimit ?? null,
      parsed.timesUsed || 0,
      parsed.appliesTo,
      parsed.products || [],
      parsed.active,
    ]
  );
  return toApi(res.rows[0]);
};

const update = async (id, data) => {
  const parsed = discountUpdateSchema.parse(data);
  const current = await findById(id);
  if (!current) return null;

  const merged = {
    name: parsed.name !== undefined ? parsed.name : current.name,
    type: parsed.type !== undefined ? parsed.type : current.type,
    value: parsed.value !== undefined ? parsed.value : current.value,
    minPurchase: parsed.minPurchase !== undefined ? parsed.minPurchase : current.minPurchase,
    minQty: parsed.minQty !== undefined ? parsed.minQty : current.minQty,
    startDate: parsed.startDate !== undefined ? parsed.startDate : current.startDate,
    endDate: parsed.endDate !== undefined ? parsed.endDate : current.endDate,
    usageLimit: parsed.usageLimit !== undefined ? parsed.usageLimit : current.usageLimit,
    timesUsed: parsed.timesUsed !== undefined ? parsed.timesUsed : current.timesUsed,
    appliesTo: parsed.appliesTo !== undefined ? parsed.appliesTo : current.appliesTo,
    products: parsed.products !== undefined ? parsed.products : current.products,
    active: parsed.active !== undefined ? parsed.active : current.active,
  };

  const res = await query(
    `UPDATE discounts
     SET name = $2, type = $3, value = $4, min_purchase = $5, min_qty = $6, start_date = $7, end_date = $8,
         usage_limit = $9, times_used = $10, applies_to = $11, products = $12, active = $13, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      merged.name,
      merged.type,
      merged.value,
      merged.minPurchase,
      merged.minQty,
      merged.startDate ? new Date(merged.startDate).toISOString() : null,
      merged.endDate ? new Date(merged.endDate).toISOString() : null,
      merged.usageLimit ?? null,
      merged.timesUsed,
      merged.appliesTo,
      merged.products,
      merged.active,
    ]
  );
  return toApi(res.rows[0]);
};

const deleteById = async (id) => {
  const res = await query('DELETE FROM discounts WHERE id = $1 RETURNING id', [id]);
  return res.rowCount > 0;
};

// Atomically consume discounts
const consumeDiscounts = async (ids = []) => {
  if (!ids || !ids.length) return [];
  const consumed = [];
  for (const id of ids) {
    const res = await query(
      `UPDATE discounts
       SET times_used = times_used + 1, updated_at = now()
       WHERE id = $1
         AND (usage_limit IS NULL OR times_used < usage_limit)
       RETURNING id`,
      [id]
    );
    if (res.rowCount > 0) {
      consumed.push(res.rows[0].id);
    }
  }
  return consumed;
};

module.exports = {
  discountSchema,
  discountUpdateSchema,
  toApi,
  findById,
  list,
  create,
  update,
  deleteById,
  consumeDiscounts,
};
