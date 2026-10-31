const router = require('express').Router();
const cron = require('node-cron');
const { auth } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/error');
const { billDueSubscriptions } = require('../services/billing.service');

// Schedule daily billing cron job if ENABLE_CRON=true
if (process.env.ENABLE_CRON === 'true' && process.env.NODE_ENV !== 'test') {
  // Runs every day at 00:00:00
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[cron] Running automated daily billing engine...');
      const summary = await billDueSubscriptions();
      console.log('[cron] Daily billing engine finished:', summary);
    } catch (err) {
      console.error('[cron] Daily billing engine error:', err.message);
    }
  });
  console.log('[cron] Daily billing engine job registered');
}

// POST /api/billing/run - Admin & Staff
router.post('/run', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const asOf = req.body?.asOf ? new Date(req.body.asOf) : new Date();
  if (isNaN(asOf.getTime())) {
    throw new ApiError(400, 'Invalid asOf date');
  }

  const result = await billDueSubscriptions({ asOf });
  res.json(result);
}));

module.exports = router;
