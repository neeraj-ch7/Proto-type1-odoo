const { query } = require('../config/db');
const { z } = require('zod');

const variantSchema = z.object({
  attribute: z.string().trim().min(1, 'Attribute name is required'),
  value: z.string().trim().min(1, 'Variant value is required'),
  extraPrice: z.number().nonnegative('Extra price must be non-negative').default(0),
});

const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required'),
  type: z.string().trim().default('service'),
  salesPrice: z.number().nonnegative('Sales price must be non-negative'),
  costPrice: z.number().nonnegative('Cost price must be non-negative').optional().default(0),
  notes: z.string().optional().default(''),
  active: z.boolean().optional().default(true),
  variants: z.array(variantSchema).optional().default([]),
});

const productUpdateSchema = productSchema.partial();

const escLike = (s) => s.replace(/[\\%_]/g, '\\$&');

const toApi = (r) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    name: r.name,
    type: r.type,
    salesPrice: Number(r.sales_price),
    costPrice: r.cost_price != null ? Number(r.cost_price) : null,
    notes: r.notes || '',
    active: Boolean(r.active),
    variants: Array.isArray(r.variants) ? r.variants : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

const findById = async (id) => {
  const res = await query('SELECT * FROM products WHERE id = $1', [id]);
  return toApi(res.rows[0]);
};

const list = async ({ search, active, limit = 20, skip = 0, sort = 'desc' }) => {
  const where = [];
  const p = [];

  if (active !== undefined && active !== null && active !== '') {
    p.push(active === true || active === 'true');
    where.push(`active = $${p.length}`);
  }

  if (search && search.trim()) {
    p.push(`%${escLike(search.trim())}%`);
    where.push(`(name ILIKE $${p.length} ESCAPE '\\' OR type ILIKE $${p.length} ESCAPE '\\' OR notes ILIKE $${p.length} ESCAPE '\\')`);
  }

  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sortDir = sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const [rows, count] = await Promise.all([
    query(
      `SELECT * FROM products ${w} ORDER BY created_at ${sortDir}, id LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,
      [...p, limit, skip]
    ),
    query(`SELECT count(*) as total FROM products ${w}`, p),
  ]);

  return {
    items: rows.rows.map(toApi),
    total: count.rows[0].total,
  };
};

const create = async (data) => {
  const parsed = productSchema.parse(data);
  const res = await query(
    `INSERT INTO products (name, type, sales_price, cost_price, notes, active, variants)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      parsed.name,
      parsed.type,
      parsed.salesPrice,
      parsed.costPrice ?? 0,
      parsed.notes,
      parsed.active,
      JSON.stringify(parsed.variants),
    ]
  );
  return toApi(res.rows[0]);
};

const update = async (id, data) => {
  const parsed = productUpdateSchema.parse(data);
  const current = await findById(id);
  if (!current) return null;

  const merged = {
    name: parsed.name !== undefined ? parsed.name : current.name,
    type: parsed.type !== undefined ? parsed.type : current.type,
    salesPrice: parsed.salesPrice !== undefined ? parsed.salesPrice : current.salesPrice,
    costPrice: parsed.costPrice !== undefined ? (parsed.costPrice ?? 0) : current.costPrice,
    notes: parsed.notes !== undefined ? parsed.notes : current.notes,
    active: parsed.active !== undefined ? parsed.active : current.active,
    variants: parsed.variants !== undefined ? parsed.variants : current.variants,
  };

  const res = await query(
    `UPDATE products
     SET name = $2, type = $3, sales_price = $4, cost_price = $5, notes = $6, active = $7, variants = $8, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      merged.name,
      merged.type,
      merged.salesPrice,
      merged.costPrice ?? 0,
      merged.notes,
      merged.active,
      JSON.stringify(merged.variants),
    ]
  );
  return toApi(res.rows[0]);
};

const deleteById = async (id) => {
  const res = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
  return res.rowCount > 0;
};

module.exports = {
  productSchema,
  productUpdateSchema,
  toApi,
  findById,
  list,
  create,
  update,
  deleteById,
};
