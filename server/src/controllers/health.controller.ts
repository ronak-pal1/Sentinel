import mongoose from "mongoose";
import { env } from "../config/env";
import { asyncHandler } from "../middleware/asyncHandler";
import { StatusCodes } from 'http-status-codes';
import { Request, Response } from "express";

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

    res.status(StatusCodes.OK).json({
      success: true,
      status: readyState === 1 ? 'ok' : 'degraded',
      uptime: process.uptime(),
      env: env.NODE_ENV,
      mongodb: {
        status: dbStatus,
        readyState,
      },
    });
  })
