require('dotenv').config();
const http = require('http');
const app = require('../app');
const { query } = require('../config/db');

const PORT = 5099;

const runTiming = async () => {
  console.log('--- BRIGHTLOOP PERFORMANCE BENCHMARK ---');

  // Find a customer id and invoice id for targeted tests
  const custRes = await query(`SELECT id FROM users WHERE email = 'customer1@example.com' LIMIT 1`);
  const customerId = custRes.rows[0]?.id;

  const invRes = await query(`SELECT id FROM invoices WHERE customer_id = $1 LIMIT 1`, [customerId]);
  const sampleInvoiceId = invRes.rows[0]?.id;

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Test server running on port ${PORT}\n`);

  const tests = [
    {
      name: 'GET /api/dashboard/summary (all)',
      url: `http://localhost:${PORT}/api/dashboard/summary`,
      headers: { 'x-dev-role': 'admin', 'x-dev-user-id': '00000000-0000-0000-0000-000000000001' },
    },
    {
      name: 'GET /api/dashboard/summary (filtered by customer)',
      url: `http://localhost:${PORT}/api/dashboard/summary?customer=${customerId}`,
      headers: { 'x-dev-role': 'admin', 'x-dev-user-id': '00000000-0000-0000-0000-000000000001' },
    },
    {
      name: 'GET /api/subscriptions (page 1)',
      url: `http://localhost:${PORT}/api/subscriptions?page=1&limit=20`,
      headers: { 'x-dev-role': 'admin', 'x-dev-user-id': '00000000-0000-0000-0000-000000000001' },
    },
    {
      name: 'GET /api/subscriptions (status=active)',
      url: `http://localhost:${PORT}/api/subscriptions?status=active&page=1&limit=20`,
      headers: { 'x-dev-role': 'admin', 'x-dev-user-id': '00000000-0000-0000-0000-000000000001' },
    },
    {
      name: 'GET /api/invoices (all, page 1)',
      url: `http://localhost:${PORT}/api/invoices?page=1&limit=20`,
      headers: { 'x-dev-role': 'admin', 'x-dev-user-id': '00000000-0000-0000-0000-000000000001' },
    },
    {
      name: 'GET /api/invoices (status=confirmed)',
      url: `http://localhost:${PORT}/api/invoices?status=confirmed&page=1&limit=20`,
      headers: { 'x-dev-role': 'admin', 'x-dev-user-id': '00000000-0000-0000-0000-000000000001' },
    },
    {
      name: 'GET /api/invoices (status=paid)',
      url: `http://localhost:${PORT}/api/invoices?status=paid&page=1&limit=20`,
      headers: { 'x-dev-role': 'admin', 'x-dev-user-id': '00000000-0000-0000-0000-000000000001' },
    },
    {
      name: 'GET /api/invoices (status=overdue)',
      url: `http://localhost:${PORT}/api/invoices?status=overdue&page=1&limit=20`,
      headers: { 'x-dev-role': 'admin', 'x-dev-user-id': '00000000-0000-0000-0000-000000000001' },
    },
    {
      name: 'GET /api/invoices (status=draft)',
      url: `http://localhost:${PORT}/api/invoices?status=draft&page=1&limit=20`,
      headers: { 'x-dev-role': 'admin', 'x-dev-user-id': '00000000-0000-0000-0000-000000000001' },
    },
    {
      name: 'GET /api/payments (page 1, limit 20)',
      url: `http://localhost:${PORT}/api/payments?page=1&limit=20`,
      headers: { 'x-dev-role': 'admin', 'x-dev-user-id': '00000000-0000-0000-0000-000000000001' },
    },
    {
      name: 'GET /api/me/subscriptions (customer scoped)',
      url: `http://localhost:${PORT}/api/me/subscriptions?page=1&limit=20`,
      headers: { 'x-dev-role': 'customer', 'x-dev-user-id': customerId },
    },
    {
      name: 'GET /api/me/invoices (customer scoped)',
      url: `http://localhost:${PORT}/api/me/invoices?page=1&limit=20`,
      headers: { 'x-dev-role': 'customer', 'x-dev-user-id': customerId },
    },
    {
      name: 'GET /api/me/invoices/:id (customer scoped)',
      url: `http://localhost:${PORT}/api/me/invoices/${sampleInvoiceId}`,
      headers: { 'x-dev-role': 'customer', 'x-dev-user-id': customerId },
    },
  ];

  console.log('| Endpoint / Query | Status | Time (ms) | Target (<2000ms) | Result |');
  console.log('|---|---|---|---|---|');

  let allPassed = true;

  for (const t of tests) {
    const start = performance.now();
    try {
      const res = await fetch(t.url, { headers: t.headers });
      const duration = Math.round(performance.now() - start);
      const isOk = res.status >= 200 && res.status < 300 && duration < 2000;
      if (!isOk) allPassed = false;
      const statusIcon = isOk ? 'PASS' : 'FAIL';
      console.log(
        `| ${t.name.padEnd(45)} | ${res.status} | ${String(duration).padStart(6)} ms | < 2000 ms | ${statusIcon} |`
      );
    } catch (e) {
      allPassed = false;
      console.log(`| ${t.name.padEnd(45)} | ERR | ${e.message} | < 2000 ms | FAIL |`);
    }
  }

  server.close();
  console.log('\n=========================================');
  if (allPassed) {
    console.log('🏆 ALL ENDPOINT TIMINGS ARE UNDER 2000 MS!');
  } else {
    console.log('⚠️ SOME ENDPOINTS EXCEEDED TIMING BUDGET');
  }
  console.log('=========================================\n');
  process.exit(allPassed ? 0 : 1);
};

runTiming().catch((e) => {
  console.error('Performance benchmark error:', e);
  process.exit(1);
});
