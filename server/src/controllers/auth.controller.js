const { z } = require('zod');
const { asyncHandler } = require('../middleware/error');
const svc = require('../services/auth.service');
const { PASSWORD_REGEX, PASSWORD_MSG } = require('../utils/password');
const email = z.string().trim().email('Enter a valid email');
const password = z.string().regex(PASSWORD_REGEX, PASSWORD_MSG);
const schemas = {
  register: z.object({ email, password }),
  login: z.object({ email, password: z.string().min(1, 'Password is required') }),
  forgot: z.object({ email }),
  reset: z.object({ password }),
};
const MSG = 'If that email is registered, a reset link has been sent.';
module.exports = {
  schemas,
  register: asyncHandler(async (req, res) => res.status(201).json(await svc.register(req.body))),
  login: asyncHandler(async (req, res) => res.json(await svc.login(req.body))),
  me: asyncHandler(async (req, res) => res.json(await svc.me(req.user.id))),
  forgot: asyncHandler(async (req, res) => { await svc.forgotPassword(req.body.email); res.json({ message: MSG }); }),
  reset: asyncHandler(async (req, res) => { await svc.resetPassword(req.params.token, req.body.password); res.json({ message: 'Password updated' }); }),
};
