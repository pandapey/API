import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  description: z.string().max(500).optional().or(z.literal('')),
  basePath: z
    .string()
    .regex(/^\/[a-z0-9/_-]*$/i, 'Base path must start with /')
    .optional()
    .or(z.literal('')),
  upstreamUrl: z.string().url('Enter a valid upstream URL').optional().or(z.literal('')),
});
