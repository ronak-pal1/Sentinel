import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../middleware/asyncHandler';
import * as profileService from '../services/profile.service';

export const createProfile = asyncHandler(async (req: Request, res: Response) => {
  const { displayName } = req.body as { displayName: string };
  const data = await profileService.createProfile(displayName);
  res.status(StatusCodes.CREATED).json({ success: true, data });
});

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = await profileService.getProfileById(req.profileId!);
  res.status(StatusCodes.OK).json({ success: true, data });
});
