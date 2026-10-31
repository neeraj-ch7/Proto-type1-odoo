// User data access (replaces the Mongoose model). Table: users (see sql/schema.sql).
const { query } = require('../config/db');

const PUBLIC = 'id, name, email, role, created_at, updated_at'; // never select password_hash / reset_* for API output
// API shape: keeps `_id` (and `id`) so the client and teammates don't care that Mongo is gone.
const toApi = (r) => r && { _id: r.id, id: r.id, name: r.name, email: r.email, role: r.role, createdAt: r.created_at, updatedAt: r.updated_at };
const escLike = (s) => s.replace(/[\\%_]/g, '\\$&');

const findByEmail = async (email) => (await query('select * from users where email = $1', [email.toLowerCase()])).rows[0] || null; // full row (internal use: login)
const findById = async (id) => (await query(`select ${PUBLIC} from users where id = $1`, [id])).rows[0] || null;
const exists = async (email) => (await query('select 1 from users where email = $1', [email.toLowerCase()])).rowCount > 0;

const create = async ({ email, passwordHash, role = 'customer', name = null }) =>
  (await query(`insert into users (email, password_hash, role, name) values ($1, $2, $3, $4) returning ${PUBLIC}`, [email.toLowerCase(), passwordHash, role, name])).rows[0];

const list = async ({ role, search, limit, skip }) => {
  const where = []; const p = [];
  if (role) { p.push(role); where.push(`role = $${p.length}`); }
  if (search) { p.push(`%${escLike(search)}%`); where.push(`(email ilike $${p.length} escape '\\' or name ilike $${p.length} escape '\\')`); }
  const w = where.length ? 'where ' + where.join(' and ') : '';
  const [rows, count] = await Promise.all([
    query(`select ${PUBLIC} from users ${w} order by created_at desc, id limit $${p.length + 1} offset $${p.length + 2}`, [...p, limit, skip]),
    query(`select count(*) as total from users ${w}`, p),
  ]);
  return { items: rows.rows, total: count.rows[0].total };
};

const setResetToken = (id, hash, expiry) => query('update users set reset_token_hash = $2, reset_token_expiry = $3, updated_at = now() where id = $1', [id, hash, expiry]);
const findByValidResetHash = async (hash) => (await query('select id from users where reset_token_hash = $1 and reset_token_expiry > now()', [hash])).rows[0] || null;
const updatePassword = (id, passwordHash) => query('update users set password_hash = $2, reset_token_hash = null, reset_token_expiry = null, updated_at = now() where id = $1', [id, passwordHash]);
const deleteByEmails = (emails) => query('delete from users where email = any($1)', [emails.map((e) => e.toLowerCase())]);

module.exports = { toApi, findByEmail, findById, exists, create, list, setResetToken, findByValidResetHash, updatePassword, deleteByEmails };