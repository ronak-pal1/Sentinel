import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as profileService from '../services/profile.service';
import { AppError } from '../utils/AppError';

export async function requireProfile(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const profileId = req.header('x-profile-id');
  const profileToken = req.header('x-profile-token');

  if (!profileId || !profileToken) {
    next(new AppError('Profile credentials required', StatusCodes.UNAUTHORIZED));
    return;
  }

  try {
    const profile = await profileService.verifyProfile(profileId, profileToken);
    req.profileId = profile.id;
    next();
  } catch (err) {
    next(err);
  }
}
