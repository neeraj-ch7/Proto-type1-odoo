// Creates all tables in Supabase from sql/schema.sql. Idempotent: safe to run again.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
(async () => {
  await db.query(fs.readFileSync(path.join(__dirname, '../../sql/schema.sql'), 'utf8'));
  const t = await db.query("select table_name from information_schema.tables where table_schema = 'public' order by 1");
  console.log('Schema ready. Tables:', t.rows.map((r) => r.table_name).join(', '));
  await db.end();
})().catch((e) => { console.error('db:init failed:', e.message); process.exit(1); });