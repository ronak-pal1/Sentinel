import { describe, expect, it } from 'vitest';
import { createApiClient } from '../helpers/apiClient.js';
import { getTestApp } from '../helpers/testApp.js';

describe('GET /api/health', () => {
  const api = () => createApiClient(getTestApp());

  it('returns 200 with connected MongoDB', async () => {
    const res = await api().getHealth().expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ok');
    expect(res.body.mongodb.status).toBe('connected');
    expect(res.body.env).toBe('test');
  });
});
