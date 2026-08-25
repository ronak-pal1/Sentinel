import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env';
import { asyncHandler } from '../middleware/asyncHandler';

const READY_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const readyState = mongoose.connection.readyState;
  const dbStatus = READY_STATES[readyState] ?? 'unknown';
  const isReady = readyState === 1;

  res.status(isReady ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE).json({
    success: isReady,
    status: isReady ? 'ok' : 'degraded',
    uptime: process.uptime(),
    env: env.NODE_ENV,
    mongodb: {
      status: dbStatus,
      readyState,
    },
  });
});
