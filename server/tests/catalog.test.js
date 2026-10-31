require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { end, query } = require('../src/config/db');

let server;
let baseUrl;

// Headers for dev auth bypass
const adminHeaders = {
  'content-type': 'application/json',
  'x-dev-role': 'admin',
  'x-dev-user-id': '00000000-0000-0000-0000-000000000001',
};
const staffHeaders = {
  'content-type': 'application/json',
  'x-dev-role': 'staff',
  'x-dev-user-id': '00000000-0000-0000-0000-000000000002',
};

const req = async (method, path, body, headers = adminHeaders) => {
  const options = {
    method,
    headers,
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${baseUrl}${path}`, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {}
  return { status: res.status, data };
};

test.before(() => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}/api`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) server.close();
  await end();
});

test('1. Products CRUD & Staff write restrictions (403)', async () => {
  // Staff write attempt should return 403
  const staffAttempt = await req('POST', '/products', {
    name: 'Staff Unauthorized Product',
    salesPrice: 100,
  }, staffHeaders);
  assert.equal(staffAttempt.status, 403, 'Staff must get 403 on write');

  // Admin creates product with variants
  const createRes = await req('POST', '/products', {
    name: 'Brightloop CRM Core',
    type: 'software',
    salesPrice: 1000,
    costPrice: 200,
    notes: 'Base CRM module',
    variants: [
      { attribute: 'Brand', value: 'Odoo', extraPrice: 560 },
      { attribute: 'Tier', value: 'Pro', extraPrice: 300 },
    ],
  });
  assert.equal(createRes.status, 201);
  const prod = createRes.data;
  assert.equal(prod.name, 'Brightloop CRM Core');
  assert.equal(prod.salesPrice, 1000);
  assert.equal(prod.variants.length, 2);

  // Staff can read products list
  const staffRead = await req('GET', '/products?search=Brightloop+CRM', null, staffHeaders);
  assert.equal(staffRead.status, 200);
  assert.ok(staffRead.data.items.length >= 1);

  // Admin updates product
  const updateRes = await req('PATCH', `/products/${prod.id}`, { salesPrice: 1200 });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.data.salesPrice, 1200);

  // Admin deletes product
  const deleteRes = await req('DELETE', `/products/${prod.id}`);
  assert.equal(deleteRes.status, 200);
});

test('2. Plans CRUD, Public route, and Lifecycle status transitions', async () => {
  // Create a plan with closable: false, pausable: true, renewable: true
  const createRes = await req('POST', '/plans', {
    name: 'Unclosable Monthly Pro',
    price: 499,
    billingPeriod: 'monthly',
    minQty: 1,
    closable: false,
    pausable: true,
    renewable: true,
    status: 'active',
  });
  assert.equal(createRes.status, 201);
  const plan = createRes.data;

  // Public route (no auth) returns this plan
  const pubRes = await req('GET', '/plans/public', null, {});
  assert.equal(pubRes.status, 200);
  assert.ok(Array.isArray(pubRes.data));
  const foundInPublic = pubRes.data.some((p) => p.id === plan.id);
  assert.ok(foundInPublic, 'Plan should appear in public list');

  // Attempt to close plan when closable=false -> should fail 400
  const closeRes = await req('PATCH', `/plans/${plan.id}/status`, { action: 'close' });
  assert.equal(closeRes.status, 400);
  assert.match(closeRes.data.message, /not.*closable/i);

  // Pause plan when pausable=true -> should succeed 200
  const pauseRes = await req('PATCH', `/plans/${plan.id}/status`, { action: 'pause' });
  assert.equal(pauseRes.status, 200);
  assert.equal(pauseRes.data.status, 'paused');

  // Resume plan -> sets active
  const resumeRes = await req('PATCH', `/plans/${plan.id}/status`, { action: 'resume' });
  assert.equal(resumeRes.status, 200);
  assert.equal(resumeRes.data.status, 'active');

  // Renew plan -> sets active and applies new endDate
  const newEndDate = new Date(Date.now() + 86400000 * 365).toISOString();
  const renewRes = await req('PATCH', `/plans/${plan.id}/status`, { action: 'renew', endDate: newEndDate });
  assert.equal(renewRes.status, 200);
  assert.equal(renewRes.data.status, 'active');

  // Cleanup
  await req('DELETE', `/plans/${plan.id}`);
});

test('3. Taxes CRUD & validation', async () => {
  const staffAttempt = await req('POST', '/taxes', { name: 'VAT 18', rate: 18 }, staffHeaders);
  assert.equal(staffAttempt.status, 403);

  const createRes = await req('POST', '/taxes', { name: 'GST 18', rate: 18 });
  assert.equal(createRes.status, 201);
  const tax = createRes.data;
  assert.equal(tax.name, 'GST 18');
  assert.equal(tax.rate, 18);

  const listRes = await req('GET', '/taxes', null, staffHeaders);
  assert.equal(listRes.status, 200);
  assert.ok(listRes.data.items.length >= 1);

  await req('DELETE', `/taxes/${tax.id}`);
});

test('4. Discounts validation (sanity: percent <= 100) & CRUD', async () => {
  // Invalid discount percent > 100
  const invalidRes = await req('POST', '/discounts', {
    name: 'Too high',
    type: 'percent',
    value: 120,
  });
  assert.equal(invalidRes.status, 400);

  // Valid discount
  const createRes = await req('POST', '/discounts', {
    name: 'Festive Offer',
    type: 'percent',
    value: 20,
    minPurchase: 100,
    appliesTo: 'subscription',
  });
  assert.equal(createRes.status, 201);
  const disc = createRes.data;
  assert.equal(disc.value, 20);

  await req('DELETE', `/discounts/${disc.id}`);
});

test('5. Quotation Templates with plan and product reference validation', async () => {
  // Template with non-existent plan must fail 400
  const badPlanRes = await req('POST', '/templates', {
    name: 'Bad Template',
    plan: '00000000-0000-0000-0000-000000000999',
    lines: [{ product: '00000000-0000-0000-0000-000000000888', quantity: 1 }],
  });
  assert.equal(badPlanRes.status, 400);

  // Create real product and real plan first
  const prod = (await req('POST', '/products', { name: 'Tmpl Prod', salesPrice: 50 })).data;
  const plan = (await req('POST', '/plans', { name: 'Tmpl Plan', price: 99, billingPeriod: 'monthly' })).data;

  // Create template with valid references
  const tmplRes = await req('POST', '/templates', {
    name: 'Standard Onboarding',
    validityDays: 15,
    plan: plan.id,
    lines: [{ product: prod.id, variantValue: null, quantity: 2 }],
  });
  assert.equal(tmplRes.status, 201);
  assert.equal(tmplRes.data.validityDays, 15);
  assert.equal(tmplRes.data.lines.length, 1);

  // Cleanup
  await req('DELETE', `/templates/${tmplRes.data.id}`);
  await req('DELETE', `/plans/${plan.id}`);
  await req('DELETE', `/products/${prod.id}`);
});
