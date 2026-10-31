const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { ApiError } = require('../middleware/error');
const { signToken } = require('../middleware/auth');
const { sendMail } = require('./mail.service');

const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10); // equalises timing when the email is unknown
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

const createUser = async ({ email, password, role }) => {
  if (await User.exists(email)) throw new ApiError(409, 'Email already registered');
  try { return await User.create({ email, role, passwordHash: await bcrypt.hash(password, 10) }); }
  catch (e) { if (e.code === '23505') throw new ApiError(409, 'Email already registered'); throw e; } // unique violation (race)
};
const register = async ({ email, password }) => { const u = await createUser({ email, password, role: 'customer' }); return { token: signToken(u), user: publicUser(u) }; };
const login = async ({ email, password }) => {
  const u = await User.findByEmail(email);
  const ok = await bcrypt.compare(password, u ? u.password_hash : DUMMY_HASH);
  if (!u || !ok) throw new ApiError(401, 'Invalid email or password');
  return { token: signToken(u), user: publicUser(u) };
};
const me = async (id) => { const u = await User.findById(id); if (!u) throw new ApiError(401, 'User not found'); return publicUser(u); };
const forgotPassword = async (email) => {
  const u = await User.findByEmail(email);
  if (!u) return; // same response either way (route returns the generic message)
  const token = crypto.randomBytes(32).toString('hex');
  await User.setResetToken(u.id, sha(token), new Date(Date.now() + 30 * 60 * 1000)); // store only the hash, 30 min expiry
  await sendMail({ to: u.email, subject: 'Reset your Brightloop password', text: `Reset your password (valid 30 minutes): ${process.env.CLIENT_URL}/reset-password/${token}` });
};
const resetPassword = async (token, password) => {
  const u = await User.findByValidResetHash(sha(token));
  if (!u) throw new ApiError(400, 'Reset link is invalid or has expired');
  await User.updatePassword(u.id, await bcrypt.hash(password, 10));
};
module.exports = { createUser, register, login, me, forgotPassword, resetPassword, publicUser };