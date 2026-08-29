import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../middleware/asyncHandler';
import * as incidentOrchestrator from '../services/incidentOrchestrator.service';
import * as webhookService from '../services/webhook.service';

export const listWebhooks = asyncHandler(async (req: Request, res: Response) => {
  const data = await webhookService.listWebhooks(req.profileId!);
  res.status(StatusCodes.OK).json({ success: true, data });
});

export const createWebhook = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as {
    name: string;
    githubOwner: string;
    githubRepo: string;
    serviceName?: string;
  };
  const data = await webhookService.createWebhook(req.profileId!, body);
  res.status(StatusCodes.CREATED).json({ success: true, data });
});

export const deleteWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await webhookService.deleteWebhook(req.profileId!, id);
  res.status(StatusCodes.OK).json({ success: true, data: { ok: true } });
});

export const receiveWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { webhookId } = req.params as { webhookId: string };
  const secret = req.header('x-sentinel-secret');
  if (!secret) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: 'X-Sentinel-Secret header required',
    });
    return;
  }

  const webhook = await webhookService.getWebhookById(webhookId);
  if (!webhook.enabled) {
    res.status(StatusCodes.GONE).json({
      success: false,
      message: 'Webhook is disabled',
    });
    return;
  }

  if (!webhookService.verifyWebhookSecret(webhook, secret)) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid webhook secret',
    });
    return;
  }

  const alert = webhookService.parseAlertPayload(req.body);
  await webhookService.markWebhookTriggered(webhookId);

  const incident = await incidentOrchestrator.startWebhookIncident(
    webhook.profileId,
    webhook,
    alert,
  );

  res.status(StatusCodes.ACCEPTED).json({
    success: true,
    data: { incidentId: incident.id, phase: incident.phase },
  });
});
