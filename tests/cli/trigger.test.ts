import { describe, expect, it, vi } from 'vitest';
import { buildGenericPayload, getScenario } from '../../incident-cli/src/scenarios.js';
import {
  parseWebhookUrl,
  triggerWebhook,
  validateWebhookUrl,
} from '../../incident-cli/src/trigger.js';
import { createApiClient } from '../helpers/apiClient.js';
import { getBaseUrl, getTestApp } from '../helpers/testApp.js';

describe('incident-cli trigger', () => {
  it('rejects invalid URLs', () => {
    expect(validateWebhookUrl('not-a-url')).toMatch(/invalid url/i);
  });

  it('rejects URLs missing webhook path', () => {
    expect(validateWebhookUrl('http://localhost:3000/api/other')).toMatch(
      /\/api\/hooks\/wh-/i,
    );
  });

  it('accepts valid webhook URLs', () => {
    expect(
      validateWebhookUrl('http://localhost:3000/api/hooks/wh-abc123'),
    ).toBeNull();
  });

  it('parses webhook id from URL', () => {
    expect(
      parseWebhookUrl('http://localhost:3000/api/hooks/wh-deadbeef'),
    ).toEqual({ webhookId: 'wh-deadbeef' });
  });

  it('returns null for unparseable URLs', () => {
    expect(parseWebhookUrl('http://localhost:3000/nope')).toBeNull();
  });

  it('triggers webhook successfully against live test server', async () => {
    const api = createApiClient(getTestApp());
    const profile = await api.createProfile('CLI Trigger');
    const creds = { id: profile.id, token: profile.token };
    await api.setMode(creds, 'real').expect(200);

    const webhook = (
      await api
        .createWebhook(creds, {
          name: 'CLI Hook',
          githubOwner: 'acme',
          githubRepo: 'checkout-svc',
        })
        .expect(201)
    ).body.data;

    const scenario = getScenario('latency');
    expect(scenario).toBeDefined();
    const payload = buildGenericPayload(scenario!.fields);

    const url = `${getBaseUrl()}/api/hooks/${webhook.id}`;
    const result = await triggerWebhook(url, webhook.secret, payload);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe(202);
      expect(result.incidentId).toMatch(/^inc-/);
      expect(result.phase).toBe('alert');
      expect(result.service).toBe('checkout-svc');
    }
  });

  it('returns error for wrong secret with hint', async () => {
    const api = createApiClient(getTestApp());
    const profile = await api.createProfile('CLI Wrong Secret');
    const creds = { id: profile.id, token: profile.token };
    await api.setMode(creds, 'real').expect(200);

    const webhook = (
      await api
        .createWebhook(creds, {
          name: 'CLI Auth Hook',
          githubOwner: 'acme',
          githubRepo: 'checkout-svc',
        })
        .expect(201)
    ).body.data;

    const url = `${getBaseUrl()}/api/hooks/${webhook.id}`;
    const payload = buildGenericPayload(getScenario('latency')!.fields);

    const result = await triggerWebhook(url, 'wrong-secret', payload);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.message).toMatch(/invalid/i);
    }
  });

  it('provides hint on 401 unauthorized', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ success: false, message: 'Invalid webhook secret' }),
      }),
    );

    const result = await triggerWebhook(
      'http://localhost:3000/api/hooks/wh-abc123',
      'secret',
      { service: 'x', alertType: 'y', message: 'z', severity: 'critical' },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.hint).toMatch(/secret/i);
    }

    vi.unstubAllGlobals();
  });
});
