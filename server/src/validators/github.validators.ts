import { z } from 'zod';

export const connectGitHubBodySchema = z
  .object({
    token: z.string().min(1),
  })
  .strict();
