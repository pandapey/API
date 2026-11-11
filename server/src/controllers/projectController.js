const ApiProject = require('../models/ApiProject');
const ApiVersion = require('../models/ApiVersion');
const ApiEndpoint = require('../models/ApiEndpoint');
const ApiKey = require('../models/ApiKey');
const ApiRequestLog = require('../models/ApiRequestLog');
const logger = require('../config/logger');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');

function canAccess(project, user) {
  if (!project) return false;
  if (!user) return false;
  if (user.role === 'admin') return true;
  // owner may be ObjectId or populated { _id, email, ... } (getOne populates it)
  const ownerId = project.owner && project.owner._id ? project.owner._id.toString() : String(project.owner);
  const userId = user._id ? user._id.toString() : String(user.id || user);
  const ok = ownerId === userId;
  if (!ok) {
    logger.warn(`FORBIDDEN project=${project._id} owner=${ownerId} requester=${userId} (${user.email}) role=${user.role}`);
  }
  return ok;
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.user.role !== 'admin') filter.owner = req.user._id;
  else if (req.query.owner) filter.owner = req.query.owner;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.name = { $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 120), $options: 'i' };
  const [items, total] = await Promise.all([
    ApiProject.find(filter).populate('owner', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    ApiProject.countDocuments(filter),
  ]);
  res.json({ success: true, data: buildPaginatedResponse(items, total, page, limit) });
});

const create = asyncHandler(async (req, res) => {
  const { name, description, basePath, upstreamUrl, rateLimitPerMin } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  const project = await ApiProject.create({
    name,
    slug,
    description: description || '',
    basePath: basePath || '',
    upstreamUrl: (upstreamUrl || '').trim().replace(/\/$/, ''),
    owner: req.user._id,
    rateLimitPerMin: rateLimitPerMin || 120,
  });
  res.status(201).json({ success: true, data: project });
});

const getOne = asyncHandler(async (req, res) => {
  const project = await ApiProject.findById(req.params.id).populate('owner', 'name email');
  if (!project) throw new ApiError(404, 'Project not found', 'NOT_FOUND');
  if (!canAccess(project, req.user)) {
    throw new ApiError(403, 'Forbidden: you do not have access to this project', 'FORBIDDEN');
  }
  res.json({ success: true, data: project });
});

const update = asyncHandler(async (req, res) => {
  const project = await ApiProject.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found', 'NOT_FOUND');
  if (!canAccess(project, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  const ALLOWED = ['name', 'description', 'basePath', 'upstreamUrl', 'rateLimitPerMin', 'status'];
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) project[k] = req.body[k];
  }
  if (typeof project.upstreamUrl === 'string') {
    project.upstreamUrl = project.upstreamUrl.trim().replace(/\/$/, '');
  }
  await project.save();
  res.json({ success: true, data: project });
});

const remove = asyncHandler(async (req, res) => {
  const project = await ApiProject.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found', 'NOT_FOUND');
  if (!canAccess(project, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  const Webhook = require('../models/Webhook');
  const WebhookDelivery = require('../models/WebhookDelivery');
  const UsageRecord = require('../models/UsageRecord');
  await ApiVersion.deleteMany({ project: project._id });
  await ApiEndpoint.deleteMany({ project: project._id });
  await ApiKey.deleteMany({ project: project._id });
  await ApiRequestLog.deleteMany({ project: project._id }).catch(() => {});
  await Webhook.deleteMany({ project: project._id }).catch(() => {});
  await WebhookDelivery.deleteMany({ project: project._id }).catch(() => {});
  await UsageRecord.deleteMany({ project: project._id }).catch(() => {});
  await project.deleteOne();
  res.json({ success: true, data: { message: 'Project deleted' } });
});

const publish = asyncHandler(async (req, res) => {
  const project = await ApiProject.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found', 'NOT_FOUND');
  if (!canAccess(project, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  project.status = 'published';
  await project.save();
  res.json({ success: true, data: project });
});

const unpublish = asyncHandler(async (req, res) => {
  const project = await ApiProject.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found', 'NOT_FOUND');
  if (!canAccess(project, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  project.status = 'draft';
  await project.save();
  res.json({ success: true, data: project });
});

module.exports = { list, create, getOne, update, remove, publish, unpublish, canAccess };
