import { z } from 'zod';

export const endpointSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string().regex(/^\//, 'Path must start with /'),
  description: z.string().max(500).optional().or(z.literal('')),
  version: z.string().min(1, 'Version is required').max(40).optional().or(z.literal('')),
  authRequired: z.boolean().optional(),
});
