const { z } = require('zod');

const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().default(''),
  basePath: z.string().max(200).optional().default(''),
  upstreamUrl: z.string().url('Enter a valid upstream URL').max(500).optional().or(z.literal('')).default(''),
  rateLimitPerMin: z.number().int().min(1).max(100000).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  basePath: z.string().max(200).optional(),
  upstreamUrl: z.string().url('Enter a valid upstream URL').max(500).optional().or(z.literal('')),
  rateLimitPerMin: z.number().int().min(1).max(100000).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

module.exports = { createProjectSchema, updateProjectSchema };
