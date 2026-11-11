const { z } = require('zod');

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1).optional().default(['api.request']),
  secret: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  headers: z.record(z.string()).optional(),
});

const updateWebhookSchema = createWebhookSchema.partial();

module.exports = { createWebhookSchema, updateWebhookSchema };
