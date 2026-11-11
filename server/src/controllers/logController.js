const mongoose = require('mongoose');
const ApiRequestLog = require('../models/ApiRequestLog');
const ApiProject = require('../models/ApiProject');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.projectId) {
    filter.project = req.query.projectId;
  }
  // non-admin: restrict to own projects
  if (req.user.role !== 'admin') {
    const mine = await ApiProject.find({ owner: req.user._id }).select('_id');
    const ids = mine.map((p) => p._id);
    if (req.query.projectId) {
      if (!ids.map(String).includes(String(req.query.projectId))) {
        throw new ApiError(403, 'Forbidden: not your project', 'FORBIDDEN');
      }
    } else {
      filter.project = { $in: ids };
    }
  }
  if (req.query.status) {
    const s = String(req.query.status).toLowerCase();
    if (s === '2xx') filter.statusCode = { $gte: 200, $lt: 300 };
    else if (s === '4xx') filter.statusCode = { $gte: 400, $lt: 500 };
    else if (s === '5xx') filter.statusCode = { $gte: 500, $lt: 600 };
    else {
      const code = parseInt(s, 10);
      if (!Number.isNaN(code)) filter.statusCode = code;
    }
  }
  if (req.query.method) filter.method = String(req.query.method).toUpperCase();
  if (req.query.endpoint) filter.endpoint = { $regex: escapeRegex(String(req.query.endpoint)).slice(0, 120), $options: 'i' };
  if (req.query.search) {
    const safe = escapeRegex(String(req.query.search)).slice(0, 120);
    filter.$or = [
      { path: { $regex: safe, $options: 'i' } },
      { endpoint: { $regex: safe, $options: 'i' } },
      { ip: { $regex: safe, $options: 'i' } },
    ];
  }
  if (req.query.from || req.query.to) {
    filter.timestamp = {};
    if (req.query.from) filter.timestamp.$gte = new Date(req.query.from);
    if (req.query.to) {
      const to = new Date(req.query.to);
      // date-only input (YYYY-MM-DD) means end of that day, else exact time
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to))) to.setHours(23, 59, 59, 999);
      filter.timestamp.$lte = to;
    }
  }
  const [items, total] = await Promise.all([
    ApiRequestLog.find(filter).populate('project', 'name').sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    ApiRequestLog.countDocuments(filter),
  ]);
  res.json({ success: true, data: buildPaginatedResponse(items, total, page, limit) });
});

function buildLogFilter(query, ids) {
  const filter = {};
  if (query.projectId) filter.project = query.projectId;
  if (ids) filter.project = filter.project || { $in: ids };
  if (query.status) {
    const s = String(query.status).toLowerCase();
    if (s === '2xx') filter.statusCode = { $gte: 200, $lt: 300 };
    else if (s === '4xx') filter.statusCode = { $gte: 400, $lt: 500 };
    else if (s === '5xx') filter.statusCode = { $gte: 500, $lt: 600 };
    else {
      const code = parseInt(s, 10);
      if (!Number.isNaN(code)) filter.statusCode = code;
    }
  }
  if (query.method) filter.method = String(query.method).toUpperCase();
  if (query.endpoint) filter.endpoint = { $regex: escapeRegex(String(query.endpoint)).slice(0, 120), $options: 'i' };
  if (query.search) {
    const safe = escapeRegex(String(query.search)).slice(0, 120);
    filter.$or = [
      { path: { $regex: safe, $options: 'i' } },
      { endpoint: { $regex: safe, $options: 'i' } },
      { ip: { $regex: safe, $options: 'i' } },
    ];
  }
  if (query.from || query.to) {
    filter.timestamp = {};
    if (query.from) filter.timestamp.$gte = new Date(query.from);
    if (query.to) {
      const to = new Date(query.to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(query.to))) to.setHours(23, 59, 59, 999);
      filter.timestamp.$lte = to;
    }
  }
  return filter;
}

const exportLogs = asyncHandler(async (req, res) => {
  let ids = null;
  if (req.user.role !== 'admin') {
    const mine = await ApiProject.find({ owner: req.user._id }).select('_id');
    ids = mine.map((p) => p._id);
    if (req.query.projectId && !ids.map(String).includes(String(req.query.projectId))) {
      throw new ApiError(403, 'Forbidden: not your project', 'FORBIDDEN');
    }
  }
  const filter = buildLogFilter(req.query, ids);
  const items = await ApiRequestLog.find(filter).sort({ timestamp: -1 }).limit(2000).lean();
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = ['time,method,path,statusCode,responseTimeMs,ip'];
  for (const l of items) rows.push([l.timestamp?.toISOString?.() || l.timestamp, l.method, l.path, l.statusCode, l.responseTimeMs, l.ip].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="logs.csv"');
  res.send(rows.join('\n'));
});

module.exports = { list, exportLogs };
