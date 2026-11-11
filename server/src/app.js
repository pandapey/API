const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { globalLimiter } = require('./middleware/rateLimit');
const { sanitizeMiddleware } = require('./middleware/sanitize');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { setupSwagger } = require('./config/swagger');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const versionRoutes = require('./routes/versions');
const endpointRoutes = require('./routes/endpoints');
const keyRoutes = require('./routes/keys');
const logRoutes = require('./routes/logs');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const gatewayRoutes = require('./routes/gateway');
const docsRoutes = require('./routes/docs');
const { webhookNestedRouter, webhookTopRouter } = require('./routes/webhooks');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  // Helmet blocks cross-origin <iframe> by default (X-Frame-Options SAMEORIGIN +
  // CSP frame-ancestors 'self'), which breaks Docs page embedding
  // http://localhost:5000/api-docs inside http://localhost:5173.
  // Allow frontend origins to frame us (Swagger UI + Try-It).
  app.use(
    helmet({
      frameguard: false,
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'frame-ancestors': ["'self'", env.frontendUrl, 'http://localhost:3000', 'http://localhost:5173'],
        },
      },
    })
  );
  app.use(
    cors({
      origin: [env.frontendUrl, 'http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(sanitizeMiddleware);
  app.use(globalLimiter);

  app.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));

  setupSwagger(app);

  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  // nested versions/endpoints/webhooks under projects
  app.use('/api/projects/:id/versions', versionRoutes);
  app.use('/api/projects/:id/endpoints', endpointRoutes);
  app.use('/api/projects/:id/webhooks', webhookNestedRouter);
  // keys: /api/keys + /api/projects/:id/keys
  app.use('/api/keys', keyRoutes);
  // also mount key creation under /api/projects/:id/keys via same controller (POST only)
  const keyController = require('./controllers/keyController');
  const { protect } = require('./middleware/auth');
  const { validate } = require('./middleware/validate');
  const { createKeySchema } = require('./validators/key');
  app.post('/api/projects/:id/keys', protect, validate({ body: createKeySchema }), keyController.createForProject);

  app.use('/api/logs', logRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/webhooks', webhookTopRouter);
  app.use('/api/admin', adminRoutes);
  app.use('/api/docs', docsRoutes);

  app.use('/gateway', gatewayRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
