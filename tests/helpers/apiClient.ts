import type { Express } from 'express';
import request from 'supertest';

export type ProfileCredentials = {
  id: string;
  token: string;
};

export type CreatedProfile = ProfileCredentials & {
  displayName: string;
  mode: 'demo' | 'real' | null;
};

function authHeaders(creds: ProfileCredentials): Record<string, string> {
  return {
    'X-Profile-Id': creds.id,
    'X-Profile-Token': creds.token,
  };
}

export function createApiClient(app: Express) {
  return {
    async createProfile(displayName: string): Promise<CreatedProfile> {
      const res = await request(app)
        .post('/api/profiles')
        .send({ displayName })
        .expect(201);

      return (res.body as { data: CreatedProfile }).data;
    },

    getMyProfile(creds: ProfileCredentials) {
      return request(app)
        .get('/api/profiles/me')
        .set(authHeaders(creds));
    },

    setMode(creds: ProfileCredentials, mode: 'demo' | 'real') {
      return request(app)
        .patch('/api/profiles/mode')
        .set(authHeaders(creds))
        .send({ mode });
    },

    breakIt(
      creds: ProfileCredentials,
      body: { service?: string; alertType?: string } = {},
    ) {
      return request(app)
        .post('/api/incidents/break-it')
        .set(authHeaders(creds))
        .send({
          service: body.service ?? 'checkout-svc',
          alertType: body.alertType ?? 'p99 latency spike',
        });
    },

    getIncident(creds: ProfileCredentials, id: string) {
      return request(app)
        .get(`/api/incidents/${id}`)
        .set(authHeaders(creds));
    },

    listIncidents(
      creds: ProfileCredentials,
      query: { active?: boolean } = {},
    ) {
      const req = request(app)
        .get('/api/incidents')
        .set(authHeaders(creds));

      if (query.active !== undefined) {
        req.query({ active: String(query.active) });
      }

      return req;
    },

    approveIncident(
      creds: ProfileCredentials,
      id: string,
      approvedBy = 'test-user',
    ) {
      return request(app)
        .post(`/api/incidents/${id}/approve`)
        .set(authHeaders(creds))
        .send({ approvedBy });
    },

    rejectIncident(
      creds: ProfileCredentials,
      id: string,
      reason?: string,
    ) {
      return request(app)
        .post(`/api/incidents/${id}/reject`)
        .set(authHeaders(creds))
        .send(reason !== undefined ? { reason } : {});
    },

    escalateIncident(creds: ProfileCredentials, id: string) {
      return request(app)
        .post(`/api/incidents/${id}/escalate`)
        .set(authHeaders(creds));
    },

    closeIncident(creds: ProfileCredentials, id: string) {
      return request(app)
        .post(`/api/incidents/${id}/close`)
        .set(authHeaders(creds));
    },

    getIncidentEvents(creds: ProfileCredentials, id: string) {
      return request(app)
        .get(`/api/incidents/${id}/events`)
        .set(authHeaders(creds));
    },

    getIncidentMetrics(creds: ProfileCredentials, id: string) {
      return request(app)
        .get(`/api/incidents/${id}/metrics`)
        .set(authHeaders(creds));
    },

    getPostmortem(creds: ProfileCredentials, id: string) {
      return request(app)
        .get(`/api/incidents/${id}/postmortem`)
        .set(authHeaders(creds));
    },

    listWebhooks(creds: ProfileCredentials) {
      return request(app)
        .get('/api/webhooks')
        .set(authHeaders(creds));
    },

    createWebhook(
      creds: ProfileCredentials,
      body: {
        name: string;
        githubOwner: string;
        githubRepo: string;
        serviceName?: string;
      },
    ) {
      return request(app)
        .post('/api/webhooks')
        .set(authHeaders(creds))
        .send(body);
    },

    deleteWebhook(creds: ProfileCredentials, id: string) {
      return request(app)
        .delete(`/api/webhooks/${id}`)
        .set(authHeaders(creds));
    },

    fireWebhook(
      webhookId: string,
      secret: string,
      payload: unknown,
      options: { omitSecret?: boolean; wrongSecret?: string } = {},
    ) {
      const req = request(app)
        .post(`/api/hooks/${webhookId}`)
        .set('Content-Type', 'application/json')
        .send(payload);

      if (options.omitSecret) {
        return req;
      }

      return req.set('X-Sentinel-Secret', options.wrongSecret ?? secret);
    },

    getHealth() {
      return request(app).get('/api/health');
    },

    raw: request(app),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
