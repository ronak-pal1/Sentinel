import { describe, expect, it } from 'vitest';
import { createApiClient } from '../helpers/apiClient.js';
import { getTestApp } from '../helpers/testApp.js';

describe('Profiles API', () => {
  const api = () => createApiClient(getTestApp());

  it('creates a profile with id, token, and null mode', async () => {
    const profile = await api().createProfile('Test Engineer');

    expect(profile.id).toMatch(/^prof-/);
    expect(profile.token).toHaveLength(64);
    expect(profile.displayName).toBe('Test Engineer');
    expect(profile.mode).toBeNull();
  });

  it('returns the authenticated profile via GET /me', async () => {
    const created = await api().createProfile('Auth Test');
    const res = await api()
      .getMyProfile({ id: created.id, token: created.token })
      .expect(200);
    const me = res.body.data;

    expect(me.id).toBe(created.id);
    expect(me.displayName).toBe('Auth Test');
  });

  it('sets profile mode to demo', async () => {
    const created = await api().createProfile('Demo User');
    const creds = { id: created.id, token: created.token };

    const res = await api().setMode(creds, 'demo').expect(200);
    expect(res.body.data.mode).toBe('demo');
  });

  it('returns 401 when auth headers are missing', async () => {
    const res = await api().raw.get('/api/profiles/me').expect(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/credentials/i);
  });

  it('returns 401 for invalid token', async () => {
    const created = await api().createProfile('Bad Token');

    const res = await api()
      .raw.get('/api/profiles/me')
      .set('X-Profile-Id', created.id)
      .set('X-Profile-Token', 'invalid-token')
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('returns 400 for empty displayName', async () => {
    const res = await api()
      .raw.post('/api/profiles')
      .send({ displayName: '' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
