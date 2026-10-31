const { query } = require('../config/db');
const { z } = require('zod');

const templateLineSchema = z.object({
  product: z.string().min(1, 'Product ID is required'),
  variantValue: z.string().nullable().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
});

const quotationTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Template name is required'),
  validityDays: z.number().int().min(1, 'Validity days must be at least 1').default(30),
  plan: z.string().min(1, 'Plan ID is required').optional(),
  planId: z.string().min(1, 'Plan ID is required').optional(),
  lines: z.array(templateLineSchema).min(1, 'At least one line is required'),
}).refine((data) => data.plan || data.planId, {
  message: 'Plan is required',
  path: ['plan'],
});

const quotationTemplateUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  validityDays: z.number().int().min(1).optional(),
  plan: z.string().min(1).optional(),
  planId: z.string().min(1).optional(),
  lines: z.array(templateLineSchema).min(1).optional(),
});

const escLike = (s) => s.replace(/[\\%_]/g, '\\$&');

const toApi = (r) => {
  if (!r) return null;
  const pId = r.plan_id;
  return {
    _id: r.id,
    id: r.id,
    name: r.name,
    validityDays: Number(r.validity_days),
    planId: pId,
    plan: pId,
    lines: Array.isArray(r.lines) ? r.lines : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

const findById = async (id) => {
  const res = await query('SELECT * FROM quotation_templates WHERE id = $1', [id]);
  return toApi(res.rows[0]);
};

const list = async ({ search, limit = 20, skip = 0, sort = 'desc' }) => {
  const where = [];
  const p = [];

  if (search && search.trim()) {
    p.push(`%${escLike(search.trim())}%`);
    where.push(`name ILIKE $${p.length} ESCAPE '\\'`);
  }

  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sortDir = sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const [rows, count] = await Promise.all([
    query(
      `SELECT * FROM quotation_templates ${w} ORDER BY created_at ${sortDir}, id LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,
      [...p, limit, skip]
    ),
    query(`SELECT count(*) as total FROM quotation_templates ${w}`, p),
  ]);

  return {
    items: rows.rows.map(toApi),
    total: count.rows[0].total,
  };
};

// Validate that plan and all products in lines exist
const validateReferences = async (planId, lines = []) => {
  if (planId) {
    const planRes = await query('SELECT id FROM plans WHERE id = $1', [planId]);
    if (planRes.rowCount === 0) {
      const err = new Error(`Plan ${planId} not found`);
      err.status = 400;
      throw err;
    }
  }

  if (lines && lines.length) {
    const productIds = [...new Set(lines.map((l) => l.product))];
    const prodRes = await query('SELECT id FROM products WHERE id = ANY($1)', [productIds]);
    const foundIds = new Set(prodRes.rows.map((r) => r.id));
    for (const pId of productIds) {
      if (!foundIds.has(pId)) {
        const err = new Error(`Product ${pId} not found`);
        err.status = 400;
        throw err;
      }
    }
  }
};

const create = async (data) => {
  const parsed = quotationTemplateSchema.parse(data);
  const planId = parsed.plan || parsed.planId;
  await validateReferences(planId, parsed.lines);

  const res = await query(
    `INSERT INTO quotation_templates (name, validity_days, plan_id, lines)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [parsed.name, parsed.validityDays, planId, JSON.stringify(parsed.lines)]
  );
  return toApi(res.rows[0]);
};

const update = async (id, data) => {
  const parsed = quotationTemplateUpdateSchema.parse(data);
  const current = await findById(id);
  if (!current) return null;

  const planId = parsed.plan || parsed.planId || current.planId;
  const lines = parsed.lines !== undefined ? parsed.lines : current.lines;
  await validateReferences(planId, lines);

  const merged = {
    name: parsed.name !== undefined ? parsed.name : current.name,
    validityDays: parsed.validityDays !== undefined ? parsed.validityDays : current.validityDays,
    planId,
    lines,
  };

  const res = await query(
    `UPDATE quotation_templates
     SET name = $2, validity_days = $3, plan_id = $4, lines = $5, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, merged.name, merged.validityDays, merged.planId, JSON.stringify(merged.lines)]
  );
  return toApi(res.rows[0]);
};

const deleteById = async (id) => {
  const res = await query('DELETE FROM quotation_templates WHERE id = $1 RETURNING id', [id]);
  return res.rowCount > 0;
};

module.exports = {
  quotationTemplateSchema,
  quotationTemplateUpdateSchema,
  toApi,
  findById,
  list,
  create,
  update,
  deleteById,
};
