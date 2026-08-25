import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

function getClientErrorStatus(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) {
    return undefined;
  }

  const candidate = err as { status?: unknown; statusCode?: unknown };
  const status =
    typeof candidate.status === 'number'
      ? candidate.status
      : typeof candidate.statusCode === 'number'
        ? candidate.statusCode
        : undefined;

  if (status !== undefined && status >= 400 && status < 500) {
    return status;
  }

  return undefined;
}

function safeClientMessage(status: number): string {
  if (status === StatusCodes.REQUEST_TOO_LONG) {
    return 'Payload too large';
  }
  return 'Bad request';
}

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

  const clientStatus = getClientErrorStatus(err);
  if (clientStatus !== undefined) {
    const message =
      env.NODE_ENV === 'production'
        ? safeClientMessage(clientStatus)
        : err instanceof Error
          ? err.message
          : safeClientMessage(clientStatus);

    res.status(clientStatus).json({
      success: false,
      message,
      ...(env.NODE_ENV !== 'production' && err instanceof Error && err.stack
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
