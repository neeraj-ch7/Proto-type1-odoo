require('dotenv').config();
const Product = require('../models/Product');
const Plan = require('../models/Plan');
const Tax = require('../models/Tax');
const Discount = require('../models/Discount');
const QuotationTemplate = require('../models/QuotationTemplate');
const { end } = require('../config/db');

(async () => {
  console.log('Seeding catalog data...');

  // 1. Products
  const p1 = await Product.create({
    name: 'Brightloop CRM Core',
    type: 'software',
    salesPrice: 1000,
    costPrice: 200,
    notes: 'Core customer relationship management module',
    variants: [
      { attribute: 'Brand', value: 'Odoo', extraPrice: 560 },
      { attribute: 'Brand', value: 'Custom', extraPrice: 250 },
    ],
    active: true,
  });

  const p2 = await Product.create({
    name: 'Automated Invoicing Engine',
    type: 'service',
    salesPrice: 800,
    costPrice: 150,
    notes: 'Automated recurring billing generation with tax deduction',
    variants: [
      { attribute: 'Tier', value: 'Standard', extraPrice: 0 },
      { attribute: 'Tier', value: 'Enterprise Priority', extraPrice: 400 },
    ],
    active: true,
  });

  const p3 = await Product.create({
    name: 'Inventory Sync Connector',
    type: 'software',
    salesPrice: 1200,
    costPrice: 300,
    notes: 'Real-time stock ledger synchronization',
    variants: [],
    active: true,
  });

  console.log('Products seeded:', p1.name, p2.name, p3.name);

  // 2. Plans
  const pl1 = await Plan.create({
    name: 'Starter Monthly',
    price: 999,
    billingPeriod: 'monthly',
    minQty: 1,
    closable: true,
    pausable: true,
    renewable: true,
    status: 'active',
  });

  const pl2 = await Plan.create({
    name: 'Professional Suite',
    price: 4999,
    billingPeriod: 'monthly',
    minQty: 1,
    closable: true,
    pausable: true,
    renewable: true,
    status: 'active',
  });

  const pl3 = await Plan.create({
    name: 'Enterprise Yearly',
    price: 49999,
    billingPeriod: 'yearly',
    minQty: 5,
    closable: true,
    pausable: true,
    renewable: true,
    status: 'active',
  });

  console.log('Plans seeded:', pl1.name, pl2.name, pl3.name);

  // 3. Taxes
  const t1 = await Tax.create({ name: 'GST 18%', rate: 18, active: true });
  const t2 = await Tax.create({ name: 'GST 12%', rate: 12, active: true });
  const t3 = await Tax.create({ name: 'VAT 5%', rate: 5, active: true });
  console.log('Taxes seeded:', t1.name, t2.name, t3.name);

  // 4. Discounts
  const d1 = await Discount.create({
    name: 'Launch Discount 15%',
    type: 'percent',
    value: 15,
    appliesTo: 'subscription',
    active: true,
    usageLimit: 100,
  });

  const d2 = await Discount.create({
    name: 'High Volume Fixed ₹500',
    type: 'fixed',
    value: 500,
    minPurchase: 2000,
    minQty: 2,
    appliesTo: 'subscription',
    active: true,
  });

  const d3 = await Discount.create({
    name: 'CRM Core Promo 20%',
    type: 'percent',
    value: 20,
    appliesTo: 'product',
    products: [p1.id],
    active: true,
  });
  console.log('Discounts seeded:', d1.name, d2.name, d3.name);

  // 5. Quotation Template
  const tmpl = await QuotationTemplate.create({
    name: 'Standard SaaS Onboarding Package',
    validityDays: 30,
    plan: pl2.id,
    lines: [
      { product: p1.id, variantValue: 'Odoo', quantity: 1 },
      { product: p2.id, variantValue: 'Enterprise Priority', quantity: 1 },
    ],
  });
  console.log('Template seeded:', tmpl.name);

  console.log('Catalog seed completed successfully!');
  await end();
})().catch(async (e) => {
  console.error('Seed error:', e.message);
  await end();
  process.exit(1);
});
