import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../middleware/asyncHandler';
import * as settingsService from '../services/settings.service';

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const data = await settingsService.getSettings(req.profileId!);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const patchSettings = asyncHandler(async (req: Request, res: Response) => {
  const data = await settingsService.updateSettings(
    req.profileId!,
    req.body as Parameters<typeof settingsService.updateSettings>[1],
  );
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const listConnectors = asyncHandler(async (req: Request, res: Response) => {
  const data = await settingsService.listConnectors(req.profileId!);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const testConnector = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params as { name: string };
  const data = await settingsService.testConnector(
    req.profileId!,
    decodeURIComponent(name),
  );
  res.status(StatusCodes.OK).json({ success: true, data });
});
