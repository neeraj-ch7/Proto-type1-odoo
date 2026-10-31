require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert');
const { getUnitPrice, calculateTotals, getEligibleDiscounts, consumeDiscounts } = require('../src/services/pricing.service');
const { query } = require('../src/config/db');
const Discount = require('../src/models/Discount');

test('1. Variant pricing in getUnitPrice', () => {
  const product = {
    name: 'ERP Module',
    salesPrice: 1000,
    variants: [
      { attribute: 'Brand', value: 'Odoo', extraPrice: 560 },
      { attribute: 'Tier', value: 'Enterprise', extraPrice: 200 },
    ],
  };

  // Base + matching variant
  assert.equal(getUnitPrice(product, 'Odoo'), 1560);
  assert.equal(getUnitPrice(product, 'Enterprise'), 1200);

  // Non-matching variant returns base price
  assert.equal(getUnitPrice(product, 'Unknown'), 1000);
  assert.equal(getUnitPrice(product, null), 1000);
  assert.equal(getUnitPrice(product, undefined), 1000);

  // Product without variants
  assert.equal(getUnitPrice({ salesPrice: 500 }, 'Odoo'), 500);
});

test('2. Fixed vs Percent discount calculation and tax after discount', () => {
  // Test Percent discount
  const lines1 = [
    { product: 'prod-1', quantity: 2, unitPrice: 100, taxRate: 10 }, // 200 base
  ];
  const percentDisc = {
    id: 'disc-pct',
    type: 'percent',
    value: 10,
    appliesTo: 'subscription',
  };

  const res1 = calculateTotals({ lines: lines1, discounts: [percentDisc] });
  assert.equal(res1.subtotal, 200);
  assert.equal(res1.discountAmount, 20); // 10% of 200
  assert.equal(res1.lines[0].discountShare, 20);
  assert.equal(res1.taxAmount, 18); // 10% of (200 - 20 = 180) -> 18
  assert.equal(res1.total, 198); // 180 + 18
  assert.deepEqual(res1.appliedDiscountIds, ['disc-pct']);

  // Test Fixed discount
  const fixedDisc = {
    id: 'disc-fix',
    type: 'fixed',
    value: 50,
    appliesTo: 'subscription',
  };

  const res2 = calculateTotals({ lines: lines1, discounts: [fixedDisc] });
  assert.equal(res2.subtotal, 200);
  assert.equal(res2.discountAmount, 50);
  assert.equal(res2.lines[0].discountShare, 50);
  assert.equal(res2.taxAmount, 15); // 10% of (200 - 50 = 150) -> 15
  assert.equal(res2.total, 165); // 150 + 15
  assert.deepEqual(res2.appliedDiscountIds, ['disc-fix']);
});

test('3. Product-scoped vs Subscription-scoped discounts', () => {
  const lines = [
    { product: 'prod-A', quantity: 1, unitPrice: 100, taxRate: 0 },
    { product: 'prod-B', quantity: 1, unitPrice: 100, taxRate: 0 },
  ];

  // Product discount: 20% off only prod-A
  const prodDisc = {
    id: 'disc-prodA',
    type: 'percent',
    value: 20,
    appliesTo: 'product',
    products: ['prod-A'],
  };

  // Subscription discount: 10% off entire subscription
  const subDisc = {
    id: 'disc-sub',
    type: 'percent',
    value: 10,
    appliesTo: 'subscription',
  };

  const res = calculateTotals({ lines, discounts: [prodDisc, subDisc] });
  assert.equal(res.subtotal, 200);

  // prod-A starts at 100 -> reduced by 20% (20) to 80.
  // prod-B starts at 100 -> untouched by prodDisc.
  // Remaining: prod-A has 80, prod-B has 100. Total available = 180.
  // subDisc is 10% of 180 = 18.
  // Prorated: prod-A gets 18 * 80 / 180 = 8.
  //           prod-B gets 18 * 100 / 180 = 10.
  // Total discount for prod-A = 20 + 8 = 28.
  // Total discount for prod-B = 10.
  assert.equal(res.lines[0].discountShare, 28);
  assert.equal(res.lines[1].discountShare, 10);
  assert.equal(res.discountAmount, 38);
  assert.equal(res.total, 162); // 200 - 38 = 162
  assert.deepEqual(res.appliedDiscountIds, ['disc-prodA', 'disc-sub']);
});

test('4. Tax is computed strictly on net amount after discounts', () => {
  const lines = [
    { product: 'prod-C', quantity: 1, unitPrice: 100, taxRate: 18 },
  ];
  const disc = {
    id: 'disc-20',
    type: 'fixed',
    value: 20,
    appliesTo: 'subscription',
  };

  const res = calculateTotals({ lines, discounts: [disc] });
  // Base = 100, Discount = 20 -> Net = 80
  // Tax = 18% of 80 = 14.40
  // Total = 80 + 14.40 = 94.40
  assert.equal(res.subtotal, 100);
  assert.equal(res.discountAmount, 20);
  assert.equal(res.taxAmount, 14.4);
  assert.equal(res.total, 94.4);
});

test('5. getEligibleDiscounts and consumeDiscounts with database', async () => {
  const timestamp = Date.now();
  const testProdId = '00000000-0000-0000-0000-' + String(timestamp).slice(-12).padStart(12, '0');

  // Insert test discounts
  const d1 = await Discount.create({
    name: `Test Active Sub ${timestamp}`,
    type: 'percent',
    value: 15,
    appliesTo: 'subscription',
    active: true,
  });

  const dExpired = await Discount.create({
    name: `Test Expired ${timestamp}`,
    type: 'percent',
    value: 50,
    startDate: new Date(Date.now() - 200000).toISOString(),
    endDate: new Date(Date.now() - 100000).toISOString(),
    appliesTo: 'subscription',
    active: true,
  });

  const dUsageLimitReached = await Discount.create({
    name: `Test Limit Reached ${timestamp}`,
    type: 'fixed',
    value: 10,
    usageLimit: 2,
    timesUsed: 2,
    appliesTo: 'subscription',
    active: true,
  });

  const dUsageAvailable = await Discount.create({
    name: `Test Limit Available ${timestamp}`,
    type: 'fixed',
    value: 10,
    usageLimit: 2,
    timesUsed: 1,
    appliesTo: 'subscription',
    active: true,
  });

  const dMinReq = await Discount.create({
    name: `Test Min Req ${timestamp}`,
    type: 'fixed',
    value: 25,
    minPurchase: 500,
    minQty: 5,
    appliesTo: 'subscription',
    active: true,
  });

  const dProdScoped = await Discount.create({
    name: `Test Prod Scoped ${timestamp}`,
    type: 'percent',
    value: 30,
    appliesTo: 'product',
    products: [testProdId],
    active: true,
  });

  try {
    // Case A: Lines with small amount and qty, different product
    const smallLines = [
      { product: 'different-prod-id', quantity: 2, unitPrice: 50 }, // subtotal 100, qty 2
    ];

    const eligibleSmall = await getEligibleDiscounts({ lines: smallLines });
    const eligibleSmallIds = eligibleSmall.map((x) => x.id);

    // Active sub & Usage Available should be eligible
    assert.ok(eligibleSmallIds.includes(d1.id), 'Active discount d1 should be eligible');
    assert.ok(eligibleSmallIds.includes(dUsageAvailable.id), 'Usage available should be eligible');

    // Expired, limit reached, minReq, prodScoped should NOT be eligible
    assert.ok(!eligibleSmallIds.includes(dExpired.id), 'Expired discount should not be eligible');
    assert.ok(!eligibleSmallIds.includes(dUsageLimitReached.id), 'Limit reached discount should not be eligible');
    assert.ok(!eligibleSmallIds.includes(dMinReq.id), 'Min req not met should not be eligible');
    assert.ok(!eligibleSmallIds.includes(dProdScoped.id), 'Product mismatch should not be eligible');

    // Case B: Lines that meet minPurchase (600), minQty (6), and have matching product
    const bigLines = [
      { product: testProdId, quantity: 6, unitPrice: 100 }, // subtotal 600, qty 6
    ];

    const eligibleBig = await getEligibleDiscounts({ lines: bigLines });
    const eligibleBigIds = eligibleBig.map((x) => x.id);

    assert.ok(eligibleBigIds.includes(dMinReq.id), 'Min req should be met');
    assert.ok(eligibleBigIds.includes(dProdScoped.id), 'Product-scoped should match');

    // Case C: Test atomic consumeDiscounts
    // dUsageAvailable had usageLimit: 2, timesUsed: 1
    const consumed1 = await consumeDiscounts([dUsageAvailable.id]);
    assert.deepEqual(consumed1, [dUsageAvailable.id], 'First consumption should succeed');

    // Now timesUsed = 2, so limit is reached
    const consumed2 = await consumeDiscounts([dUsageAvailable.id]);
    assert.deepEqual(consumed2, [], 'Second consumption should fail since limit reached');
  } finally {
    // Cleanup test discounts
    await query('DELETE FROM discounts WHERE id = ANY($1)', [
      [d1.id, dExpired.id, dUsageLimitReached.id, dUsageAvailable.id, dMinReq.id, dProdScoped.id],
    ]);
  }
});

test.after(async () => {
  const { end } = require('../src/config/db');
  await end();
});

