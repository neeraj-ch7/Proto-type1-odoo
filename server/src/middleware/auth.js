const jwt = require('jsonwebtoken');
const { ApiError } = require('./error');
const signToken = (user) => jwt.sign({ id: String(user.id), role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const auth = (...roles) => (req, res, next) => {
  const devOk = process.env.DEV_AUTH === 'true' && process.env.NODE_ENV !== 'production';
  if (devOk && req.headers['x-dev-role'] && req.headers['x-dev-user-id']) {
    if (!['admin', 'staff', 'customer'].includes(req.headers['x-dev-role'])) return next(new ApiError(401, 'Invalid dev role'));
    req.user = { id: req.headers['x-dev-user-id'], role: req.headers['x-dev-role'] };
  } else {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) return next(new ApiError(401, 'Authentication required'));
    try { const p = jwt.verify(h.slice(7), process.env.JWT_SECRET); req.user = { id: p.id, role: p.role }; }
    catch { return next(new ApiError(401, 'Invalid or expired token')); }
  }
  if (roles.length && !roles.includes(req.user.role)) return next(new ApiError(403, 'Forbidden'));
  next();
};
module.exports = { auth, signToken };