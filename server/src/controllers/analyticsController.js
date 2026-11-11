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
  // Cache the full response shape (including `range`) so cached and fresh
  // responses are identical for the client.
  const payload = { ...(await getOverviewCached(cacheKey, ids, f, t)), range: { from: f, to: t } };
  res.json({ success: true, data: payload });
});

async function getOverviewCached(cacheKey, ids, f, t) {
  const cached = await getCache(cacheKey);
  if (cached) return cached;
  const data = await getOverview(ids.length === 1 ? ids[0] : ids, f, t);
  await setCache(cacheKey, data, 30);
  return data;
}

const byEndpoints = asyncHandler(async (req, res) => {
  const { projectId, range, from, to, limit } = req.query;
  const ids = await resolveProjectIds(projectId, req.user);
  const { from: f, to: t } = parseRange(range, from, to);
  // Sanitize limit: non-numeric/negative values must degrade to the default, not 500.
  const n = parseInt(limit || '20', 10);
  const lim = Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 20;
  const data = await getByEndpoints(ids.length === 1 ? ids[0] : ids, f, t, lim);
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
  // Flat per-day series so the client can plot the latency trend directly.
  res.json({
    success: true,
    data: {
      avgLatencyMs: data.avgLatencyMs,
      p95LatencyMs: data.p95LatencyMs,
      byDay: (data.byDay || []).map((d) => ({ date: d.date, avgLatencyMs: d.avgLatencyMs, count: d.count })),
    },
  });
});

module.exports = { overview, byEndpoints, byStatus, timeseries, latency };
