const { hashApiKey } = require('../utils/apiKey');
const ApiKey = require('../models/ApiKey');

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

module.exports = { loadApiKey };
