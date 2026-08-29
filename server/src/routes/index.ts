import { Router } from 'express';
import { requireProfile } from '../middleware/requireProfile';
import { agentRouter } from './agent.routes';
import { healthRouter } from './health.routes';
import { incidentsRouter } from './incidents.routes';
import { profilesRouter } from './profiles.routes';
import { connectorsRouter, settingsRouter } from './settings.routes';
import { metricsRouter, systemRouter } from './system.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/system', systemRouter);
apiRouter.use('/profiles', profilesRouter);
apiRouter.use('/incidents', requireProfile, incidentsRouter);
apiRouter.use('/metrics', requireProfile, metricsRouter);
apiRouter.use('/settings', requireProfile, settingsRouter);
apiRouter.use('/connectors', requireProfile, connectorsRouter);
apiRouter.use('/agent', requireProfile, agentRouter);
