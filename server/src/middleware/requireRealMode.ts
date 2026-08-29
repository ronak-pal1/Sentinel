import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/AppError';
import * as profileService from '../services/profile.service';

export async function requireRealMode(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const mode = await profileService.getProfileMode(req.profileId!);
    if (mode !== 'real') {
      next(
        new AppError(
          'This feature requires real mode',
          StatusCodes.FORBIDDEN,
        ),
      );
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
