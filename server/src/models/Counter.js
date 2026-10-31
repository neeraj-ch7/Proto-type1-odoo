// Atomic counters (replaces the Mongoose Counter model). Table: counters.
const { query } = require('../config/db');

// One statement = atomic, safe under concurrency (insert-or-increment, returns the new value).
const next = async (key) =>
  (await query(
    `insert into counters (key, seq) values ($1, 1)
     on conflict (key) do update set seq = counters.seq + 1, updated_at = now()
     returning seq`, [key])).rows[0].seq;

module.exports = { next };