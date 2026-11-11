const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { incrWithTTL } = require('../config/redis');
const logger = require('../config/logger');
const { getSetting } = require('../services/systemSettings');

const globalLimiter = rateLimit({
  windowMs: env.globalRateWindowMs,
  max: env.globalRateMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ success: false, message: 'Too many requests', errorCode: 'RATE_LIMIT_EXCEEDED' });
  },
});

/**
 * Redis-backed fixed window.
 * X-RateLimit-Reset is an epoch-seconds timestamp (not a duration).
 */
function resetHeader(windowSec) {
  return String(Math.ceil(Date.now() / 1000) + windowSec);
}

function setLimitHeaders(res, max, count, windowSec) {
  res.setHeader('X-RateLimit-Limit', String(max));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - count)));
  res.setHeader('X-RateLimit-Reset', resetHeader(windowSec));
}

// Fire the documented `api.limit.reached` webhook when a project/key hits its cap.
function fireLimitReachedWebhook(req, scope, max) {
  try {
    const project = req.apiProject || req.gatewayProject || req.apiKey?.project || null;
    const projectId = project?._id?.toString?.() || (project ? String(project) : null);
    if (!projectId) return;
    const { triggerEvent } = require('../services/webhookService');
    triggerEvent(projectId, 'api.limit.reached', {
      scope,
      limit: max,
      keyPrefix: req.apiKey?.prefix || null,
      path: req.originalUrl || req.url,
    }).catch((e) => logger.warn(`webhook trigger failed: ${e.message}`));
  } catch (_) {}
}

// Dynamic per-key limit middleware: reads req.apiKey.rateLimitPerMin.
// Anonymous gateway traffic (no key) is already limited per-project by
// perProjectRateLimit — a fallback per-IP key limit would overwrite the
// project headers and double-limit anonymous callers, so skip it there.
async function perKeyRateLimit(req, res, next) {
  try {
    if (!req.apiKey) return next();
    const max = req.apiKey.rateLimitPerMin || 60;
    const windowSec = 60;
    const id = req.apiKey ? req.apiKey._id.toString() : `ip:${req.ip}`;
    const count = await incrWithTTL(`rl:key:${id}`, windowSec);
    setLimitHeaders(res, max, count, windowSec);
    if (count > max) {
      res.setHeader('Retry-After', String(windowSec));
      fireLimitReachedWebhook(req, 'key', max);
      return res.status(429).json({ success: false, message: 'API key rate limit exceeded', errorCode: 'RATE_LIMIT_EXCEEDED' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

async function perProjectRateLimit(req, res, next) {
  try {
    const project = req.apiProject || req.gatewayProject;
    // Effective limit precedence: project's own limit → defaultProjectRateLimit
    // setting (admin tunable) → 300. globalRateMax is a platform ceiling:
    // when > 0, no project can exceed it, even with an explicit higher limit.
    let max = Number((project && project.rateLimitPerMin) || 0);
    if (!max) max = Number(await getSetting('defaultProjectRateLimit', 300)) || 300;
    const ceiling = Number(await getSetting('globalRateMax', 0));
    if (ceiling > 0) max = Math.min(max, ceiling);
    const pid = (project && project._id ? project._id.toString() : req.params.projectId) || 'unknown';
    const windowSec = 60;
    const count = await incrWithTTL(`rl:proj:${pid}`, windowSec);
    setLimitHeaders(res, max, count, windowSec);
    if (count > max) {
      res.setHeader('Retry-After', String(windowSec));
      fireLimitReachedWebhook(req, 'project', max);
      return res.status(429).json({ success: false, message: 'Project rate limit exceeded', errorCode: 'RATE_LIMIT_EXCEEDED' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Load the gateway project (lightweight) so per-project rate limits are enforced
 * even for anonymous traffic (endpoints with authRequired: false).
 * Never throws: invalid/missing project ids fall through so the gateway handler
 * produces its proper 404/CastError response.
 */
async function loadGatewayProject(req, res, next) {
  try {
    if (req.apiProject) return next();
    const { projectId } = req.params;
    const raw = String(projectId || '');
    const ApiProject = require('../models/ApiProject');
    if (/^[a-fA-F0-9]{24}$/.test(raw)) {
      const project = await ApiProject.findById(raw).select('rateLimitPerMin status').lean();
      if (project) req.gatewayProject = project;
    } else if (raw) {
      const project = await ApiProject.findOne({ slug: raw.toLowerCase().trim() }).select('rateLimitPerMin status').lean();
      if (project) req.gatewayProject = project;
    }
  } catch (_) {}
  return next();
}

/**
 * Maintenance gate: when admins flip `maintenanceMode`, gateway traffic
 * (proxy + mock) answers 503 while the management API stays up so the
 * setting can be turned back off.
 */
async function maintenanceGate(req, res, next) {
  try {
    const on = await getSetting('maintenanceMode', false);
    if (on === true || on === 'true') {
      return res.status(503).json({
        success: false,
        message: 'Gateway is in maintenance mode. Try again shortly.',
        errorCode: 'MAINTENANCE_MODE',
      });
    }
  } catch (_) { /* never fail-open into a 500 — default is off anyway */ }
  next();
}

module.exports = {
  globalLimiter,
  perKeyRateLimit,
  perProjectRateLimit,
  loadGatewayProject,
  maintenanceGate,
};
