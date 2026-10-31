const { query } = require('../config/db');
const { z } = require('zod');

const taxSchema = z.object({
  name: z.string().trim().min(1, 'Tax name is required'),
  rate: z.number().nonnegative('Tax rate must be non-negative'),
  active: z.boolean().optional().default(true),
});

const taxUpdateSchema = taxSchema.partial();

const escLike = (s) => s.replace(/[\\%_]/g, '\\$&');

const toApi = (r) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    name: r.name,
    rate: Number(r.rate),
    active: Boolean(r.active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

const findById = async (id) => {
  const res = await query('SELECT * FROM taxes WHERE id = $1', [id]);
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
    where.push(`name ILIKE $${p.length} ESCAPE '\\'`);
  }

  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sortDir = sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const [rows, count] = await Promise.all([
    query(
      `SELECT * FROM taxes ${w} ORDER BY created_at ${sortDir}, id LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,
      [...p, limit, skip]
    ),
    query(`SELECT count(*) as total FROM taxes ${w}`, p),
  ]);

  return {
    items: rows.rows.map(toApi),
    total: count.rows[0].total,
  };
};

const create = async (data) => {
  const parsed = taxSchema.parse(data);
  const res = await query(
    `INSERT INTO taxes (name, rate, active)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [parsed.name, parsed.rate, parsed.active]
  );
  return toApi(res.rows[0]);
};

const update = async (id, data) => {
  const parsed = taxUpdateSchema.parse(data);
  const current = await findById(id);
  if (!current) return null;

  const merged = {
    name: parsed.name !== undefined ? parsed.name : current.name,
    rate: parsed.rate !== undefined ? parsed.rate : current.rate,
    active: parsed.active !== undefined ? parsed.active : current.active,
  };

  const res = await query(
    `UPDATE taxes
     SET name = $2, rate = $3, active = $4, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, merged.name, merged.rate, merged.active]
  );
  return toApi(res.rows[0]);
};

const deleteById = async (id) => {
  const res = await query('DELETE FROM taxes WHERE id = $1 RETURNING id', [id]);
  return res.rowCount > 0;
};

module.exports = {
  taxSchema,
  taxUpdateSchema,
  toApi,
  findById,
  list,
  create,
  update,
  deleteById,
};
