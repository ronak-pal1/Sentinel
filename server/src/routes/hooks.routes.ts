import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { receiveWebhook } from '../controllers/webhook.controller';
import { mutationRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { hookIdParamsSchema } from '../validators/webhook.validators';

export const hooksRouter = Router();

const hookRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many webhook requests' },
});

hooksRouter.post(
  '/:webhookId',
  hookRateLimiter,
  mutationRateLimiter,
  validate({ params: hookIdParamsSchema }),
  receiveWebhook,
);
