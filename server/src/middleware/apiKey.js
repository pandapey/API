const { hashApiKey } = require('../utils/apiKey');
const { ApiError } = require('../utils/asyncHandler');
const ApiKey = require('../models/ApiKey');
const ApiProject = require('../models/ApiProject');

// Optional loader: attaches req.apiKey / req.apiProject if valid key present, else null
async function loadApiKey(req, res, next) {
  try {
    const raw = req.headers['x-api-key'];
    if (!raw) {
      req.apiKey = null;
      req.apiProject = null;
      return next();
    }
    const hash = hashApiKey(String(raw));
    const key = await ApiKey.findOne({ keyHash: hash }).populate('project');
    if (!key || key.revoked) {
      req.apiKey = null;
      req.apiProject = null;
      return next();
    }
    if (key.expiresAt && key.expiresAt < new Date()) {
      req.apiKey = null;
      req.apiProject = null;
      return next();
    }
    req.apiKey = key;
    req.apiProject = key.project;
    next();
  } catch (err) {
    next(err);
  }
}

function requireApiKey(req, res, next) {
  loadApiKey(req, res, (err) => {
    if (err) return next(err);
    if (!req.apiKey) return next(new ApiError(401, 'Invalid or missing API key', 'INVALID_API_KEY'));
    return next();
  });
}

// Gateway-aware: if endpoint requires auth, enforce; otherwise allow anonymous
// Expects req.gatewayEndpoint to be set before this runs (or skips enforcement)
function requireApiKeyIfNeeded(req, res, next) {
  loadApiKey(req, res, (err) => {
    if (err) return next(err);
    const ep = req.gatewayEndpoint;
    if (ep && ep.authRequired && !req.apiKey) {
      return next(new ApiError(401, 'API key required for this endpoint', 'INVALID_API_KEY'));
    }
    // If no endpoint context (unknown route), require key if header present? Allow anonymous for discovery -> 404 later
    if (!ep && req.headers['x-api-key'] && !req.apiKey) {
      return next(new ApiError(401, 'Invalid API key', 'INVALID_API_KEY'));
    }
    return next();
  });
}

module.exports = { loadApiKey, requireApiKey, requireApiKeyIfNeeded };
