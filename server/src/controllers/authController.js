const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sha256 } = require('../utils/apiKey');
const { sendEmail } = require('../utils/email');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const env = require('../config/env');
const { getSetting } = require('../services/systemSettings');

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function refreshExpiry() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

const register = asyncHandler(async (req, res) => {
  // Admin kill-switch: allowRegistration=false blocks self-signup.
  // (Admin-created users and the demo seed are unaffected.)
  const allow = await getSetting('allowRegistration', true);
  if (allow === false || allow === 'false') {
    throw new ApiError(403, 'Registration is currently disabled', 'REGISTRATION_DISABLED');
  }
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'Email already registered', 'EMAIL_EXISTS');
  const passwordHash = await bcrypt.hash(password, 10);
  const verificationToken = uuidv4();
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    verificationToken,
  });
  await sendEmail(user.email, 'Verify your DevAPI Hub email', `Hi ${user.name},\n\nVerify your email with this token:\n${verificationToken}\n\nPOST /api/auth/verify-email with { "token": "..." }`, {
    type: 'verify-email',
    userId: user._id,
  });
  const accessToken = signAccessToken(user);
  const signed = signRefreshToken(user);
  const refreshToken = typeof signed === 'string' ? signed : signed.token;
  const refreshJti = typeof signed === 'string' ? null : signed.jti;
  await RefreshToken.create({ user: user._id, tokenHash: sha256(refreshToken), jti: refreshJti, expiresAt: refreshExpiry() });
  setRefreshCookie(res, refreshToken);
  res.status(201).json({
    success: true,
    data: { user: user.toSafeJSON(), accessToken },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  if (user.suspended) throw new ApiError(403, 'Account suspended', 'ACCOUNT_SUSPENDED');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  const accessToken = signAccessToken(user);
  const signed = signRefreshToken(user);
  const refreshToken = typeof signed === 'string' ? signed : signed.token;
  const refreshJti = typeof signed === 'string' ? null : signed.jti;
  await RefreshToken.create({ user: user._id, tokenHash: sha256(refreshToken), jti: refreshJti, expiresAt: refreshExpiry() });
  setRefreshCookie(res, refreshToken);
  res.json({ success: true, data: { user: user.toSafeJSON(), accessToken } });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token missing', 'UNAUTHORIZED');
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Invalid refresh token', 'UNAUTHORIZED');
  }
  const hash = sha256(token);
  const stored = await RefreshToken.findOne({ tokenHash: hash });
  if (!stored) throw new ApiError(401, 'Refresh token revoked', 'UNAUTHORIZED');
  if (stored.expiresAt < new Date()) throw new ApiError(401, 'Refresh token expired', 'UNAUTHORIZED');
  // Reuse detection: already-revoked token presented again => possible theft; revoke family.
  if (stored.revoked) {
    await RefreshToken.updateMany({ user: stored.user, revoked: false }, { $set: { revoked: true } }).catch(() => {});
    throw new ApiError(401, 'Refresh token reused', 'UNAUTHORIZED');
  }
  // jti binding when present (tokens issued after upgrade have jti).
  if (stored.jti && decoded.jti && stored.jti !== decoded.jti) {
    throw new ApiError(401, 'Invalid refresh token', 'UNAUTHORIZED');
  }
  const user = await User.findById(decoded.sub);
  if (!user) throw new ApiError(401, 'User not found', 'UNAUTHORIZED');
  if (user.suspended) throw new ApiError(403, 'Account suspended', 'ACCOUNT_SUSPENDED');
  // rotation: atomically revoke old (fails if raced), issue new
  const claimed = await RefreshToken.findOneAndUpdate(
    { _id: stored._id, revoked: false },
    { $set: { revoked: true } },
    { new: true }
  );
  if (!claimed) {
    await RefreshToken.updateMany({ user: stored.user, revoked: false }, { $set: { revoked: true } }).catch(() => {});
    throw new ApiError(401, 'Refresh token reused', 'UNAUTHORIZED');
  }
  const accessToken = signAccessToken(user);
  const signed = signRefreshToken(user);
  const newRefresh = typeof signed === 'string' ? signed : signed.token;
  const newJti = typeof signed === 'string' ? null : signed.jti;
  await RefreshToken.create({ user: user._id, tokenHash: sha256(newRefresh), jti: newJti, expiresAt: refreshExpiry() });
  setRefreshCookie(res, newRefresh);
  res.json({ success: true, data: { accessToken } });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (token) {
    await RefreshToken.updateOne({ tokenHash: sha256(String(token)) }, { $set: { revoked: true } }).catch(() => {});
  }
  res.clearCookie('refreshToken', {
    path: '/',
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
  });
  res.json({ success: true, data: { message: 'Logged out' } });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.toSafeJSON() });
});

const updateMe = asyncHandler(async (req, res) => {
  const { name } = req.body || {};
  if (name !== undefined) {
    const clean = String(name).trim().slice(0, 100);
    if (clean.length < 2) throw new ApiError(400, 'Name must be at least 2 characters', 'VALIDATION_ERROR');
    req.user.name = clean;
    await req.user.save();
  }
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
});

const forgot = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() });
  // Always return success to avoid enumeration
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = sha256(token);
    user.resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    await sendEmail(user.email, 'Reset your DevAPI Hub password', `Hi ${user.name},\n\nReset token (1h):\n${token}\n\nPOST /api/auth/reset with { "token": "...", "password": "NewPass123" }`, {
      type: 'password-reset',
      userId: user._id,
    });
    // Expose raw token only in test env for automated tests; never in dev/prod responses.
    // The mock email (sendEmail) still records it server-side for manual testing.
    if (env.nodeEnv === 'test') {
      return res.json({ success: true, data: { message: 'Reset email sent (mock)', resetToken: token } });
    }
  }
  res.json({ success: true, data: { message: 'If that email exists, a reset was sent (mock)' } });
});

const reset = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hash = sha256(String(token));
  const user = await User.findOne({ resetToken: hash, resetExpires: { $gt: new Date() } });
  if (!user) throw new ApiError(400, 'Invalid or expired reset token', 'INVALID_TOKEN');
  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetToken = null;
  user.resetExpires = null;
  await user.save();
  await RefreshToken.updateMany({ user: user._id }, { $set: { revoked: true } });
  res.json({ success: true, data: { message: 'Password reset successful' } });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'Verification token is required', 'VALIDATION_ERROR');
  const user = await User.findOne({ verificationToken: token });
  if (!user) throw new ApiError(400, 'Invalid verification token', 'INVALID_TOKEN');
  user.isVerified = true;
  user.verificationToken = null;
  await user.save();
  res.json({ success: true, data: { message: 'Email verified (mock)', user: user.toSafeJSON() } });
});

module.exports = { register, login, refresh, logout, me, updateMe, forgot, reset, verifyEmail };
