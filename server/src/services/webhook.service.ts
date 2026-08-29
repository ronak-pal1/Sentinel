import { randomBytes } from 'crypto';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env';
import { Webhook, type WebhookAttrs } from '../models/Webhook';
import { AppError } from '../utils/AppError';
import { hashToken, verifyTokenHash } from '../utils/crypto';
import { createWebhookId } from '../utils/ids';

export type PublicWebhook = {
  id: string;
  name: string;
  githubOwner: string;
  githubRepo: string;
  serviceName: string;
  enabled: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  url: string;
};

export type CreatedWebhook = PublicWebhook & {
  secret: string;
};

function toPublic(webhook: WebhookAttrs): PublicWebhook {
  return {
    id: webhook.id,
    name: webhook.name,
    githubOwner: webhook.githubOwner,
    githubRepo: webhook.githubRepo,
    serviceName: webhook.serviceName,
    enabled: webhook.enabled,
    createdAt: webhook.createdAt,
    ...(webhook.lastTriggeredAt !== undefined
      ? { lastTriggeredAt: webhook.lastTriggeredAt }
      : {}),
    url: `${env.SERVER_PUBLIC_URL}/api/hooks/${webhook.id}`,
  };
}

export async function listWebhooks(profileId: string): Promise<PublicWebhook[]> {
  const webhooks = await Webhook.find({ profileId })
    .sort({ createdAt: -1 })
    .lean<WebhookAttrs[]>();
  return webhooks.map(toPublic);
}

export async function createWebhook(
  profileId: string,
  input: {
    name: string;
    githubOwner: string;
    githubRepo: string;
    serviceName?: string;
  },
): Promise<CreatedWebhook> {
  const secret = randomBytes(24).toString('hex');
  const id = createWebhookId();
  const createdAt = new Date().toISOString();

  const doc = await Webhook.create({
    id,
    profileId,
    name: input.name,
    secretHash: hashToken(secret),
    githubOwner: input.githubOwner,
    githubRepo: input.githubRepo,
    serviceName: input.serviceName ?? input.githubRepo,
    enabled: true,
    createdAt,
  });

  return { ...toPublic(doc.toObject()), secret };
}

export async function deleteWebhook(
  profileId: string,
  webhookId: string,
): Promise<void> {
  const result = await Webhook.deleteOne({ id: webhookId, profileId });
  if (result.deletedCount === 0) {
    throw new AppError('Webhook not found', StatusCodes.NOT_FOUND);
  }
}

export async function getWebhookById(webhookId: string): Promise<WebhookAttrs> {
  const webhook = await Webhook.findOne({ id: webhookId }).lean<WebhookAttrs>();
  if (!webhook) {
    throw new AppError('Webhook not found', StatusCodes.NOT_FOUND);
  }
  return webhook;
}

export function verifyWebhookSecret(
  webhook: WebhookAttrs,
  secret: string,
): boolean {
  return verifyTokenHash(secret, webhook.secretHash);
}

export async function markWebhookTriggered(webhookId: string): Promise<void> {
  await Webhook.updateOne(
    { id: webhookId },
    { $set: { lastTriggeredAt: new Date().toISOString() } },
  );
}

export type ParsedAlertPayload = {
  service: string;
  alertType: string;
  message: string;
  severity?: string;
  labels?: Record<string, string>;
};

export function parseAlertPayload(body: unknown): ParsedAlertPayload {
  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid webhook payload', StatusCodes.BAD_REQUEST);
  }

  const obj = body as Record<string, unknown>;

  // Grafana-style
  if (obj.alerts && Array.isArray(obj.alerts) && obj.alerts[0]) {
    const alert = obj.alerts[0] as Record<string, unknown>;
    const labels = (alert.labels ?? {}) as Record<string, string>;
    return {
      service: labels.service ?? labels.job ?? 'unknown-service',
      alertType: labels.alertname ?? 'GrafanaAlert',
      message: String(
        (alert.annotations as Record<string, unknown> | undefined)?.summary ??
          (alert.annotations as Record<string, unknown> | undefined)?.description ??
          'Alert fired',
      ),
      ...(labels.severity ? { severity: labels.severity } : {}),
      labels,
    };
  }

  // Generic / PagerDuty-style
  const service =
    (obj.service as string) ??
    (obj.event as Record<string, unknown>)?.service ??
    'unknown-service';
  const alertType =
    (obj.alertType as string) ??
    (obj.event as Record<string, unknown>)?.action ??
    'WebhookAlert';
  const message =
    (obj.message as string) ??
    (obj.title as string) ??
    (obj.event as Record<string, unknown>)?.description ??
    'Alert received via webhook';

  return {
    service: String(service),
    alertType: String(alertType),
    message: String(message),
    ...(obj.severity ? { severity: String(obj.severity) } : {}),
    ...(obj.labels && typeof obj.labels === 'object'
      ? { labels: obj.labels as Record<string, string> }
      : {}),
  };
}
