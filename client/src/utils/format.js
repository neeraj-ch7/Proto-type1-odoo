import dayjs from 'dayjs';

/**
 * Format number as Indian Rupee (INR)
 * e.g. 1560 -> ₹1,560.00
 */
export const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val));
};

/**
 * Format date string or object to DD/MM/YYYY
 */
export const formatDate = (d) => {
  if (!d) return '—';
  return dayjs(d).format('DD/MM/YYYY');
};
