const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.0',
  info: {
    title: 'DevAPI Hub API',
    version: '1.0.0',
    description: 'Mock API platform: projects, versions, endpoints, keys, gateway, analytics, webhooks, admin',
  },
  servers: [{ url: 'http://localhost:5000' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      apiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/api/auth/register': { post: { summary: 'Register', requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 201: { description: 'Created' } } } },
    '/api/auth/login': { post: { summary: 'Login', responses: { 200: { description: 'OK' } } } },
    '/api/auth/refresh': { post: { summary: 'Refresh token', responses: { 200: { description: 'OK' } } } },
    '/api/auth/logout': { post: { summary: 'Logout', responses: { 200: { description: 'OK' } } } },
    '/api/auth/me': {
      get: { summary: 'Me', responses: { 200: { description: 'OK' } } },
      patch: { summary: 'Update my profile (name)', requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'OK' } } },
    },
    '/api/auth/forgot-password': { post: { summary: 'Request password reset (mock email)', requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'OK' } } } },
    '/api/auth/reset-password': { post: { summary: 'Reset password with token', requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'OK' } } } },
    '/api/auth/verify-email': { post: { summary: 'Verify email with token', requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'OK' } } } },
    '/api/projects': {
      get: { summary: 'List projects', responses: { 200: { description: 'OK' } } },
      post: { summary: 'Create project', responses: { 201: { description: 'Created' } } },
    },
    '/api/projects/{id}': {
      get: { summary: 'Get project', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      put: { summary: 'Update project', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      delete: { summary: 'Delete project', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/api/projects/{id}/versions': {
      get: { summary: 'List versions', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      post: { summary: 'Create version', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/api/projects/{id}/endpoints': {
      get: { summary: 'List endpoints', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      post: { summary: 'Create endpoint', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/api/projects/{id}/keys': {
      post: { summary: 'Create API key (raw shown once)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/api/keys': { get: { summary: 'List my keys', responses: { 200: { description: 'OK' } } } },
    '/api/keys/{id}/revoke': { post: { summary: 'Revoke key', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/api/keys/{id}/rotate': { post: { summary: 'Rotate key', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Created' } } } },
    '/api/projects/{id}/webhooks': {
      get: { summary: 'List webhooks', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      post: { summary: 'Create webhook', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', example: { url: 'https://your.app/hooks/devapi', events: ['api.request', 'api.error'] } } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/api/webhooks/{id}/test': { post: { summary: 'Send webhook test event', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/api/webhooks/{id}/deliveries': { get: { summary: 'Webhook deliveries', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/gateway/{projectId}/{path}': {
      get: {
        summary: 'Gateway (any method)',
        description: 'Resolves projectId by ObjectId OR project slug. Mocks the matching endpoint definition or proxies to the project upstream URL.',
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'version', in: 'query', schema: { type: 'string', default: 'v1' } },
        ],
        responses: { 200: { description: 'Mock response' }, 401: { description: 'API key required' }, 403: { description: 'Insufficient scope' }, 429: { description: 'Rate limited' } },
      },
    },
    '/api/logs': {
      get: {
        summary: 'List request logs',
        parameters: [
          { name: 'projectId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', description: '2xx | 4xx | 5xx | exact code' } },
          { name: 'method', in: 'query', schema: { type: 'string' } },
          { name: 'endpoint', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/logs/export': { get: { summary: 'Export request logs as CSV (max 2000 rows)', responses: { 200: { description: 'CSV file' } } } },
    '/api/analytics/overview': { get: { summary: 'Analytics overview', responses: { 200: { description: 'OK' } } } },
    '/api/analytics/endpoints': { get: { summary: 'Per-endpoint usage', responses: { 200: { description: 'OK' } } } },
    '/api/analytics/status': { get: { summary: 'Status distribution', responses: { 200: { description: 'OK' } } } },
    '/api/analytics/timeseries': { get: { summary: 'Requests per day', responses: { 200: { description: 'OK' } } } },
    '/api/analytics/latency': { get: { summary: 'Latency (avg + p95 + per-day)', responses: { 200: { description: 'OK' } } } },
    '/api/admin/overview': { get: { summary: 'Admin overview', responses: { 200: { description: 'OK' } } } },
    '/api/admin/users': { get: { summary: 'Admin: list users', responses: { 200: { description: 'OK' } } } },
    '/api/admin/users/{id}/suspend': { put: { summary: 'Admin: suspend/unsuspend user', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', example: { suspended: true } } } } }, responses: { 200: { description: 'OK' } } } },
    '/api/admin/users/{id}/role': { put: { summary: 'Admin: change user role', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', example: { role: 'developer' } } } } }, responses: { 200: { description: 'OK' } } } },
    '/api/admin/users/{id}': { delete: { summary: 'Admin: delete user (cascades owned resources)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/api/admin/projects': { get: { summary: 'Admin: list all projects', responses: { 200: { description: 'OK' } } } },
    '/api/admin/keys': { get: { summary: 'Admin: list all keys', responses: { 200: { description: 'OK' } } } },
    '/api/admin/requests': { get: { summary: 'Admin: recent requests', responses: { 200: { description: 'OK' } } } },
    '/api/admin/errors': { get: { summary: 'Admin: recent errors', responses: { 200: { description: 'OK' } } } },
    '/api/admin/health': { get: { summary: 'Admin: system health (DB/Redis/uptime)', responses: { 200: { description: 'OK' } } } },
    '/api/admin/audit': { get: { summary: 'Admin: audit trail', responses: { 200: { description: 'OK' } } } },
    '/api/admin/settings': {
      get: { summary: 'Admin: get system settings', responses: { 200: { description: 'OK' } } },
      put: { summary: 'Admin: update system settings', requestBody: { content: { 'application/json': { schema: { type: 'object', example: { globalRateMax: 300, logRetentionDays: 90, maintenanceMode: false, allowRegistration: true } } } } }, responses: { 200: { description: 'OK' } } },
    },
  },
};

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));
  app.get('/api-docs.json', (req, res) => res.json(spec));
}

module.exports = { setupSwagger, spec };
