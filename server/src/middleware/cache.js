const { getCache, setCache } = require('../config/redis');

function cacheResponse(ttlSec = 30, keyFn) {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();
    try {
      const key = keyFn ? keyFn(req) : `route:${req.originalUrl}`;
      const cached = await getCache(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode === 200) {
          setCache(key, body, ttlSec).catch(() => {});
        }
        res.setHeader('X-Cache', 'MISS');
        return originalJson(body);
      };
      next();
    } catch (err) {
      next();
    }
  };
}

module.exports = { cacheResponse };
