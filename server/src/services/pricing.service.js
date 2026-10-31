// STUB (P1). P2 replaces this, keeping signatures.
const { round2, add, mul } = require('../utils/money');
const getUnitPrice = (product, variantValue) => {
  const v = (product.variants || []).find((x) => x.value === variantValue);
  return add(product.salesPrice || 0, v ? v.extraPrice : 0);
};
const getEligibleDiscounts = async () => [];
const calculateTotals = ({ lines }) => {
  let subtotal = 0, taxAmount = 0;
  const out = lines.map((l) => {
    const amount = mul(l.quantity, l.unitPrice), tax = round2((amount * (l.taxRate || 0)) / 100);
    subtotal = add(subtotal, amount); taxAmount = add(taxAmount, tax);
    return { ...l, amount, discountShare: 0, taxAmount: tax };
  });
  return { lines: out, subtotal, discountAmount: 0, taxAmount, total: add(subtotal, taxAmount), appliedDiscountIds: [] };
};
const consumeDiscounts = async () => [];
module.exports = { getUnitPrice, getEligibleDiscounts, calculateTotals, consumeDiscounts };
