import { Router } from 'express';
import {
  createWebhook,
  deleteWebhook,
  listWebhooks,
} from '../controllers/webhook.controller';
import { mutationRateLimiter } from '../middleware/rateLimit';
import { requireProfile } from '../middleware/requireProfile';
import { requireRealMode } from '../middleware/requireRealMode';
import { validate } from '../middleware/validate';
import {
  createWebhookBodySchema,
  webhookIdParamsSchema,
} from '../validators/webhook.validators';

export const webhooksRouter = Router();

webhooksRouter.use(requireProfile, requireRealMode);

webhooksRouter.get('/', listWebhooks);

webhooksRouter.post(
  '/',
  mutationRateLimiter,
  validate({ body: createWebhookBodySchema }),
  createWebhook,
);

webhooksRouter.delete(
  '/:id',
  mutationRateLimiter,
  validate({ params: webhookIdParamsSchema }),
  deleteWebhook,
);
