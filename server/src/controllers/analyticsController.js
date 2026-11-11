const ApiProject = require('../models/ApiProject');
const { getOverview, getByEndpoints, getByStatus, parseRange } = require('../services/analyticsService');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const { getCache, setCache } = require('../config/redis');

async function checkAccess(projectId, user) {
  const project = await ApiProject.findById(projectId);
  if (!project) throw new ApiError(404, 'Project not found', 'NOT_FOUND');
  const ownerId = project.owner && project.owner._id ? project.owner._id.toString() : String(project.owner);
  const userId = user._id ? user._id.toString() : String(user.id || user);
  if (user.role !== 'admin' && ownerId !== userId) {
    throw new ApiError(403, 'Forbidden: you do not have access to this project', 'FORBIDDEN');
  }
  return project;
}

async function resolveProjectIds(projectId, user) {
  if (projectId) {
    await checkAccess(projectId, user);
    return [projectId];
  }
  const filter = user.role === 'admin' ? {} : { owner: user._id };
  const projects = await ApiProject.find(filter).select('_id').lean();
  return projects.map((p) => p._id.toString());
}

const overview = asyncHandler(async (req, res) => {
  const { projectId, range, from, to } = req.query;
  const ids = await resolveProjectIds(projectId, req.user);
  const { from: f, to: t } = parseRange(range, from, to);
  const userId = req.user?._id ? String(req.user._id) : String(req.user?.id || 'anon');
  const cacheKey = `analytics:overview:${userId}:${projectId || 'all'}:${f.toISOString()}:${t.toISOString()}`;
  const cached = await getCache(cacheKey);
  if (cached) return res.json({ success: true, data: cached });
  const data = await getOverview(ids.length === 1 ? ids[0] : ids, f, t);
  await setCache(cacheKey, data, 30);
  res.json({ success: true, data: { ...data, range: { from: f, to: t } } });
});

const byEndpoints = asyncHandler(async (req, res) => {
  const { projectId, range, from, to, limit } = req.query;
  const ids = await resolveProjectIds(projectId, req.user);
  const { from: f, to: t } = parseRange(range, from, to);
  const data = await getByEndpoints(ids.length === 1 ? ids[0] : ids, f, t, Math.min(parseInt(limit || '20', 10), 100));
  res.json({ success: true, data });
});

const byStatus = asyncHandler(async (req, res) => {
  const { projectId, range, from, to } = req.query;
  const ids = await resolveProjectIds(projectId, req.user);
  const { from: f, to: t } = parseRange(range, from, to);
  const data = await getByStatus(ids.length === 1 ? ids[0] : ids, f, t);
  res.json({ success: true, data });
});

const timeseries = asyncHandler(async (req, res) => {
  const { projectId, range, from, to } = req.query;
  const ids = await resolveProjectIds(projectId, req.user);
  const { from: f, to: t } = parseRange(range, from, to);
  const data = await getOverview(ids.length === 1 ? ids[0] : ids, f, t);
  res.json({ success: true, data: data.byDay || [] });
});

const latency = asyncHandler(async (req, res) => {
  const { projectId, range, from, to } = req.query;
  const ids = await resolveProjectIds(projectId, req.user);
  const { from: f, to: t } = parseRange(range, from, to);
  const data = await getOverview(ids.length === 1 ? ids[0] : ids, f, t);
  res.json({ success: true, data: [{ avgLatency: data.avgLatencyMs, p95: data.p95LatencyMs, byDay: data.byDay }] });
});

module.exports = { overview, byEndpoints, byStatus, timeseries, latency };
