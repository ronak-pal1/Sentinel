import { z } from 'zod';

export const sessionIdParamsSchema = z.object({
  sessionId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9._:-]+$/, 'Invalid session id'),
});

export const sessionTurnParamsSchema = sessionIdParamsSchema.extend({
  turnId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9._:-]+$/, 'Invalid turn id'),
});

export const createSessionBodySchema = z
  .object({
    title: z.string().min(1).max(256).optional(),
    incidentId: z.string().min(1).max(128).optional(),
  })
  .strict();

export const createTurnBodySchema = z
  .object({
    message: z.string().min(1).max(20_000).optional(),
    input: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .strict();

export const approvalBodySchema = z
  .object({
    toolCallId: z.string().min(1).max(256),
    threadId: z.string().min(1).max(256).default('main'),
    status: z.enum(['allow', 'deny']).default('allow'),
    reason: z.string().max(2000).optional(),
  })
  .strict();
