// Supabase = hosted Postgres. We talk to it with the `pg` driver using DATABASE_URL.
const { Pool, types } = require('pg');

// Money columns are numeric -> pg returns strings by default. Contract says money is a Number.
types.setTypeParser(1700, (v) => parseFloat(v)); // numeric
types.setTypeParser(20, (v) => parseInt(v, 10));  // bigint (count(*))

let pool;
const getPool = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (see server/.env.example)');
  if (!pool) {
    const local = /localhost|127\.0\.0\.1/.test(url);
    const ssl = process.env.DATABASE_SSL === 'false' || local ? false : { rejectUnauthorized: false };
    pool = new Pool({ connectionString: url, ssl, max: Number(process.env.DB_POOL_MAX) || 10, idleTimeoutMillis: 30000 });
    pool.on('error', (e) => console.error('[db] idle client error:', e.message));
  }
  return pool;
};

/** query('select * from users where id = $1', [id]) -> pg result ({ rows, rowCount }) */
const query = (text, params) => getPool().query(text, params);

/** Run several statements atomically: await tx(async (q) => { await q('...'); await q('...'); }) */
const tx = async (fn) => {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const out = await fn((t, p) => client.query(t, p));
    await client.query('commit');
    return out;
  } catch (e) { await client.query('rollback').catch(() => {}); throw e; }
  finally { client.release(); }
};

const connectDB = async () => { await query('select 1'); console.log('Supabase Postgres connected'); };
const end = async () => { if (pool) { await pool.end(); pool = undefined; } };

module.exports = { query, tx, connectDB, end };