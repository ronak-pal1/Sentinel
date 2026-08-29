import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../middleware/asyncHandler';
import * as github from '../services/github.service';

export const connectGitHub = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as { token: string };
  const data = await github.connectToken(req.profileId!, token);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const disconnectGitHub = asyncHandler(async (req: Request, res: Response) => {
  await github.disconnectToken(req.profileId!);
  res.status(StatusCodes.OK).json({ success: true, data: { ok: true } });
});

export const getGitHubStatus = asyncHandler(async (req: Request, res: Response) => {
  const data = await github.getStatus(req.profileId!);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const listRepos = asyncHandler(async (req: Request, res: Response) => {
  const data = await github.listRepos(req.profileId!);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const listPulls = asyncHandler(async (req: Request, res: Response) => {
  const data = await github.listAllPullRequests(req.profileId!);
  res.status(StatusCodes.OK).json({ success: true, data });
});
