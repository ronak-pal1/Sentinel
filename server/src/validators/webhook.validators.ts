import { z } from 'zod';

export const createWebhookBodySchema = z
  .object({
    name: z.string().min(1).max(128),
    githubOwner: z.string().min(1).max(128),
    githubRepo: z.string().min(1).max(128),
    serviceName: z.string().min(1).max(128).optional(),
  })
  .strict();

export const webhookIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const hookIdParamsSchema = z.object({
  webhookId: z.string().min(1),
});
