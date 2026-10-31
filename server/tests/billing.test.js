process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.DEV_AUTH = 'true';

const test = require('node:test');
const assert = require('node:assert');
const { addPeriod } = require('../src/utils/period');
const pricing = require('../src/services/pricing.service');

// 1. Tests for Period Math
test('Period Math: Daily, Weekly, Monthly, Yearly', () => {
  const d = new Date('2026-01-31T00:00:00.000Z');

  // Daily
  const day1 = addPeriod(d, 'daily');
  assert.equal(day1.toISOString(), '2026-02-01T00:00:00.000Z');

  // Weekly
  const week1 = addPeriod(d, 'weekly');
  assert.equal(week1.toISOString(), '2026-02-07T00:00:00.000Z');

  // Monthly on month-end Jan 31 -> Feb 28
  const month1 = addPeriod(d, 'monthly');
  assert.equal(month1.toISOString(), '2026-02-28T00:00:00.000Z');

  // Monthly in leap year Jan 31 2024 -> Feb 29 2024
  const leapJan = new Date('2024-01-31T00:00:00.000Z');
  const leapFeb = addPeriod(leapJan, 'monthly');
  assert.equal(leapFeb.toISOString(), '2024-02-29T00:00:00.000Z');

  // Yearly on leap day Feb 29 2024 -> Feb 28 2025
  const leapDay = new Date('2024-02-29T00:00:00.000Z');
  const nextYear = addPeriod(leapDay, 'yearly');
  assert.equal(nextYear.toISOString(), '2025-02-28T00:00:00.000Z');
});

// 2. Subscription Lifecycle State Machine Transitions
test('Subscription Lifecycle Transitions', () => {
  const isValidTransition = (current, target) => {
    if (current === target) return true;
    if (current === 'closed') return false;
    if (target === 'closed') return true;

    const flow = {
      draft: ['quotation', 'confirmed'],
      quotation: ['confirmed'],
      confirmed: ['active'],
      active: ['closed'],
    };
    return (flow[current] || []).includes(target);
  };

  // Valid forward path
  assert.ok(isValidTransition('draft', 'quotation'));
  assert.ok(isValidTransition('quotation', 'confirmed'));
  assert.ok(isValidTransition('confirmed', 'active'));
  assert.ok(isValidTransition('active', 'closed'));

  // Cancel / early close from any non-closed status
  assert.ok(isValidTransition('draft', 'closed'));
  assert.ok(isValidTransition('quotation', 'closed'));
  assert.ok(isValidTransition('confirmed', 'closed'));

  // Invalid backward / skip transitions
  assert.equal(isValidTransition('closed', 'active'), false);
  assert.equal(isValidTransition('closed', 'draft'), false);
  assert.equal(isValidTransition('active', 'confirmed'), false);
  assert.equal(isValidTransition('confirmed', 'draft'), false);
});

// 3. Quotation Expiry Check
test('Quotation Expiry Check on Confirm', () => {
  const isQuotationExpired = (quotationValidUntil) => {
    if (!quotationValidUntil) return false;
    return new Date(quotationValidUntil) < new Date();
  };

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  assert.equal(isQuotationExpired(yesterday), true, 'Past validity date must be expired');
  assert.equal(isQuotationExpired(tomorrow), false, 'Future validity date is active');
});

// 4. Pricing Snapshot and Line Calculation
test('Pricing Snapshots and Total Calculations', () => {
  const product = {
    salesPrice: 1000,
    variants: [{ attribute: 'Brand', value: 'Odoo', extraPrice: 560 }],
  };

  const unitPrice = pricing.getUnitPrice(product, 'Odoo');
  assert.equal(unitPrice, 1560, 'Variant price should add extraPrice to salesPrice');

  const lines = [
    { product: 'p1', quantity: 2, unitPrice: 1560, taxRate: 18 },
  ];

  const discounts = [
    { id: 'd1', type: 'percent', value: 10, appliesTo: 'subscription' },
  ];

  const totals = pricing.calculateTotals({ lines, discounts });
  assert.equal(totals.subtotal, 3120);
  assert.equal(totals.discountAmount, 312); // 10% of 3120
  // Net = 3120 - 312 = 2808. Tax = 18% of 2808 = 505.44
  assert.equal(totals.taxAmount, 505.44);
  assert.equal(totals.total, 3313.44);
});

// 5. Billing Catch-up Multi-Period Simulation
test('Billing Catch-Up: 3 missed months generates 3 periods and advances date', () => {
  let nextInvoiceDate = new Date('2026-01-01T00:00:00.000Z');
  const asOf = new Date('2026-03-15T00:00:00.000Z');
  const billingPeriod = 'monthly';
  const periods = [];

  while (nextInvoiceDate <= asOf) {
    const periodStart = new Date(nextInvoiceDate);
    const periodEnd = addPeriod(periodStart, billingPeriod);
    periods.push({
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
    });
    nextInvoiceDate = periodEnd;
  }

  assert.equal(periods.length, 3, 'Should bill 3 missed months (Jan, Feb, Mar)');
  assert.equal(periods[0].start, '2026-01-01T00:00:00.000Z');
  assert.equal(periods[0].end, '2026-02-01T00:00:00.000Z');
  assert.equal(periods[1].start, '2026-02-01T00:00:00.000Z');
  assert.equal(periods[1].end, '2026-03-01T00:00:00.000Z');
  assert.equal(periods[2].start, '2026-03-01T00:00:00.000Z');
  assert.equal(periods[2].end, '2026-04-01T00:00:00.000Z');
  assert.equal(nextInvoiceDate.toISOString(), '2026-04-01T00:00:00.000Z');
});

// 6. Subscription Auto-Close upon Expiry
test('Billing Engine: Auto-closes subscription when period reaches expiryDate', () => {
  let nextInvoiceDate = new Date('2026-01-01T00:00:00.000Z');
  const expiryDate = new Date('2026-02-01T00:00:00.000Z');
  const asOf = new Date('2026-05-01T00:00:00.000Z');
  let status = 'active';

  let count = 0;
  while (nextInvoiceDate <= asOf && status === 'active') {
    const periodStart = new Date(nextInvoiceDate);
    const periodEnd = addPeriod(periodStart, 'monthly');
    count++;

    if (expiryDate && periodEnd >= expiryDate) {
      status = 'closed';
    }
    nextInvoiceDate = periodEnd;
  }

  assert.equal(count, 1, 'Only 1 period before expiryDate should be billed');
  assert.equal(status, 'closed', 'Status should become closed');
});

// 7. Invoice Lifecycle Constraints
test('Invoice Lifecycle: confirmation and cancellation rules', () => {
  // Confirm allowed only from draft
  const canConfirm = (status) => status === 'draft';
  assert.ok(canConfirm('draft'));
  assert.equal(canConfirm('confirmed'), false);
  assert.equal(canConfirm('paid'), false);

  // Cancel allowed only if draft or confirmed with amountPaid = 0
  const canCancel = (status, amountPaid) => {
    if (status === 'cancelled') return false;
    if (status === 'paid') return false;
    if (Number(amountPaid) > 0) return false;
    return status === 'draft' || status === 'confirmed';
  };

  assert.ok(canCancel('draft', 0));
  assert.ok(canCancel('confirmed', 0));
  assert.equal(canCancel('confirmed', 100), false, 'Cannot cancel when amountPaid > 0');
  assert.equal(canCancel('paid', 500), false, 'Cannot cancel paid invoice');
});

