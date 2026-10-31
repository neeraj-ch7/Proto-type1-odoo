const { query } = require('../config/db');
const { nextNumber } = require('../utils/sequence');
const { addPeriod } = require('../utils/period');
const pricing = require('./pricing.service');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');

/**
 * billDueSubscriptions({ asOf = new Date() })
 * Processes all active subscriptions where nextInvoiceDate <= asOf.
 * Supports multi-period catch-up, atomic next invoice advance, discount consumption,
 * and idempotency against duplicate billing periods.
 * Returns { created, skipped, errors }
 */
const billDueSubscriptions = async ({ asOf = new Date() } = {}) => {
  const asOfDate = asOf instanceof Date ? asOf : new Date(asOf);
  if (isNaN(asOfDate.getTime())) {
    throw new Error(`Invalid asOf date: ${asOf}`);
  }

  let created = 0;
  let skipped = 0;
  const errors = [];

  const BATCH_SIZE = 50;
  let hasMore = true;
  const processedIds = new Set();

  while (hasMore) {
    const res = await query(
      `SELECT s.*, p.billing_period, p.name as plan_name
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.status = 'active'
         AND s.next_invoice_date IS NOT NULL
         AND s.next_invoice_date <= $1
       ORDER BY s.next_invoice_date ASC
       LIMIT $2`,
      [asOfDate.toISOString(), BATCH_SIZE]
    );

    const rows = res.rows.filter((r) => !processedIds.has(r.id));
    if (!rows.length) {
      hasMore = false;
      break;
    }

    for (const subRow of rows) {
      processedIds.add(subRow.id);

      try {
        let currentNextDate = new Date(subRow.next_invoice_date);
        const expiryDate = subRow.expiry_date ? new Date(subRow.expiry_date) : null;
        const paymentTermsDays = Number(subRow.payment_terms || 15);
        const billingPeriod = subRow.billing_period;

        const subLines = Array.isArray(subRow.lines)
          ? subRow.lines
          : typeof subRow.lines === 'string'
          ? JSON.parse(subRow.lines)
          : [];

        // Catch-up loop: bills all missed periods up to asOfDate
        while (currentNextDate <= asOfDate && (!expiryDate || currentNextDate < expiryDate)) {
          const periodStart = new Date(currentNextDate);
          const periodEnd = addPeriod(periodStart, billingPeriod);

          // Build invoice lines from subscription snapshots
          const candidateLines = subLines.map((l) => ({
            description: l.description || '',
            quantity: Number(l.quantity || 1),
            unitPrice: Number(l.unitPrice || 0),
            taxRate: Number(l.taxRate || 0),
            amount: Number(l.amount || 0),
            product: l.product,
          }));

          // Calculate discounts and final line amounts with pricing service
          const eligibleDiscounts = await pricing.getEligibleDiscounts({
            lines: candidateLines,
            asOf: asOfDate,
          });

          const totals = pricing.calculateTotals({
            lines: candidateLines,
            discounts: eligibleDiscounts,
          });

          // Due date = periodStart + paymentTerms days
          const dueDate = new Date(periodStart.getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);
          const invNumber = await nextNumber('INV');

          let invoiceCreated = false;
          try {
            await Invoice.create({
              number: invNumber,
              subscription: subRow.id,
              customer: subRow.customer_id,
              periodStart,
              periodEnd,
              status: 'draft',
              lines: totals.lines.map((l) => ({
                description: l.description,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                taxRate: l.taxRate,
                amount: l.amount,
              })),
              subtotal: totals.subtotal,
              discountAmount: totals.discountAmount,
              taxAmount: totals.taxAmount,
              total: totals.total,
              amountPaid: 0,
              dueDate,
              issuedAt: new Date(),
              appliedDiscounts: totals.appliedDiscountIds || [],
            });

            created++;
            invoiceCreated = true;

            // Consume applied discounts
            if (totals.appliedDiscountIds && totals.appliedDiscountIds.length > 0) {
              await pricing.consumeDiscounts(totals.appliedDiscountIds);
            }
          } catch (createErr) {
            // Postgres unique violation (23505) on (subscription_id, period_start)
            if (createErr.code === '23505' || (createErr.message && createErr.message.includes('unique'))) {
              skipped++;
            } else {
              throw createErr;
            }
          }

          // Check if subscription should be closed after this period
          let targetStatus = null;
          if (expiryDate && periodEnd >= expiryDate) {
            targetStatus = 'closed';
          }

          // Atomically advance next_invoice_date with concurrency guard
          const advanced = await Subscription.advanceNextInvoiceDate(
            subRow.id,
            currentNextDate,
            periodEnd,
            targetStatus
          );

          if (!advanced) {
            // Another worker or process advanced this subscription concurrently
            break;
          }

          currentNextDate = periodEnd;
          if (targetStatus === 'closed') {
            break;
          }
        }
      } catch (subErr) {
        errors.push({
          subscriptionId: subRow.id,
          number: subRow.number,
          message: subErr.message,
        });
      }
    }
  }

  return { created, skipped, errors };
};

module.exports = {
  billDueSubscriptions,
};
