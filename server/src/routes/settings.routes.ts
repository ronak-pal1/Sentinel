import { Router } from 'express';
import {
  getSettings,
  listConnectors,
  patchSettings,
  testConnector,
} from '../controllers/settings.controller';
import { mutationRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import {
  connectorNameParamsSchema,
  patchSettingsBodySchema,
} from '../validators/settings.validators';

export const settingsRouter = Router();

settingsRouter.get('/', getSettings);
settingsRouter.patch(
  '/',
  mutationRateLimiter,
  validate({ body: patchSettingsBodySchema }),
  patchSettings,
);

export const connectorsRouter = Router();

connectorsRouter.get('/', listConnectors);
connectorsRouter.post(
  '/:name/test',
  mutationRateLimiter,
  validate({ params: connectorNameParamsSchema }),
  testConnector,
);
