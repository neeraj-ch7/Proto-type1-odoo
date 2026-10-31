require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, tx, end } = require('../config/db');
const { round2, add, mul } = require('../utils/money');
const crypto = require('crypto');

const BATCH_SIZE = 1000;

const runSeed = async () => {
  const force = process.argv.includes('--force');

  console.log('--- BRIGHTLOOP SYSTEM SEED SCRIPT ---');

  if (!force) {
    const existingCount = await query('SELECT count(*) as count FROM users WHERE role != $1', ['admin']);
    if (Number(existingCount.rows[0].count) > 0) {
      console.error(
        'Non-admin data already exists in database. To wipe and re-seed, run: npm run seed -- --force'
      );
      process.exit(1);
    }
  }

  console.log('1. Cleaning existing non-admin data...');
  // Delete in reverse foreign key order
  await query('DELETE FROM payments');
  await query('DELETE FROM invoices');
  await query('DELETE FROM subscriptions');
  await query('DELETE FROM quotation_templates');
  await query('DELETE FROM discounts');
  await query('DELETE FROM taxes');
  await query('DELETE FROM plans');
  await query('DELETE FROM products');
  await query(`DELETE FROM users WHERE role != 'admin'`);

  // Ensure Admin exists
  console.log('2. Provisioning Admin & Staff...');
  const adminEmail = 'admin@brightloop.com';
  let adminRes = await query(`SELECT id FROM users WHERE email = $1`, [adminEmail]);
  let adminId;
  const adminHash = await bcrypt.hash('Admin@12345', 10);
  if (adminRes.rows.length === 0) {
    const ins = await query(
      `INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      [adminEmail, 'Brightloop Admin', adminHash, 'admin']
    );
    adminId = ins.rows[0].id;
    console.log('   Created Admin: admin@brightloop.com / Admin@12345');
  } else {
    adminId = adminRes.rows[0].id;
    console.log('   Using existing Admin:', adminId);
  }

  // 2 Staff members
  const staffHash = await bcrypt.hash('Staff@1234', 10);
  const staffRes = await query(
    `INSERT INTO users (email, name, password_hash, role) VALUES
     ('staff1@example.com', 'Alex Morgan (Staff)', $1, 'staff'),
     ('staff2@example.com', 'Elena Vance (Staff)', $1, 'staff')
     RETURNING id, email`,
    [staffHash]
  );
  const staffIds = staffRes.rows.map((r) => r.id);
  console.log('   Created 2 Staff: staff1@example.com / Staff@1234, staff2@example.com / Staff@1234');

  // 200 Customers: compute bcrypt hash ONCE!
  console.log('3. Provisioning 200 Customers (single bcrypt computation)...');
  const customerHash = await bcrypt.hash('Customer@123', 10);
  const customerValues = [];
  const customerParams = [customerHash];
  for (let i = 1; i <= 200; i++) {
    const email = `customer${i}@example.com`;
    const name = `Enterprise Client ${i}`;
    const pIdx = customerParams.length;
    customerParams.push(email, name);
    customerValues.push(`($${pIdx + 1}, $${pIdx + 2}, $1, 'customer')`);
  }
  const custRes = await query(
    `INSERT INTO users (email, name, password_hash, role)
     VALUES ${customerValues.join(',')}
     RETURNING id, email`,
    customerParams
  );
  const customerIds = custRes.rows.map((r) => r.id);
  console.log(`   Created ${customerIds.length} Customers (Demo: customer1@example.com / Customer@123)`);

  // 4. Products with variants
  console.log('4. Provisioning 5 Products with variants...');
  const productsData = [
    {
      name: 'Brightloop CRM Core',
      type: 'software',
      salesPrice: 1000,
      costPrice: 200,
      notes: 'Customer relationship module',
      variants: [
        { attribute: 'Brand', value: 'Odoo', extraPrice: 560 },
        { attribute: 'Brand', value: 'Custom', extraPrice: 250 },
      ],
    },
    {
      name: 'Automated Invoicing Engine',
      type: 'service',
      salesPrice: 800,
      costPrice: 150,
      notes: 'Automated recurring billing generation with tax deduction',
      variants: [
        { attribute: 'Tier', value: 'Standard', extraPrice: 0 },
        { attribute: 'Tier', value: 'Enterprise Priority', extraPrice: 400 },
      ],
    },
    {
      name: 'Inventory Sync Connector',
      type: 'software',
      salesPrice: 1200,
      costPrice: 300,
      notes: 'Real-time stock ledger synchronization',
      variants: [
        { attribute: 'SyncMode', value: 'Realtime', extraPrice: 300 },
        { attribute: 'SyncMode', value: 'Batch', extraPrice: 0 },
      ],
    },
    {
      name: 'HR & Payroll Suite',
      type: 'software',
      salesPrice: 1500,
      costPrice: 400,
      notes: 'Employee salary ledger and tax deductions',
      variants: [
        { attribute: 'Edition', value: 'Pro', extraPrice: 500 },
        { attribute: 'Edition', value: 'Basic', extraPrice: 0 },
      ],
    },
    {
      name: 'Multi-Cloud Backup & Security',
      type: 'service',
      salesPrice: 600,
      costPrice: 100,
      notes: 'Encrypted off-site snapshot backups',
      variants: [
        { attribute: 'Storage', value: '1TB', extraPrice: 200 },
        { attribute: 'Storage', value: '5TB', extraPrice: 800 },
      ],
    },
  ];

  const productIds = [];
  for (const p of productsData) {
    const res = await query(
      `INSERT INTO products (name, type, sales_price, cost_price, notes, active, variants)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING id`,
      [p.name, p.type, p.salesPrice, p.costPrice, p.notes, JSON.stringify(p.variants)]
    );
    productIds.push(res.rows[0].id);
  }
  console.log(`   Created ${productIds.length} Products`);

  // 5. Plans
  console.log('5. Provisioning 3 Plans...');
  const plansData = [
    { name: 'Starter Monthly', price: 999, billingPeriod: 'monthly', minQty: 1 },
    { name: 'Professional Yearly', price: 9999, billingPeriod: 'yearly', minQty: 1 },
    { name: 'Weekly Sprint', price: 299, billingPeriod: 'weekly', minQty: 1 },
  ];
  const planIds = [];
  for (const pl of plansData) {
    const res = await query(
      `INSERT INTO plans (name, price, billing_period, min_qty, closable, pausable, renewable, status)
       VALUES ($1, $2, $3, $4, true, true, true, 'active')
       RETURNING id`,
      [pl.name, pl.price, pl.billingPeriod, pl.minQty]
    );
    planIds.push(res.rows[0].id);
  }
  console.log(`   Created ${planIds.length} Plans`);

  // 6. Taxes
  console.log('6. Provisioning 2 Taxes...');
  const t1 = await query(`INSERT INTO taxes (name, rate, active) VALUES ('GST 18%', 18.00, true) RETURNING id`);
  const t2 = await query(`INSERT INTO taxes (name, rate, active) VALUES ('Service Cess 5%', 5.00, true) RETURNING id`);
  const taxIds = [t1.rows[0].id, t2.rows[0].id];
  console.log(`   Created 2 Taxes: GST 18%, Service Cess 5%`);

  // 7. Discounts
  console.log('7. Provisioning 3 Discounts...');
  const d1 = await query(
    `INSERT INTO discounts (name, type, value, min_purchase, applies_to, active)
     VALUES ('Early Bird 10%', 'percent', 10, 0, 'subscription', true) RETURNING id`
  );
  const d2 = await query(
    `INSERT INTO discounts (name, type, value, min_purchase, applies_to, active)
     VALUES ('Loyalty Flat 500', 'fixed', 500, 1000, 'subscription', true) RETURNING id`
  );
  const d3 = await query(
    `INSERT INTO discounts (name, type, value, min_purchase, applies_to, active, products)
     VALUES ('CRM Promo 15%', 'percent', 15, 0, 'product', true, $1) RETURNING id`,
    [[productIds[0]]]
  );
  console.log(`   Created 3 Discounts`);

  // 8. Quotation Templates
  console.log('8. Provisioning 2 Quotation Templates...');
  await query(
    `INSERT INTO quotation_templates (name, validity_days, plan_id, lines)
     VALUES ('SaaS Standard Stack', 30, $1, $2),
            ('Enterprise Full ERP Stack', 45, $3, $4)`,
    [
      planIds[0],
      JSON.stringify([
        { product: productIds[0], variantValue: 'Odoo', quantity: 1 },
        { product: productIds[1], variantValue: 'Standard', quantity: 1 },
      ]),
      planIds[1],
      JSON.stringify([
        { product: productIds[0], variantValue: 'Custom', quantity: 2 },
        { product: productIds[2], variantValue: 'Realtime', quantity: 1 },
        { product: productIds[3], variantValue: 'Pro', quantity: 1 },
      ]),
    ]
  );
  console.log(`   Created 2 Quotation Templates`);

  // 9. 5,000+ Subscriptions
  const TOTAL_SUBSCRIPTIONS = 5200;
  console.log(`9. Generating and batch inserting ${TOTAL_SUBSCRIPTIONS} Subscriptions...`);

  const subStatuses = ['active', 'active', 'active', 'active', 'active', 'active', 'confirmed', 'quotation', 'draft', 'closed'];
  const generatedSubIds = [];
  const subRows = [];

  const now = new Date();

  for (let i = 1; i <= TOTAL_SUBSCRIPTIONS; i++) {
    const subId = crypto.randomUUID();
    generatedSubIds.push(subId);

    const subNumber = `SUB-${String(i).padStart(4, '0')}`;
    const custId = customerIds[i % customerIds.length];
    const planId = planIds[i % planIds.length];
    const status = subStatuses[i % subStatuses.length];

    const startOffsetDays = Math.floor(Math.random() * 180) + 1;
    const startDate = new Date(now.getTime() - startOffsetDays * 86400000);
    const expiryDate = new Date(startDate.getTime() + 365 * 86400000);
    const nextInvoiceDate = status === 'active' ? new Date(now.getTime() + (i % 30) * 86400000) : null;
    const quotationValidUntil = status === 'quotation' ? new Date(now.getTime() + 15 * 86400000) : null;

    const prodId1 = productIds[i % productIds.length];
    const prodId2 = productIds[(i + 1) % productIds.length];
    const taxId = taxIds[i % taxIds.length];

    const lines = [
      {
        product: prodId1,
        variantValue: 'Default',
        description: `Software Service ${i % 5 + 1}`,
        quantity: 1,
        unitPrice: 1000,
        tax: taxId,
        taxRate: 18,
        amount: 1000,
      },
      {
        product: prodId2,
        variantValue: 'Standard',
        description: `Addon Module ${((i + 1) % 5) + 1}`,
        quantity: 1,
        unitPrice: 500,
        tax: taxId,
        taxRate: 18,
        amount: 500,
      },
    ];

    subRows.push({
      id: subId,
      number: subNumber,
      customer_id: custId,
      plan_id: planId,
      start_date: startDate.toISOString(),
      expiry_date: expiryDate.toISOString(),
      payment_terms: 15,
      status,
      next_invoice_date: nextInvoiceDate ? nextInvoiceDate.toISOString() : null,
      quotation_valid_until: quotationValidUntil ? quotationValidUntil.toISOString() : null,
      notes: `Subscription ${subNumber} - enterprise deployment`,
      lines: JSON.stringify(lines),
    });
  }

  // Batch insert subscriptions in chunks of BATCH_SIZE
  for (let i = 0; i < subRows.length; i += BATCH_SIZE) {
    const chunk = subRows.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    chunk.forEach((s) => {
      const idx = params.length;
      params.push(
        s.id,
        s.number,
        s.customer_id,
        s.plan_id,
        s.start_date,
        s.expiry_date,
        s.payment_terms,
        s.status,
        s.next_invoice_date,
        s.quotation_valid_until,
        s.notes,
        s.lines
      );
      values.push(
        `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9}, $${idx + 10}, $${idx + 11}, $${idx + 12})`
      );
    });

    await query(
      `INSERT INTO subscriptions (
         id, number, customer_id, plan_id, start_date, expiry_date,
         payment_terms, status, next_invoice_date, quotation_valid_until,
         notes, lines
       ) VALUES ${values.join(',')}`,
      params
    );
    console.log(`   Inserted subscriptions ${i + 1} to ${i + chunk.length}`);
  }

  // 10. ~15,000 Invoices across draft, confirmed, paid, cancelled
  const TOTAL_INVOICES = 15000;
  console.log(`10. Generating and batch inserting ${TOTAL_INVOICES} Invoices and corresponding Payments...`);

  const invStatuses = ['paid', 'paid', 'paid', 'confirmed', 'confirmed', 'confirmed', 'draft', 'cancelled'];
  const invoiceRows = [];
  const paymentRows = [];

  for (let i = 1; i <= TOTAL_INVOICES; i++) {
    const invId = crypto.randomUUID();
    const invNumber = `INV-${String(i).padStart(4, '0')}`;
    const subIdx = (i - 1) % generatedSubIds.length;
    const subId = generatedSubIds[subIdx];
    const sub = subRows[subIdx];
    const custId = sub.customer_id;

    // Distribute period_start so each subscription has unique period_start dates
    const cycleNum = Math.floor((i - 1) / generatedSubIds.length); // 0, 1, 2
    const periodStart = new Date(now.getTime() - (cycleNum * 30 + 30) * 86400000);
    const periodEnd = new Date(periodStart.getTime() + 30 * 86400000);

    const status = invStatuses[i % invStatuses.length];

    // Determine due date: some confirmed invoices overdue (e.g. 15% of confirmed)
    let dueDate;
    if (status === 'confirmed' && i % 4 === 0) {
      // Overdue: due date in the past
      dueDate = new Date(now.getTime() - (i % 20 + 2) * 86400000);
    } else {
      dueDate = new Date(now.getTime() + (i % 25 + 1) * 86400000);
    }

    const subtotal = 1500.00;
    const discountAmount = i % 5 === 0 ? 150.00 : 0.00;
    const taxAmount = round2((subtotal - discountAmount) * 0.18);
    const total = round2(subtotal - discountAmount + taxAmount);

    let amountPaid = 0;
    if (status === 'paid') {
      amountPaid = total;
      // Generate full payment
      paymentRows.push({
        id: crypto.randomUUID(),
        invoice_id: invId,
        customer_id: custId,
        method: ['card', 'upi', 'bank_transfer', 'cash'][(i % 4)],
        amount: total,
        date: new Date(periodStart.getTime() + 5 * 86400000).toISOString(),
        note: `Settlement for invoice ${invNumber}`,
        recorded_by: staffIds[i % staffIds.length],
      });
    } else if (status === 'confirmed' && i % 3 === 0) {
      // Partially paid confirmed invoice
      amountPaid = round2(total * 0.4);
      paymentRows.push({
        id: crypto.randomUUID(),
        invoice_id: invId,
        customer_id: custId,
        method: 'upi',
        amount: amountPaid,
        date: new Date(periodStart.getTime() + 3 * 86400000).toISOString(),
        note: `Partial payment for invoice ${invNumber}`,
        recorded_by: staffIds[i % staffIds.length],
      });
    }

    const lines = [
      {
        description: 'Software Subscription Base Fee',
        quantity: 1,
        unitPrice: 1000.00,
        taxRate: 18,
        amount: 1000.00,
      },
      {
        description: 'Enterprise Priority SLA Support',
        quantity: 1,
        unitPrice: 500.00,
        taxRate: 18,
        amount: 500.00,
      },
    ];

    invoiceRows.push({
      id: invId,
      number: invNumber,
      subscription_id: subId,
      customer_id: custId,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      status,
      lines: JSON.stringify(lines),
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total,
      amount_paid: amountPaid,
      due_date: dueDate.toISOString(),
      issued_at: periodStart.toISOString(),
      sent_at: status !== 'draft' ? periodStart.toISOString() : null,
      applied_discounts: [],
    });
  }

  // Batch insert invoices in chunks of BATCH_SIZE
  for (let i = 0; i < invoiceRows.length; i += BATCH_SIZE) {
    const chunk = invoiceRows.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    chunk.forEach((inv) => {
      const idx = params.length;
      params.push(
        inv.id,
        inv.number,
        inv.subscription_id,
        inv.customer_id,
        inv.period_start,
        inv.period_end,
        inv.status,
        inv.lines,
        inv.subtotal,
        inv.discount_amount,
        inv.tax_amount,
        inv.total,
        inv.amount_paid,
        inv.due_date,
        inv.issued_at,
        inv.sent_at,
        inv.applied_discounts
      );
      values.push(
        `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9}, $${idx + 10}, $${idx + 11}, $${idx + 12}, $${idx + 13}, $${idx + 14}, $${idx + 15}, $${idx + 16}, $${idx + 17})`
      );
    });

    await query(
      `INSERT INTO invoices (
         id, number, subscription_id, customer_id, period_start, period_end,
         status, lines, subtotal, discount_amount, tax_amount, total,
         amount_paid, due_date, issued_at, sent_at, applied_discounts
       ) VALUES ${values.join(',')}`,
      params
    );
    console.log(`   Inserted invoices ${i + 1} to ${i + chunk.length}`);
  }

  // Batch insert payments in chunks of BATCH_SIZE
  console.log(`11. Batch inserting ${paymentRows.length} Payments...`);
  for (let i = 0; i < paymentRows.length; i += BATCH_SIZE) {
    const chunk = paymentRows.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    chunk.forEach((p) => {
      const idx = params.length;
      params.push(p.id, p.invoice_id, p.customer_id, p.method, p.amount, p.date, p.note, p.recorded_by);
      values.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8})`);
    });

    await query(
      `INSERT INTO payments (
         id, invoice_id, customer_id, method, amount, date, note, recorded_by
       ) VALUES ${values.join(',')}`,
      params
    );
    console.log(`   Inserted payments ${i + 1} to ${i + chunk.length}`);
  }

  // 12. Update Counters
  console.log('12. Updating Counters sequence keys...');
  await query(
    `INSERT INTO counters (key, seq) VALUES ('SUB', $1)
     ON CONFLICT (key) DO UPDATE SET seq = $1, updated_at = now()`,
    [TOTAL_SUBSCRIPTIONS]
  );
  await query(
    `INSERT INTO counters (key, seq) VALUES ('INV', $1)
     ON CONFLICT (key) DO UPDATE SET seq = $1, updated_at = now()`,
    [TOTAL_INVOICES]
  );
  console.log(`   Counters synced: SUB = ${TOTAL_SUBSCRIPTIONS}, INV = ${TOTAL_INVOICES}`);

  console.log('\n=========================================');
  console.log('✅ SEED COMPLETED SUCCESSFULLY!');
  console.log('=========================================');
  console.log('Admin login:    admin@brightloop.com / Admin@12345');
  console.log('Staff login:    staff1@example.com   / Staff@1234');
  console.log('Customer login: customer1@example.com / Customer@123');
  console.log(`Total Subscriptions: ${TOTAL_SUBSCRIPTIONS}`);
  console.log(`Total Invoices:      ${TOTAL_INVOICES}`);
  console.log(`Total Payments:      ${paymentRows.length}`);
  console.log('=========================================\n');

  await end();
};

runSeed().catch(async (e) => {
  console.error('❌ Seed script error:', e);
  await end();
  process.exit(1);
});
