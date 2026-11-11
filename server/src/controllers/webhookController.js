const { v4: uuidv4 } = require('uuid');
const ApiProject = require('../models/ApiProject');
const Webhook = require('../models/Webhook');
const WebhookDelivery = require('../models/WebhookDelivery');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const { canAccess } = require('./projectController');
const { triggerEvent, deliverOnce } = require('../services/webhookService');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');

async function loadProject(req) {
  const project = await ApiProject.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found', 'NOT_FOUND');
  if (!canAccess(project, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  return project;
}

const list = asyncHandler(async (req, res) => {
  await loadProject(req);
  const items = await Webhook.find({ project: req.params.id }).sort({ createdAt: -1 });
  res.json({ success: true, data: items });
});

const create = asyncHandler(async (req, res) => {
  const project = await loadProject(req);
  const doc = await Webhook.create({
    ...req.body,
    project: project._id,
    owner: req.user._id,
    secret: req.body.secret || uuidv4().replace(/-/g, '').slice(0, 32),
  });
  res.status(201).json({ success: true, data: doc });
});

const getOne = asyncHandler(async (req, res) => {
  const doc = await Webhook.findById(req.params.webhookId).populate('project');
  if (!doc) throw new ApiError(404, 'Webhook not found', 'NOT_FOUND');
  if (!canAccess(doc.project, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  res.json({ success: true, data: doc });
});

const update = asyncHandler(async (req, res) => {
  const doc = await Webhook.findById(req.params.webhookId).populate('project');
  if (!doc) throw new ApiError(404, 'Webhook not found', 'NOT_FOUND');
  if (!canAccess(doc.project, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  // Accept both `isActive` (schema) and legacy `active` alias.
  if (req.body.active !== undefined && req.body.isActive === undefined) req.body.isActive = req.body.active;
  const ALLOWED = ['url', 'events', 'secret', 'isActive', 'headers'];
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) doc[k] = req.body[k];
  }
  await doc.save();
  res.json({ success: true, data: doc });
});

const remove = asyncHandler(async (req, res) => {
  const doc = await Webhook.findById(req.params.webhookId).populate('project');
  if (!doc) throw new ApiError(404, 'Webhook not found', 'NOT_FOUND');
  if (!canAccess(doc.project, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  await WebhookDelivery.deleteMany({ webhook: doc._id });
  await doc.deleteOne();
  res.json({ success: true, data: { message: 'Webhook deleted' } });
});

const deliveries = asyncHandler(async (req, res) => {
  const doc = await Webhook.findById(req.params.id).populate('project');
  if (!doc) throw new ApiError(404, 'Webhook not found', 'NOT_FOUND');
  if (!canAccess(doc.project, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  const { page, limit, skip } = getPagination(req.query);
  const [items, total] = await Promise.all([
    WebhookDelivery.find({ webhook: doc._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    WebhookDelivery.countDocuments({ webhook: doc._id }),
  ]);
  res.json({ success: true, data: buildPaginatedResponse(items, total, page, limit) });
});

const test = asyncHandler(async (req, res) => {
  const doc = await Webhook.findById(req.params.id).populate('project');
  if (!doc) throw new ApiError(404, 'Webhook not found', 'NOT_FOUND');
  if (!canAccess(doc.project, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  const delivery = await WebhookDelivery.create({
    webhook: doc._id,
    project: doc.project._id,
    event: 'webhook.test',
    payload: { ping: true, at: new Date().toISOString() },
    status: 'pending',
  });
  const result = await deliverOnce(doc, 'webhook.test', { ping: true }, delivery);
  res.json({ success: true, data: { delivery, result } });
});

module.exports = { list, create, getOne, update, remove, deliveries, test };
