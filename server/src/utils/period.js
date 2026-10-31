/**
 * addPeriod(date, billingPeriod)
 * Calculates the next period end date based on billing period:
 * 'daily' | 'weekly' | 'monthly' | 'yearly'
 * Stored and calculated as UTC, handling month-end / leap years accurately.
 * E.g., Jan 31 + 1 month = Feb 28 (or Feb 29 in leap year).
 */
const addPeriod = (dateInput, billingPeriod) => {
  const d = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${dateInput}`);
  }

  const period = String(billingPeriod).toLowerCase().trim();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const h = d.getUTCHours();
  const min = d.getUTCMinutes();
  const s = d.getUTCSeconds();
  const ms = d.getUTCMilliseconds();

  switch (period) {
    case 'daily': {
      return new Date(Date.UTC(y, m, day + 1, h, min, s, ms));
    }
    case 'weekly': {
      return new Date(Date.UTC(y, m, day + 7, h, min, s, ms));
    }
    case 'monthly': {
      let targetM = m + 1;
      let targetY = y;
      if (targetM > 11) {
        targetY += Math.floor(targetM / 12);
        targetM = targetM % 12;
      }
      const daysInTargetMonth = new Date(Date.UTC(targetY, targetM + 1, 0)).getUTCDate();
      const targetDay = Math.min(day, daysInTargetMonth);
      return new Date(Date.UTC(targetY, targetM, targetDay, h, min, s, ms));
    }
    case 'yearly': {
      const targetY = y + 1;
      const daysInTargetMonth = new Date(Date.UTC(targetY, m + 1, 0)).getUTCDate();
      const targetDay = Math.min(day, daysInTargetMonth);
      return new Date(Date.UTC(targetY, m, targetDay, h, min, s, ms));
    }
    default:
      throw new Error(`Unsupported billing period: ${billingPeriod}`);
  }
};

module.exports = { addPeriod };
