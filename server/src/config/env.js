require('dotenv').config();

function get(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

const DEFAULT_ACCESS = 'dev-access-secret-change-me-please-32chars';
const DEFAULT_REFRESH = 'dev-refresh-secret-change-me-please-32chars';
if (get('NODE_ENV', 'development') === 'production') {
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    // eslint-disable-next-line no-console
    console.warn('[security] JWT secrets not set in production — refusing to use insecure defaults. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.');
  }
} else if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('[security] Using default dev JWT secrets. Set JWT_ACCESS_SECRET / JWT_REFRESH_SECRET for any shared environment.');
}

module.exports = {
  port: parseInt(get('PORT', '5000'), 10),
  nodeEnv: get('NODE_ENV', 'development'),
  mongoUri: get('MONGO_URI', 'mongodb://localhost:27017/devapi-hub'),
  jwtAccessSecret: get('JWT_ACCESS_SECRET', DEFAULT_ACCESS),
  jwtRefreshSecret: get('JWT_REFRESH_SECRET', DEFAULT_REFRESH),
  jwtAccessExpires: get('JWT_ACCESS_EXPIRES', '15m'),
  jwtRefreshExpires: get('JWT_REFRESH_EXPIRES', '7d'),
  redisUrl: get('REDIS_URL', 'redis://localhost:6379'),
  frontendUrl: get('FRONTEND_URL', 'http://localhost:5173'),
  globalRateWindowMs: parseInt(get('GLOBAL_RATE_WINDOW_MS', '60000'), 10),
  globalRateMax: parseInt(get('GLOBAL_RATE_MAX', '300'), 10),
  isProd: get('NODE_ENV', 'development') === 'production',
};
