const { z } = require('zod');

const createKeySchema = z.object({
  name: z.string().min(2).max(100),
  rateLimitPerMin: z.number().int().min(1).max(100000).optional(),
  expiresAt: z.string().optional().nullable(),
  scopes: z.array(z.string()).optional(),
});

module.exports = { createKeySchema };
