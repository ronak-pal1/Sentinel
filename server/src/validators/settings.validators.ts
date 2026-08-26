import { z } from 'zod';

export const patchSettingsBodySchema = z
  .object({
    modelApiKey: z.string().min(1).max(512).optional(),
    clearModelApiKey: z.boolean().optional(),
    sandboxLimits: z
      .object({
        maxReplay: z.number().int().positive().max(100_000).optional(),
        timeoutSec: z.number().int().positive().max(3600).optional(),
        isolation: z.string().min(1).max(128).optional(),
        network: z.string().min(1).max(128).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.modelApiKey !== undefined ||
      v.clearModelApiKey === true ||
      v.sandboxLimits !== undefined,
    { message: 'At least one field is required' },
  );

export const connectorNameParamsSchema = z.object({
  name: z.string().min(1).max(128),
});
