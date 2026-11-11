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
    '/api/auth/me': { get: { summary: 'Me', responses: { 200: { description: 'OK' } } } },
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
      get: { summary: 'Gateway (any method)', parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Mock response' } } },
    },
    '/api/logs': { get: { summary: 'List request logs', responses: { 200: { description: 'OK' } } } },
    '/api/analytics/overview': { get: { summary: 'Analytics overview', responses: { 200: { description: 'OK' } } } },
    '/api/admin/overview': { get: { summary: 'Admin overview', responses: { 200: { description: 'OK' } } } },
  },
};

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));
  app.get('/api-docs.json', (req, res) => res.json(spec));
}

module.exports = { setupSwagger, spec };
