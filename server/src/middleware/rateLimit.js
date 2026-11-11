const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { incrWithTTL } = require('../config/redis');
const { ApiError } = require('../utils/asyncHandler');

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
 * options: { windowSec, max, keyGenerator(req), message }
 * X-RateLimit-Reset is an epoch-seconds timestamp (not a duration).
 */
function resetHeader(windowSec) {
  return String(Math.ceil(Date.now() / 1000) + windowSec);
}

function createFixedWindowRateLimit({ windowSec = 60, max = 60, keyGenerator, message = 'Rate limit exceeded' }) {
  return async (req, res, next) => {
    try {
      const keyPart = keyGenerator ? await keyGenerator(req) : req.ip;
      const key = `rl:${keyPart}`;
      const count = await incrWithTTL(key, windowSec);
      const remaining = Math.max(0, max - count);
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', resetHeader(windowSec));
      if (count > max) {
        res.setHeader('Retry-After', String(windowSec));
        return res.status(429).json({ success: false, message, errorCode: 'RATE_LIMIT_EXCEEDED' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

const projectRateLimit = (maxPerMin = 120) =>
  createFixedWindowRateLimit({
    windowSec: 60,
    max: maxPerMin,
    keyGenerator: (req) => `proj:${req.params.projectId || req.query.projectId || 'unknown'}:${req.ip}`,
  });

// Dynamic per-key limit middleware: reads req.apiKey.rateLimitPerMin
async function perKeyRateLimit(req, res, next) {
  try {
    const max = (req.apiKey && req.apiKey.rateLimitPerMin) || 60;
    const windowSec = 60;
    const id = req.apiKey ? req.apiKey._id.toString() : `ip:${req.ip}`;
    const count = await incrWithTTL(`rl:key:${id}`, windowSec);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - count)));
    res.setHeader('X-RateLimit-Reset', resetHeader(windowSec));
    if (count > max) {
      res.setHeader('Retry-After', String(windowSec));
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
    const max = (project && project.rateLimitPerMin) || 300;
    const pid = (project && project._id ? project._id.toString() : req.params.projectId) || 'unknown';
    const windowSec = 60;
    const count = await incrWithTTL(`rl:proj:${pid}`, windowSec);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - count)));
    res.setHeader('X-RateLimit-Reset', resetHeader(windowSec));
    if (count > max) {
      // Fire limit webhook asynchronously (handled by gateway controller via header flag)
      req.rateLimited = true;
      res.setHeader('Retry-After', String(windowSec));
      return res.status(429).json({ success: false, message: 'Project rate limit exceeded', errorCode: 'RATE_LIMIT_EXCEEDED' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  globalLimiter,
  createFixedWindowRateLimit,
  projectRateLimit,
  perKeyRateLimit,
  perProjectRateLimit,
};
