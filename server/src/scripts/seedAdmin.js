require('dotenv').config();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const db = require('../config/db');
(async () => {
  const email = 'admin@brightloop.com';
  if (await User.exists(email)) console.log('Admin already exists');
  else { await User.create({ email, role: 'admin', name: 'Admin', passwordHash: await bcrypt.hash('Admin@12345', 10) }); console.log('Admin created: admin@brightloop.com / Admin@12345'); }
  await db.end();
})().catch((e) => { console.error('seed:admin failed:', e.message); process.exit(1); });