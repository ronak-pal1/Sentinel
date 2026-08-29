import { z } from 'zod';

export const createProfileBodySchema = z
  .object({
    displayName: z.string().min(1).max(128),
  })
  .strict();

export const setProfileModeBodySchema = z
  .object({
    mode: z.enum(['demo', 'real']),
  })
  .strict();
