const ApiProject = require('../models/ApiProject');
const ApiKey = require('../models/ApiKey');
const { generateApiKey, hashApiKey } = require('../utils/apiKey');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');
const { canAccess } = require('./projectController');

const listMine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { owner: req.user._id };
  if (req.query.projectId) filter.project = req.query.projectId;
  const [items, total] = await Promise.all([
    ApiKey.find(filter).populate('project', 'name status').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ApiKey.countDocuments(filter),
  ]);
  // never expose hash
  const safe = items.map(({ keyHash, ...rest }) => rest);
  res.json({ success: true, data: buildPaginatedResponse(safe, total, page, limit) });
});

const createForProject = asyncHandler(async (req, res) => {
  const project = await ApiProject.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found', 'NOT_FOUND');
  if (!canAccess(project, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  const { name, rateLimitPerMin, expiresAt, scopes } = req.body;
  const { raw, hash, prefix, last4 } = generateApiKey();
  const doc = await ApiKey.create({
    name,
    keyHash: hash,
    prefix,
    last4,
    project: project._id,
    owner: req.user._id,
    rateLimitPerMin: rateLimitPerMin || 60,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    scopes: scopes || [],
  });
  res.status(201).json({
    success: true,
    data: {
      id: doc._id,
      name: doc.name,
      prefix: doc.prefix,
      last4: doc.last4,
      project: doc.project,
      rateLimitPerMin: doc.rateLimitPerMin,
      apiKey: raw, // shown only once
      message: 'Store this key securely. It will not be shown again.',
    },
  });
});

async function loadKeyOwned(req) {
  const key = await ApiKey.findById(req.params.id).populate('project');
  if (!key) throw new ApiError(404, 'API key not found', 'NOT_FOUND');
  if (req.user.role !== 'admin' && key.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  }
  return key;
}

const revoke = asyncHandler(async (req, res) => {
  const key = await loadKeyOwned(req);
  key.revoked = true;
  key.revokedAt = new Date();
  await key.save();
  res.json({ success: true, data: { message: 'Key revoked', id: key._id } });
});

const rotate = asyncHandler(async (req, res) => {
  const old = await loadKeyOwned(req);
  old.revoked = true;
  old.revokedAt = new Date();
  await old.save();
  const { raw, hash, prefix, last4 } = generateApiKey();
  const doc = await ApiKey.create({
    name: old.name,
    keyHash: hash,
    prefix,
    last4,
    project: old.project._id || old.project,
    owner: old.owner,
    rateLimitPerMin: old.rateLimitPerMin,
    expiresAt: old.expiresAt || null,
    scopes: old.scopes,
  });
  res.status(201).json({
    success: true,
    data: { id: doc._id, prefix, last4, apiKey: raw, message: 'Old key revoked. New key shown once.' },
  });
});

const remove = asyncHandler(async (req, res) => {
  const key = await loadKeyOwned(req);
  await key.deleteOne();
  res.json({ success: true, data: { message: 'Key deleted' } });
});

module.exports = { listMine, createForProject, revoke, rotate, remove };
