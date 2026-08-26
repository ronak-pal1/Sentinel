import { z } from 'zod';
import { INCIDENT_PHASES } from '../types/domain';

export const incidentIdParamsSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9._:-]+$/, 'Invalid incident id'),
});

export const listIncidentsQuerySchema = z.object({
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  phase: z.enum(INCIDENT_PHASES).optional(),
});

export const eventsQuerySchema = z.object({
  since: z.string().min(1).optional(),
});

export const breakItBodySchema = z
  .object({
    service: z.string().min(1).max(128).default('checkout-svc'),
    alertType: z.string().min(1).max(256).default('p99 latency spike'),
  })
  .strict();

export const approveBodySchema = z
  .object({
    approvedBy: z.string().min(1).max(128).default('you'),
  })
  .strict();

export const rejectBodySchema = z
  .object({
    reason: z.string().max(2000).optional(),
  })
  .strict();
