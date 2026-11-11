const mongoose = require('mongoose');
const User = require('../models/User');
const ApiProject = require('../models/ApiProject');
const ApiKey = require('../models/ApiKey');
const ApiRequestLog = require('../models/ApiRequestLog');
const SystemSetting = require('../models/SystemSetting');
const Notification = require('../models/Notification');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');
const { redisAvailable } = require('../config/redis');

const overview = asyncHandler(async (req, res) => {
  const [users, projects, keys, requests, errors] = await Promise.all([
    User.countDocuments(),
    ApiProject.countDocuments(),
    ApiKey.countDocuments({ revoked: false }),
    ApiRequestLog.countDocuments(),
    ApiRequestLog.countDocuments({ statusCode: { $gte: 400 } }),
  ]);
  res.json({ success: true, data: { users, projects, activeKeys: keys, totalRequests: requests, totalErrors: errors } });
});

const users = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const [items, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(),
  ]);
  const safe = items.map((u) => ({ ...u, passwordHash: undefined, resetToken: undefined, verificationToken: undefined, resetExpires: undefined }));
  res.json({ success: true, data: buildPaginatedResponse(safe, total, page, limit) });
});

async function audit(actor, action, target) {
  try {
    await Notification.create({
      user: actor?._id || null,
      email: actor?.email || '',
      type: 'audit',
      subject: action,
      body: target || '',
    });
  } catch {}
}

const suspendUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');
  if (user._id.toString() === req.user._id.toString()) throw new ApiError(400, 'Cannot suspend yourself', 'VALIDATION_ERROR');
  // Explicit body wins (idempotent); otherwise toggle for backwards compatibility.
  const next = typeof req.body?.suspended === 'boolean' ? req.body.suspended : !user.suspended;
  user.suspended = next;
  await user.save();
  await audit(req.user, user.suspended ? 'user.suspended' : 'user.unsuspended', String(user._id));
  res.json({ success: true, data: user.toSafeJSON() });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body || {};
  if (!['user', 'developer', 'admin'].includes(role)) throw new ApiError(400, 'role must be user, developer or admin', 'VALIDATION_ERROR');
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');
  if (user._id.toString() === req.user._id.toString() && role !== 'admin') {
    throw new ApiError(400, 'Cannot demote yourself from admin', 'VALIDATION_ERROR');
  }
  if (user.role === 'admin' && role !== 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) throw new ApiError(400, 'Cannot demote the last admin', 'VALIDATION_ERROR');
  }
  user.role = role;
  await user.save();
  await audit(req.user, `user.role:${role}`, String(user._id));
  res.json({ success: true, data: user.toSafeJSON() });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');
  if (user._id.toString() === req.user._id.toString()) throw new ApiError(400, 'Cannot delete yourself', 'VALIDATION_ERROR');
  await user.deleteOne();
  await audit(req.user, 'user.deleted', String(user._id));
  res.json({ success: true, data: { message: 'User deleted' } });
});

const auditTrail = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const [items, total] = await Promise.all([
    Notification.find({ type: 'audit' }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments({ type: 'audit' }),
  ]);
  res.json({ success: true, data: buildPaginatedResponse(items, total, page, limit) });
});

const projects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const [items, total] = await Promise.all([
    ApiProject.find().populate('owner', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    ApiProject.countDocuments(),
  ]);
  res.json({ success: true, data: buildPaginatedResponse(items, total, page, limit) });
});

const keys = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const [items, total] = await Promise.all([
    ApiKey.find().populate('project', 'name').populate('owner', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ApiKey.countDocuments(),
  ]);
  const safe = items.map(({ keyHash, ...r }) => r);
  res.json({ success: true, data: buildPaginatedResponse(safe, total, page, limit) });
});

const requests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const [items, total] = await Promise.all([
    ApiRequestLog.find().populate('project', 'name').sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    ApiRequestLog.countDocuments(),
  ]);
  res.json({ success: true, data: buildPaginatedResponse(items, total, page, limit) });
});

const errors = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { statusCode: { $gte: 400 } };
  const [items, total] = await Promise.all([
    ApiRequestLog.find(filter).populate('project', 'name').sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    ApiRequestLog.countDocuments(filter),
  ]);
  res.json({ success: true, data: buildPaginatedResponse(items, total, page, limit) });
});

const health = asyncHandler(async (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 connected
  res.json({
    success: true,
    data: {
      db: dbState === 1 ? 'up' : 'down',
      dbState,
      redis: redisAvailable() ? 'up' : 'fallback-memory',
      uptimeSec: Math.floor(process.uptime()),
      time: new Date().toISOString(),
    },
  });
});

const getSettings = asyncHandler(async (req, res) => {
  const items = await SystemSetting.find().lean();
  const obj = {};
  items.forEach((s) => {
    obj[s.key] = s.value;
  });
  res.json({ success: true, data: obj });
});

const ALLOWED_SETTINGS = new Set([
  'globalRateWindowMs',
  'globalRateMax',
  'maintenanceMode',
  'allowRegistration',
  'logRetentionDays',
  'defaultProjectRateLimit',
  'webhookTimeoutMs',
]);

const putSettings = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const keys = Object.keys(body);
  if (keys.length > 20) throw new ApiError(400, 'Too many settings at once', 'VALIDATION_ERROR');
  for (const key of keys) {
    if (!ALLOWED_SETTINGS.has(key)) throw new ApiError(400, `Setting not allowed: ${key}`, 'VALIDATION_ERROR');
    const val = body[key];
    if (typeof val === 'string' && val.length > 2000) throw new ApiError(400, `Value too long for ${key}`, 'VALIDATION_ERROR');
  }
  const ops = Object.entries(body).map(([key, value]) =>
    SystemSetting.updateOne({ key }, { $set: { value, updatedBy: req.user._id } }, { upsert: true })
  );
  await Promise.all(ops);
  await audit(req.user, 'settings.updated', Object.keys(body).join(','));
  const items = await SystemSetting.find().lean();
  const obj = {};
  items.forEach((s) => {
    obj[s.key] = s.value;
  });
  res.json({ success: true, data: obj });
});

module.exports = { overview, users, suspendUser, updateUserRole, deleteUser, auditTrail, projects, keys, requests, errors, health, getSettings, putSettings };
