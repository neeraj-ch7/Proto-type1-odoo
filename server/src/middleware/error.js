class ApiError extends Error { constructor(status, message, errors) { super(message); this.status = status; this.errors = errors; } }
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const validate = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) {
    const errors = r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(new ApiError(400, errors[0]?.message || 'Validation failed', errors));
  }
  req.body = r.data; next();
};
const notFound = (req, res, next) => next(new ApiError(404, 'Route not found'));
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500, message = err.message || 'Server error';
  if (err.code === '23505') { status = 409; message = 'Duplicate value'; } // Postgres unique_violation
  if (err.code === '22P02') { status = 400; message = 'Invalid id'; }      // Postgres invalid uuid / bad input syntax
  if (status === 500) { if (process.env.NODE_ENV === 'test') console.error('[500]', err.message); else console.error(err); }
  res.status(status).json({ message: status === 500 ? 'Server error' : message, ...(err.errors && { errors: err.errors }) });
};
module.exports = { ApiError, asyncHandler, validate, notFound, errorHandler };