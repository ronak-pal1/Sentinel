import { describe, expect, it } from 'vitest';
import { createApiClient } from '../helpers/apiClient.js';
import { getTestApp } from '../helpers/testApp.js';

async function demoProfile() {
  const api = createApiClient(getTestApp());
  const profile = await api.createProfile('Demo Incidents');
  const creds = { id: profile.id, token: profile.token };
  await api.setMode(creds, 'demo').expect(200);
  return { api, creds };
}

describe('Demo incidents API', () => {
  it('creates an incident via break-it in alert phase', async () => {
    const { api, creds } = await demoProfile();

    const res = await api.breakIt(creds).expect(201);
    const incident = res.body.data;

    expect(incident.id).toMatch(/^inc-/);
    expect(incident.phase).toBe('alert');
    expect(incident.service).toBe('checkout-svc');
    expect(incident.alertType).toBe('p99 latency spike');
  });

  it('returns the incident by id', async () => {
    const { api, creds } = await demoProfile();
    const created = (await api.breakIt(creds).expect(201)).body.data;

    const res = await api.getIncident(creds, created.id).expect(200);
    expect(res.body.data.id).toBe(created.id);
    expect(res.body.data.phase).toBe('alert');
  });

  it('lists active incidents', async () => {
    const { api, creds } = await demoProfile();
    const created = (await api.breakIt(creds).expect(201)).body.data;

    const res = await api.listIncidents(creds, { active: true }).expect(200);
    const ids = (res.body.data as { id: string }[]).map((i) => i.id);

    expect(ids).toContain(created.id);
  });

  it('returns 409 when breaking it twice while active', async () => {
    const { api, creds } = await demoProfile();
    await api.breakIt(creds).expect(201);

    const res = await api.breakIt(creds).expect(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/active incident/i);
  });

  it('rejects an incident from alert phase', async () => {
    const { api, creds } = await demoProfile();
    const created = (await api.breakIt(creds).expect(201)).body.data;

    const res = await api
      .rejectIncident(creds, created.id, 'Not acceptable')
      .expect(200);

    expect(res.body.data.phase).toBe('rejected');
  });

  it('escalates an incident', async () => {
    const { api, creds } = await demoProfile();
    const created = (await api.breakIt(creds).expect(201)).body.data;

    const res = await api.escalateIncident(creds, created.id).expect(200);
    expect(res.body.data.phase).toBe('escalated');
  });

  it('closes an incident without merge', async () => {
    const { api, creds } = await demoProfile();
    const created = (await api.breakIt(creds).expect(201)).body.data;

    const res = await api.closeIncident(creds, created.id).expect(200);
    expect(res.body.data.phase).toBe('rejected');
  });

  it('returns incident events after break-it', async () => {
    const { api, creds } = await demoProfile();
    const created = (await api.breakIt(creds).expect(201)).body.data;

    const res = await api.getIncidentEvents(creds, created.id).expect(200);
    const events = res.body.data as { message: string }[];

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.some((e) => e.message.toLowerCase().includes('alert'))).toBe(
      true,
    );
  });

  it('returns metric points after break-it', async () => {
    const { api, creds } = await demoProfile();
    const created = (await api.breakIt(creds).expect(201)).body.data;

    const res = await api.getIncidentMetrics(creds, created.id).expect(200);
    const points = res.body.data as unknown[];

    expect(points.length).toBeGreaterThan(0);
  });

  it('returns 409 when approving from alert phase', async () => {
    const { api, creds } = await demoProfile();
    const created = (await api.breakIt(creds).expect(201)).body.data;

    const res = await api.approveIncident(creds, created.id).expect(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not awaiting approval/i);
  });
});
