import { Router } from 'express';
import { getLiveMetrics, getSystemHealth } from '../controllers/system.controller';

export const systemRouter = Router();

systemRouter.get('/health', getSystemHealth);

export const metricsRouter = Router();

metricsRouter.get('/live', getLiveMetrics);
