import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational error', err);
    }

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(env.NODE_ENV !== 'production' && err.stack
        ? { stack: err.stack }
        : {}),
    });
    return;
  }

  logger.error('Unhandled error', err);

  const message =
    err instanceof Error ? err.message : 'Internal server error';

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message:
      env.NODE_ENV === 'production' ? 'Internal server error' : message,
    ...(env.NODE_ENV !== 'production' && err instanceof Error && err.stack
      ? { stack: err.stack }
      : {}),
  });
}
