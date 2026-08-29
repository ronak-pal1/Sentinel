import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../middleware/asyncHandler';
import * as incidentService from '../services/incident.service';
import * as eventService from '../services/event.service';
import * as metricsService from '../services/metrics.service';

export const listIncidents = asyncHandler(async (req: Request, res: Response) => {
  const profileId = req.profileId!;
  const query = req.query as {
    active?: boolean;
    phase?:
      | 'alert'
      | 'investigating'
      | 'root_cause_found'
      | 'sandbox_verifying'
      | 'pr_opened'
      | 'awaiting_approval'
      | 'resolved'
      | 'rejected'
      | 'escalated';
  };

  const filters: Parameters<typeof incidentService.listIncidents>[1] = {};
  if (query.active !== undefined) {
    filters.active = query.active;
  }
  if (query.phase !== undefined) {
    filters.phase = query.phase;
  }

  const data = await incidentService.listIncidents(profileId, filters);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const getIncident = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const data = await incidentService.getIncident(id, req.profileId!);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const breakIt = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { service: string; alertType: string };
  const data = await incidentService.breakIt(req.profileId!, body);
  res.status(StatusCodes.CREATED).json({ success: true, data });
});

export const approveIncident = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { approvedBy } = req.body as { approvedBy: string };
  const data = await incidentService.approveIncident(id, req.profileId!, approvedBy);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const rejectIncident = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { reason } = req.body as { reason?: string };
  const data = await incidentService.rejectIncident(id, req.profileId!, reason);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const retryIncident = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const data = await incidentService.retryIncident(id, req.profileId!);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const escalateIncident = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const data = await incidentService.escalateIncident(id, req.profileId!);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const closeIncident = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const data = await incidentService.closeIncident(id, req.profileId!);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const listIncidentEvents = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { since, afterId } = req.query as { since?: string; afterId?: string };
  const cursor =
    since !== undefined
      ? { timestamp: since, id: afterId ?? '' }
      : undefined;
  const data = await eventService.listEvents(id, req.profileId!, cursor);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const streamIncidentEvents = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  eventService.streamIncidentEvents(id, req.profileId!, res);
});

export const getIncidentMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const data = await metricsService.getIncidentMetrics(id, req.profileId!);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const getPostmortem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const data = await incidentService.getPostmortem(id, req.profileId!);
  res.status(StatusCodes.OK).json({ success: true, data });
});
