import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/AppError';

export function notFound(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(
    new AppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      StatusCodes.NOT_FOUND,
    ),
  );
}
