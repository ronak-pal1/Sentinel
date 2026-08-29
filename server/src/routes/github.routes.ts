import { Router } from 'express';
import {
  connectGitHub,
  disconnectGitHub,
  getGitHubStatus,
  listPulls,
  listRepos,
} from '../controllers/github.controller';
import { requireProfile } from '../middleware/requireProfile';
import { requireRealMode } from '../middleware/requireRealMode';
import { validate } from '../middleware/validate';
import { connectGitHubBodySchema } from '../validators/github.validators';

export const githubRouter = Router();

githubRouter.use(requireProfile, requireRealMode);

githubRouter.post(
  '/connect',
  validate({ body: connectGitHubBodySchema }),
  connectGitHub,
);

githubRouter.delete('/disconnect', disconnectGitHub);
githubRouter.get('/status', getGitHubStatus);
githubRouter.get('/repos', listRepos);
githubRouter.get('/pulls', listPulls);
