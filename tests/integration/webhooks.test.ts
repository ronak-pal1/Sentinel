import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../helpers/apiClient.js';
import { getTestApp } from '../helpers/testApp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const genericAlert = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/generic-alert.json'), 'utf8'),
);
const grafanaAlert = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/grafana-alert.json'), 'utf8'),
);

async function realProfile() {
  const api = createApiClient(getTestApp());
  const profile = await api.createProfile('Webhook Test');
  const creds = { id: profile.id, token: profile.token };
  await api.setMode(creds, 'real').expect(200);
  return { api, creds };
}

describe('Webhooks API', () => {
  it('returns 403 for webhooks in demo mode', async () => {
    const api = createApiClient(getTestApp());
    const profile = await api.createProfile('Demo Webhook');
    const creds = { id: profile.id, token: profile.token };
    await api.setMode(creds, 'demo').expect(200);

    const res = await api.listWebhooks(creds).expect(403);
    expect(res.body.message).toMatch(/real mode/i);
  });

  it('creates a webhook in real mode', async () => {
    const { api, creds } = await realProfile();

    const res = await api
      .createWebhook(creds, {
        name: 'Grafana Prod',
        githubOwner: 'acme',
        githubRepo: 'checkout-svc',
        serviceName: 'checkout-svc',
      })
      .expect(201);

    const webhook = res.body.data;
    expect(webhook.id).toMatch(/^wh-/);
    expect(webhook.secret).toHaveLength(48);
    expect(webhook.url).toContain(`/api/hooks/${webhook.id}`);
    expect(webhook.githubOwner).toBe('acme');
  });

  it('lists created webhooks', async () => {
    const { api, creds } = await realProfile();

    const created = (
      await api
        .createWebhook(creds, {
          name: 'List Test',
          githubOwner: 'acme',
          githubRepo: 'api-gateway',
        })
        .expect(201)
    ).body.data;

    const res = await api.listWebhooks(creds).expect(200);
    const ids = (res.body.data as { id: string }[]).map((w) => w.id);

    expect(ids).toContain(created.id);
  });

  it('ingests a generic alert and creates an incident', async () => {
    const { api, creds } = await realProfile();

    const webhook = (
      await api
        .createWebhook(creds, {
          name: 'Generic Hook',
          githubOwner: 'acme',
          githubRepo: 'checkout-svc',
        })
        .expect(201)
    ).body.data;

    const res = await api
      .fireWebhook(webhook.id, webhook.secret, genericAlert)
      .expect(202);

    expect(res.body.success).toBe(true);
    expect(res.body.data.incidentId).toMatch(/^inc-/);
    expect(res.body.data.phase).toBe('alert');
  });

  it('ingests a Grafana alert payload', async () => {
    const { api, creds } = await realProfile();

    const webhook = (
      await api
        .createWebhook(creds, {
          name: 'Grafana Hook',
          githubOwner: 'acme',
          githubRepo: 'checkout-svc',
        })
        .expect(201)
    ).body.data;

    const res = await api
      .fireWebhook(webhook.id, webhook.secret, grafanaAlert)
      .expect(202);

    expect(res.body.data.incidentId).toBeDefined();

    const incident = await api
      .getIncident(creds, res.body.data.incidentId)
      .expect(200);

    expect(incident.body.data.service).toBe('checkout-svc');
    expect(incident.body.data.alertType).toBe('HighErrorRate');
  });

  it('returns 401 when X-Sentinel-Secret is missing', async () => {
    const { api, creds } = await realProfile();

    const webhook = (
      await api
        .createWebhook(creds, {
          name: 'Auth Hook',
          githubOwner: 'acme',
          githubRepo: 'checkout-svc',
        })
        .expect(201)
    ).body.data;

    const res = await api
      .fireWebhook(webhook.id, webhook.secret, genericAlert, {
        omitSecret: true,
      })
      .expect(401);

    expect(res.body.message).toMatch(/secret/i);
  });

  it('returns 401 for wrong secret', async () => {
    const { api, creds } = await realProfile();

    const webhook = (
      await api
        .createWebhook(creds, {
          name: 'Wrong Secret Hook',
          githubOwner: 'acme',
          githubRepo: 'checkout-svc',
        })
        .expect(201)
    ).body.data;

    const res = await api
      .fireWebhook(webhook.id, webhook.secret, genericAlert, {
        wrongSecret: 'deadbeef',
      })
      .expect(401);

    expect(res.body.message).toMatch(/invalid/i);
  });

  it('returns 409 when firing webhook while active incident exists', async () => {
    const { api, creds } = await realProfile();

    const webhook = (
      await api
        .createWebhook(creds, {
          name: 'Conflict Hook',
          githubOwner: 'acme',
          githubRepo: 'checkout-svc',
        })
        .expect(201)
    ).body.data;

    await api
      .fireWebhook(webhook.id, webhook.secret, genericAlert)
      .expect(202);

    const res = await api
      .fireWebhook(webhook.id, webhook.secret, genericAlert)
      .expect(409);

    expect(res.body.message).toMatch(/active incident/i);
  });

  it('deletes a webhook', async () => {
    const { api, creds } = await realProfile();

    const webhook = (
      await api
        .createWebhook(creds, {
          name: 'Delete Me',
          githubOwner: 'acme',
          githubRepo: 'checkout-svc',
        })
        .expect(201)
    ).body.data;

    await api.deleteWebhook(creds, webhook.id).expect(200);

    const list = await api.listWebhooks(creds).expect(200);
    const ids = (list.body.data as { id: string }[]).map((w) => w.id);
    expect(ids).not.toContain(webhook.id);
  });
});
