import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../middleware/asyncHandler';
import * as metricsService from '../services/metrics.service';

export const getSystemHealth = asyncHandler(async (_req: Request, res: Response) => {
  const data = await metricsService.getSystemHealth();
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const getLiveMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const data = await metricsService.getLiveMetrics();
  res.status(StatusCodes.OK).json({ success: true, data });
});
