const mongoSanitize = require('express-mongo-sanitize');
const sanitize = require('mongo-sanitize');

function sanitizeMiddleware(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object') req.body = sanitize(req.body);
    if (req.query && typeof req.query === 'object') {
      const clean = sanitize(req.query);
      // express-mongo-sanitize v2 mutates req.query getter; assign safely
      for (const k of Object.keys(req.query)) {
        if (Object.prototype.hasOwnProperty.call(clean, k)) req.query[k] = clean[k];
        else delete req.query[k];
      }
    }
    if (req.params && typeof req.params === 'object') req.params = sanitize(req.params);
  } catch (_) {
    // ignore sanitization errors — never block request
  }
  return next();
}

module.exports = { sanitizeMiddleware };
