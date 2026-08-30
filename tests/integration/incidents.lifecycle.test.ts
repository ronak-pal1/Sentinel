import { describe, expect, it } from 'vitest';
import { createApiClient } from '../helpers/apiClient.js';
import { seedIncidentForProfile } from '../helpers/seed.js';
import { getTestApp } from '../helpers/testApp.js';

describe('Incident approval lifecycle', () => {
  const api = () => createApiClient(getTestApp());

  it('approves a seeded awaiting_approval incident', async () => {
    const profile = await api().createProfile('Approval Test');
    const creds = { id: profile.id, token: profile.token };
    await api().setMode(creds, 'demo').expect(200);

    const { id } = await seedIncidentForProfile(creds, 'awaiting_approval');

    const res = await api()
      .approveIncident(creds, id, 'qa-reviewer')
      .expect(200);

    expect(res.body.data.phase).toBe('resolved');
    expect(res.body.data.approvedBy).toBe('qa-reviewer');
    expect(res.body.data.resolvedAt).toBeDefined();
  });

  it('returns postmortem with timeline after approval', async () => {
    const profile = await api().createProfile('Postmortem Test');
    const creds = { id: profile.id, token: profile.token };
    await api().setMode(creds, 'demo').expect(200);

    const { id } = await seedIncidentForProfile(creds, 'awaiting_approval');
    await api().approveIncident(creds, id, 'qa-reviewer').expect(200);

    const res = await api().getPostmortem(creds, id).expect(200);

    expect(res.body.data.markdown).toContain('# Postmortem:');
    expect(res.body.data.markdown).toContain('## Timeline');
    expect(res.body.data.incident.phase).toBe('resolved');
    expect(res.body.data.ttrMs).toBeGreaterThanOrEqual(0);
  });
});
