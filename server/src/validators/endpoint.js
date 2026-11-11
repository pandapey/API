const { z } = require('zod');

const createEndpointSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  path: z.string().min(1).max(500),
  version: z.string().min(1).max(20).optional().default('v1'),
  versionId: z.string().optional().nullable(),
  description: z.string().max(2000).optional().default(''),
  authRequired: z.boolean().optional().default(true),
  rateLimitPerMin: z.number().int().min(1).max(100000).optional().nullable(),
  exampleResponse: z.any().optional(),
  latencyMs: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
});

const updateEndpointSchema = createEndpointSchema.partial();

module.exports = { createEndpointSchema, updateEndpointSchema };
