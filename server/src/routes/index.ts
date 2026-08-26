import { Router } from 'express';
import { agentRouter } from './agent.routes';
import { healthRouter } from './health.routes';
import { incidentsRouter } from './incidents.routes';
import { connectorsRouter, settingsRouter } from './settings.routes';
import { metricsRouter, systemRouter } from './system.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/system', systemRouter);
apiRouter.use('/incidents', incidentsRouter);
apiRouter.use('/metrics', metricsRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/connectors', connectorsRouter);
apiRouter.use('/agent', agentRouter);
