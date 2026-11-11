const ApiRequestLog = require('../models/ApiRequestLog');

function getIo(req) {
  return req.app ? req.app.get('io') : null;
}

/**
 * Gateway request logger middleware.
 * Logs every /gateway/:projectId/* call into ApiRequestLog.
 * Never logs x-api-key or authorization header values.
 */
function gatewayRequestLogger(req, res, next) {
  const start = Date.now();
  const ip = req.ip || req.connection?.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  res.on('finish', async () => {
    try {
      const project = req.gatewayProject || req.apiProject || null;
      const projectId = project ? project._id || project : req.params.projectId;
      if (!projectId) return;
      const responseTimeMs = Date.now() - start;
      const fullPath = req.originalUrl || req.url;
      const endpointLabel = req.gatewayEndpoint
        ? `${req.gatewayEndpoint.method} ${req.gatewayEndpoint.path}`
        : `${req.method} ${req.path}`;
      const entry = {
        project: projectId,
        apiKey: req.apiKey ? req.apiKey._id : null,
        keyPrefix: req.apiKey ? req.apiKey.prefix : null,
        endpoint: endpointLabel,
        method: req.method,
        path: fullPath,
        statusCode: res.statusCode,
        responseTimeMs,
        ip,
        userAgent: String(userAgent).slice(0, 500),
        errorMessage: res.statusCode >= 400 ? (req.logErrorMessage || `Gateway responded ${res.statusCode}`) : null,
        timestamp: new Date(),
      };
      const doc = await ApiRequestLog.create(entry);
      // Update key usage atomically (avoid read-modify-write races).
      if (req.apiKey) {
        const ApiKey = require('../models/ApiKey');
        ApiKey.updateOne(
          { _id: req.apiKey._id },
          { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
        ).catch(() => {});
      }
      const io = getIo(req);
      if (io) {
        const pid = projectId.toString();
        const payload = {
          id: doc._id.toString(),
          project: pid,
          method: entry.method,
          path: entry.path,
          statusCode: entry.statusCode,
          responseTimeMs,
          timestamp: entry.timestamp,
        };
        // Scoped rooms only — never broadcast globally to avoid cross-tenant leaks.
        io.to(`project:${pid}`).emit('request:logged', payload);
        io.to(`project:${pid}`).emit('analytics:update', { project: pid, timestamp: entry.timestamp });
      }
    } catch (err) {
      // never crash on logging
      // eslint-disable-next-line no-console
      console.error('requestLogger failed:', err.message);
    }
  });

  next();
}

module.exports = { gatewayRequestLogger };
