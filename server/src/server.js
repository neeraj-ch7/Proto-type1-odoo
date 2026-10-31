require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
if (!process.env.JWT_SECRET) { console.error('JWT_SECRET is required (see .env.example)'); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is required: your Supabase Postgres connection string (see .env.example)'); process.exit(1); }
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'change_me') { console.error('Refusing to start in production with the default JWT_SECRET'); process.exit(1); }
if (process.env.DEV_AUTH === 'true') console.warn('[warn] DEV_AUTH=true: x-dev-role / x-dev-user-id headers bypass login. Turn it off before demo/deploy.');
const port = process.env.PORT || 5000;
connectDB().then(() => app.listen(port, () => console.log(`API on :${port}`))).catch((e) => { console.error('Database connection failed:', e.message); process.exit(1); });