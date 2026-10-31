const { round2, add, sub, mul } = require('../utils/money');
const { query } = require('../config/db');
const Discount = require('../models/Discount');

/**
 * getUnitPrice(product, variantValue) -> number
 * salesPrice + matching variant extraPrice
 */
const getUnitPrice = (product, variantValue) => {
  if (!product) return 0;
  const basePrice = Number(product.salesPrice ?? product.sales_price ?? 0);
  const variants = product.variants || [];
  if (!variantValue || !Array.isArray(variants)) {
    return round2(basePrice);
  }
  const match = variants.find(
    (v) => String(v.value).toLowerCase() === String(variantValue).toLowerCase()
  );
  const extraPrice = match ? Number(match.extraPrice ?? match.extra_price ?? 0) : 0;
  return add(basePrice, extraPrice);
};

/**
 * getEligibleDiscounts({ lines, asOf }) -> Discount[]
 * Active, within dates, usage left, minPurchase/minQty met, product-scoped match at least one line
 */
const getEligibleDiscounts = async ({ lines = [], asOf = new Date() }) => {
  const dateStr = asOf instanceof Date ? asOf.toISOString() : new Date(asOf).toISOString();

  let subtotal = 0;
  let totalQty = 0;
  const lineProductIds = [];

  for (const line of lines) {
    const qty = Number(line.quantity || 0);
    const unitPrice = Number(line.unitPrice || 0);
    const lineAmt = mul(qty, unitPrice);
    subtotal = add(subtotal, lineAmt);
    totalQty += qty;

    const pId = line.product?.id || line.product?._id || line.product;
    if (pId) lineProductIds.push(String(pId));
  }

  const res = await query(
    `SELECT * FROM discounts
     WHERE active = true
       AND (start_date IS NULL OR start_date <= $1)
       AND (end_date IS NULL OR end_date >= $1)
       AND (usage_limit IS NULL OR times_used < usage_limit)
       AND (min_purchase IS NULL OR min_purchase <= $2)
       AND (min_qty IS NULL OR min_qty <= $3)
     ORDER BY value DESC, created_at ASC`,
    [dateStr, subtotal, totalQty]
  );

  const eligible = [];
  for (const row of res.rows) {
    const d = Discount.toApi(row);
    if (d.appliesTo === 'product') {
      const discountProducts = (d.products || []).map(String);
      const matches = discountProducts.some((pId) => lineProductIds.includes(pId));
      if (!matches) continue;
    }
    eligible.push(d);
  }

  return eligible;
};

/**
 * calculateTotals({ lines, discounts })
 * Pure, sync.
 * Discounts first: product-scoped reduce matching lines, subscription-scoped are prorated across all lines.
 * Tax is then taken per line on the net amount using line.taxRate.
 */
const calculateTotals = ({ lines = [], discounts = [] }) => {
  if (!lines || !lines.length) {
    return {
      lines: [],
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      total: 0,
      appliedDiscountIds: [],
    };
  }

  // Step 1: Compute base amount for each line
  const baseAmounts = [];
  const netAmounts = [];
  const discountShares = [];
  let subtotal = 0;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const amt = mul(Number(l.quantity || 0), Number(l.unitPrice || 0));
    baseAmounts.push(amt);
    netAmounts.push(amt);
    discountShares.push(0);
    subtotal = add(subtotal, amt);
  }

  const appliedDiscountIds = [];

  // Helper to get normalized product id for a line
  const getLineProductId = (line) => String(line.product?.id || line.product?._id || line.product || '');

  // Separate discounts into product-scoped and subscription-scoped
  const productDiscounts = [];
  const subscriptionDiscounts = [];

  for (const d of discounts) {
    const scope = d.appliesTo || d.applies_to;
    if (scope === 'product') {
      productDiscounts.push(d);
    } else {
      subscriptionDiscounts.push(d);
    }
  }

  // Step 2: Apply product-scoped discounts
  for (const d of productDiscounts) {
    const targetProducts = (d.products || []).map(String);
    const matchingIndices = [];
    for (let i = 0; i < lines.length; i++) {
      if (targetProducts.includes(getLineProductId(lines[i])) && netAmounts[i] > 0) {
        matchingIndices.push(i);
      }
    }

    if (!matchingIndices.length) continue;

    let applied = false;
    const isPercent = d.type === 'percent';
    const val = Number(d.value || 0);

    if (isPercent) {
      for (const idx of matchingIndices) {
        const disc = round2(mul(netAmounts[idx], val) / 100);
        if (disc > 0) {
          netAmounts[idx] = sub(netAmounts[idx], disc);
          discountShares[idx] = add(discountShares[idx], disc);
          applied = true;
        }
      }
    } else {
      // Fixed discount on matching lines
      const matchingNetSum = matchingIndices.reduce((acc, idx) => add(acc, netAmounts[idx]), 0);
      if (matchingNetSum > 0) {
        const totalToDeduct = Math.min(val, matchingNetSum);
        let remainingToDistribute = totalToDeduct;

        for (let j = 0; j < matchingIndices.length; j++) {
          const idx = matchingIndices[j];
          let share;
          if (j === matchingIndices.length - 1) {
            share = remainingToDistribute;
          } else {
            share = round2(mul(totalToDeduct, netAmounts[idx]) / matchingNetSum);
            if (share > remainingToDistribute) share = remainingToDistribute;
          }
          if (share > netAmounts[idx]) share = netAmounts[idx];

          remainingToDistribute = sub(remainingToDistribute, share);
          netAmounts[idx] = sub(netAmounts[idx], share);
          discountShares[idx] = add(discountShares[idx], share);
          if (share > 0) applied = true;
        }
      }
    }

    if (applied) {
      const discId = d.id || d._id;
      if (discId) appliedDiscountIds.push(discId);
    }
  }

  // Step 3: Apply subscription-scoped discounts (prorated across all lines by available net amount)
  for (const d of subscriptionDiscounts) {
    const availableNetTotal = netAmounts.reduce((acc, n) => add(acc, n), 0);
    if (availableNetTotal <= 0) continue;

    let applied = false;
    const isPercent = d.type === 'percent';
    const val = Number(d.value || 0);

    let totalToDeduct = 0;
    if (isPercent) {
      totalToDeduct = round2(mul(availableNetTotal, val) / 100);
    } else {
      totalToDeduct = Math.min(val, availableNetTotal);
    }

    if (totalToDeduct > 0) {
      let remainingToDistribute = totalToDeduct;
      const positiveIndices = [];
      for (let i = 0; i < lines.length; i++) {
        if (netAmounts[i] > 0) positiveIndices.push(i);
      }

      for (let j = 0; j < positiveIndices.length; j++) {
        const idx = positiveIndices[j];
        let share;
        if (j === positiveIndices.length - 1) {
          share = remainingToDistribute;
        } else {
          share = round2(mul(totalToDeduct, netAmounts[idx]) / availableNetTotal);
          if (share > remainingToDistribute) share = remainingToDistribute;
        }
        if (share > netAmounts[idx]) share = netAmounts[idx];

        remainingToDistribute = sub(remainingToDistribute, share);
        netAmounts[idx] = sub(netAmounts[idx], share);
        discountShares[idx] = add(discountShares[idx], share);
        if (share > 0) applied = true;
      }
    }

    if (applied) {
      const discId = d.id || d._id;
      if (discId) appliedDiscountIds.push(discId);
    }
  }

  // Step 4: Tax per line on the net amount using line.taxRate
  let totalDiscountAmount = 0;
  let totalTaxAmount = 0;
  const lineOutputs = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const taxRate = Number(l.taxRate || 0);
    const lineTax = round2(mul(netAmounts[i], taxRate) / 100);
    totalDiscountAmount = add(totalDiscountAmount, discountShares[i]);
    totalTaxAmount = add(totalTaxAmount, lineTax);

    lineOutputs.push({
      ...l,
      amount: baseAmounts[i],
      discountShare: discountShares[i],
      taxAmount: lineTax,
    });
  }

  const netSubtotal = sub(subtotal, totalDiscountAmount);
  const total = add(netSubtotal, totalTaxAmount);

  return {
    lines: lineOutputs,
    subtotal,
    discountAmount: totalDiscountAmount,
    taxAmount: totalTaxAmount,
    total,
    appliedDiscountIds,
  };
};

/**
 * consumeDiscounts(ids) -> ids actually consumed
 */
const consumeDiscounts = async (ids = []) => {
  return await Discount.consumeDiscounts(ids);
};

module.exports = {
  getUnitPrice,
  getEligibleDiscounts,
  calculateTotals,
  consumeDiscounts,
};
