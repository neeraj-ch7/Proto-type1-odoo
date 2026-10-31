const router = require('express').Router();
const cron = require('node-cron');
const Plan = require('../models/Plan');
const { auth } = require('../middleware/auth');
const { asyncHandler, ApiError, validate } = require('../middleware/error');
const { parsePagination, paginated } = require('../utils/pagination');

// Schedule daily node-cron to auto-close expired plans if ENABLE_CRON=true
if (process.env.ENABLE_CRON === 'true' && process.env.NODE_ENV !== 'test') {
  // Runs every day at 00:00:00
  cron.schedule('0 0 * * *', async () => {
    try {
      const closed = await Plan.closeExpiredAutoClosePlans();
      if (closed.length) {
        console.log(`[cron] Auto-closed ${closed.length} expired plans:`, closed.map((p) => p.name).join(', '));
      }
    } catch (err) {
      console.error('[cron] Error auto-closing plans:', err.message);
    }
  });
  console.log('[cron] Daily plan auto-close job registered');
}

// GET /api/plans/public - No auth, active plans within dates
router.get('/public', asyncHandler(async (req, res) => {
  const plans = await Plan.listPublic();
  res.json(plans);
}));

// GET /api/plans - Admin and Staff, paginated with search
router.get('/', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;
  const status = typeof req.query.status === 'string' && req.query.status.trim() ? req.query.status.trim() : undefined;
  const sort = req.query.sort || 'desc';

  const { items, total } = await Plan.list({ search, status, limit, skip, sort });
  res.json(paginated(items, total, page, limit));
}));

// GET /api/plans/:id - Admin and Staff
router.get('/:id', auth('admin', 'staff'), asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) throw new ApiError(404, 'Plan not found');
  res.json(plan);
}));

// POST /api/plans - Admin only (Staff gets 403)
router.post('/', auth('admin'), validate(Plan.planSchema), asyncHandler(async (req, res) => {
  const plan = await Plan.create(req.body);
  res.status(201).json(plan);
}));

// PUT/PATCH /api/plans/:id - Admin only (Staff gets 403)
const updateHandler = asyncHandler(async (req, res) => {
  const plan = await Plan.update(req.params.id, req.body);
  if (!plan) throw new ApiError(404, 'Plan not found');
  res.json(plan);
});
router.put('/:id', auth('admin'), validate(Plan.planUpdateSchema), updateHandler);
router.patch('/:id', auth('admin'), validate(Plan.planUpdateSchema), updateHandler);

// PATCH /api/plans/:id/status - Admin only
// Action: close | pause | resume | renew
router.patch('/:id/status', auth('admin'), asyncHandler(async (req, res) => {
  const { action, endDate } = req.body || {};
  if (!action || !['close', 'pause', 'resume', 'renew'].includes(action)) {
    throw new ApiError(400, 'Invalid status action. Must be close, pause, resume, or renew.');
  }

  const plan = await Plan.findById(req.params.id);
  if (!plan) throw new ApiError(404, 'Plan not found');

  if (action === 'close') {
    if (!plan.closable) {
      throw new ApiError(400, 'Plan is not configured to be closable');
    }
    const updated = await Plan.update(req.params.id, { status: 'closed' });
    return res.json(updated);
  }

  if (action === 'pause') {
    if (!plan.pausable) {
      throw new ApiError(400, 'Plan is not configured to be pausable');
    }
    const updated = await Plan.update(req.params.id, { status: 'paused' });
    return res.json(updated);
  }

  if (action === 'resume') {
    const updated = await Plan.update(req.params.id, { status: 'active' });
    return res.json(updated);
  }

  if (action === 'renew') {
    if (!plan.renewable) {
      throw new ApiError(400, 'Plan is not configured to be renewable');
    }
    const updateData = { status: 'active' };
    if (endDate !== undefined) {
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (isNaN(parsedEnd.getTime())) {
          throw new ApiError(400, 'Invalid endDate format');
        }
        if (plan.startDate && parsedEnd < new Date(plan.startDate)) {
          throw new ApiError(400, 'Renewed end date must be on or after start date');
        }
      }
      updateData.endDate = endDate;
    }
    const updated = await Plan.update(req.params.id, updateData);
    return res.json(updated);
  }
}));

// DELETE /api/plans/:id - Admin only (Staff gets 403)
router.delete('/:id', auth('admin'), asyncHandler(async (req, res) => {
  const success = await Plan.deleteById(req.params.id);
  if (!success) throw new ApiError(404, 'Plan not found');
  res.json({ message: 'Plan deleted successfully', id: req.params.id });
}));

// Manual trigger for auto-close (Admin or testing)
router.post('/trigger-autoclose', auth('admin'), asyncHandler(async (req, res) => {
  const closed = await Plan.closeExpiredAutoClosePlans();
  res.json({ success: true, closedCount: closed.length, closed });
}));

module.exports = router;
module.exports.closeExpiredAutoClosePlans = Plan.closeExpiredAutoClosePlans;
