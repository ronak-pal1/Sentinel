import { Router } from 'express';
import {
  createProfile,
  getMyProfile,
  setProfileMode,
} from '../controllers/profile.controller';
import { requireProfile } from '../middleware/requireProfile';
import { validate } from '../middleware/validate';
import {
  createProfileBodySchema,
  setProfileModeBodySchema,
} from '../validators/profile.validators';

export const profilesRouter = Router();

profilesRouter.post(
  '/',
  validate({ body: createProfileBodySchema }),
  createProfile,
);

profilesRouter.get('/me', requireProfile, getMyProfile);

profilesRouter.patch(
  '/mode',
  requireProfile,
  validate({ body: setProfileModeBodySchema }),
  setProfileMode,
);
