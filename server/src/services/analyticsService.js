const mongoose = require('mongoose');
const ApiRequestLog = require('../models/ApiRequestLog');
const ApiKey = require('../models/ApiKey');

function toObjectIds(id) {
  const list = Array.isArray(id) ? id : [id];
  const out = [];
  for (const v of list) {
    if (!v) continue;
    try {
      out.push(new mongoose.Types.ObjectId(v));
    } catch {}
  }
  return out;
}

function matchFor(projectId, from, to) {
  const ids = toObjectIds(projectId);
  const match = { timestamp: { $gte: from, $lte: to } };
  if (ids.length === 1) match.project = ids[0];
  else if (ids.length > 1) match.project = { $in: ids };
  // 0 ids (new user, no projects) -> match nothing
  else match.project = { $in: [] };
  return match;
}

function percentile(sortedArr, p) {
  if (!sortedArr.length) return 0;
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.min(Math.max(idx, 0), sortedArr.length - 1)];
}

async function getOverview(projectId, from, to) {
  const match = matchFor(projectId, from, to);

  // Single $facet round-trip for range-scoped stats (was 6+ queries + in-memory sort).
  const [faceted] = await ApiRequestLog.aggregate([
    { $match: match },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
              avgLatency: { $avg: '$responseTimeMs' },
            },
          },
        ],
        byStatus: [
          { $group: { _id: '$statusCode', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
        byEndpoint: [
          { $group: { _id: '$endpoint', count: { $sum: 1 }, avgLatency: { $avg: '$responseTimeMs' } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ],
        byDay: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              count: { $sum: 1 },
              errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
              avgLatency: { $avg: '$responseTimeMs' },
            },
          },
          { $sort: { _id: 1 } },
        ],
        rate: [
          { $match: { statusCode: 429 } },
          { $count: 'count' },
        ],
        p95: [
          {
            $group: {
              _id: null,
              // MongoDB 7+: approximate percentile in-DB, no 10k in-memory sort.
              p95: { $percentile: { input: '$responseTimeMs', p: [0.95], method: 'approximate' } },
            },
          },
        ],
      },
    },
  ]).catch(() => [null]);

  let totals = faceted?.totals?.[0];
  let byStatus = faceted?.byStatus || [];
  let byEndpoint = faceted?.byEndpoint || [];
  let byDay = faceted?.byDay || [];
  let rateLimited = faceted?.rate?.[0]?.count || 0;
  let p95 = Array.isArray(faceted?.p95?.[0]?.p95) ? faceted.p95[0].p95[0] : faceted?.p95?.[0]?.p95;

  // Fallback for Mongo versions without $percentile (e.g. older memory-server).
  if ((p95 == null || Number.isNaN(p95)) && (totals?.total || 0) > 0) {
    try {
      const docs = await ApiRequestLog.find(match).select('responseTimeMs').sort({ responseTimeMs: 1 }).limit(10000).lean();
      const arr = docs.map((d) => d.responseTimeMs).sort((a, b) => a - b);
      p95 = percentile(arr, 95);
    } catch {
      p95 = totals?.avgLatency || 0;
    }
  }
  // Ultimate fallback if $facet itself failed (very old Mongo).
  if (!totals) {
    const [t] = await ApiRequestLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
          avgLatency: { $avg: '$responseTimeMs' },
        },
      },
    ]);
    totals = t;
    if (!byStatus.length) {
      byStatus = await ApiRequestLog.aggregate([
        { $match: match },
        { $group: { _id: '$statusCode', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
    }
  }

  const total = totals?.total || 0;
  const errors = totals?.errors || 0;
  const avgLatency = totals?.avgLatency || 0;
  const errorRate = total ? (errors / total) * 100 : 0;
  p95 = p95 || 0;
  const keyIds = toObjectIds(projectId);
  let activeKeys = 0;
  if (keyIds.length) {
    activeKeys = await ApiKey.countDocuments({
      project: keyIds.length === 1 ? keyIds[0] : { $in: keyIds },
      revoked: false,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });
  }

  // Accurate today (local midnight) + calendar month counts (same project scope, ignore range)
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const scopeMatch = {};
  if (keyIds.length === 1) scopeMatch.project = keyIds[0];
  else if (keyIds.length > 1) scopeMatch.project = { $in: keyIds };
  else scopeMatch.project = { $in: [] };
  const [today, month] = await Promise.all([
    ApiRequestLog.countDocuments({ ...scopeMatch, timestamp: { $gte: dayStart, $lte: now } }),
    ApiRequestLog.countDocuments({ ...scopeMatch, timestamp: { $gte: monthStart, $lte: now } }),
  ]);

  return {
    total,
    errors,
    errorRate: Number(errorRate.toFixed(2)),
    avgLatencyMs: Number(Number(avgLatency).toFixed(2)),
    p95LatencyMs: Number(Number(p95).toFixed(2)),
    today,
    month,
    activeKeys,
    keys: activeKeys,
    rateLimited,
    throttled: rateLimited,
    byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
    byEndpoint: byEndpoint.map((e) => ({ endpoint: e._id, count: e.count, avgLatencyMs: Number(Number(e.avgLatency).toFixed(2)) })),
    byDay: byDay.map((d) => ({ date: d._id, count: d.count, errors: d.errors, avgLatencyMs: Number(Number(d.avgLatency || 0).toFixed(2)) })),
  };
}

async function getByEndpoints(projectId, from, to, limit = 20) {
  const match = matchFor(projectId, from, to);
  return ApiRequestLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: { endpoint: '$endpoint', method: '$method' },
        count: { $sum: 1 },
        avgLatency: { $avg: '$responseTimeMs' },
        errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
}

async function getByStatus(projectId, from, to) {
  const match = matchFor(projectId, from, to);
  return ApiRequestLog.aggregate([
    { $match: match },
    { $group: { _id: '$statusCode', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
}

function parseRange(range, fromQ, toQ) {
  const now = new Date();
  let to = toQ ? new Date(toQ) : now;
  let from;
  if (fromQ) {
    from = new Date(fromQ);
  } else if (range === 'today') {
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
  } else if (range === '30d') {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    // default 7d
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (isNaN(from.getTime())) from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (isNaN(to.getTime())) to = now;
  return { from, to };
}

module.exports = { getOverview, getByEndpoints, getByStatus, parseRange };
