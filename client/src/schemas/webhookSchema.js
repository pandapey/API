import { z } from 'zod';

export const webhookSchema = z.object({
  url: z.string().url('Enter a valid webhook URL'),
  events: z.array(z.string()).min(1, 'Select at least one event').optional(),
  secret: z.string().min(8, 'Secret must be at least 8 characters').optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});
