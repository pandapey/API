import { z } from 'zod';

const emptyToUndefined = (v) => (v === '' || v === null ? undefined : v);

export const keySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  projectId: z.string().min(1, 'Project is required'),
  expiresInDays: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(365).optional()),
  rateLimit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(1000000).optional()),
  scopes: z.string().max(1000).optional().or(z.literal('')),
});
