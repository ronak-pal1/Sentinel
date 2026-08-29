import { z } from 'zod';

export const createProfileBodySchema = z
  .object({
    displayName: z.string().min(1).max(128),
  })
  .strict();
