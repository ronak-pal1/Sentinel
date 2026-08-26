import { Router } from 'express';
import {
  approveIncident,
  breakIt,
  closeIncident,
  escalateIncident,
  getIncident,
  getIncidentMetrics,
  getPostmortem,
  listIncidentEvents,
  listIncidents,
  rejectIncident,
  retryIncident,
  streamIncidentEvents,
} from '../controllers/incident.controller';
import { mutationRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import {
  approveBodySchema,
  breakItBodySchema,
  eventsQuerySchema,
  incidentIdParamsSchema,
  listIncidentsQuerySchema,
  rejectBodySchema,
} from '../validators/incident.validators';

export const incidentsRouter = Router();

incidentsRouter.get(
  '/',
  validate({ query: listIncidentsQuerySchema }),
  listIncidents,
);

incidentsRouter.post(
  '/break-it',
  mutationRateLimiter,
  validate({ body: breakItBodySchema }),
  breakIt,
);

incidentsRouter.get(
  '/:id',
  validate({ params: incidentIdParamsSchema }),
  getIncident,
);

incidentsRouter.post(
  '/:id/approve',
  mutationRateLimiter,
  validate({ params: incidentIdParamsSchema, body: approveBodySchema }),
  approveIncident,
);

incidentsRouter.post(
  '/:id/reject',
  mutationRateLimiter,
  validate({ params: incidentIdParamsSchema, body: rejectBodySchema }),
  rejectIncident,
);

incidentsRouter.post(
  '/:id/retry',
  mutationRateLimiter,
  validate({ params: incidentIdParamsSchema }),
  retryIncident,
);

incidentsRouter.post(
  '/:id/escalate',
  mutationRateLimiter,
  validate({ params: incidentIdParamsSchema }),
  escalateIncident,
);

incidentsRouter.post(
  '/:id/close',
  mutationRateLimiter,
  validate({ params: incidentIdParamsSchema }),
  closeIncident,
);

incidentsRouter.get(
  '/:id/events',
  validate({ params: incidentIdParamsSchema, query: eventsQuerySchema }),
  listIncidentEvents,
);

incidentsRouter.get(
  '/:id/events/stream',
  validate({ params: incidentIdParamsSchema }),
  streamIncidentEvents,
);

incidentsRouter.get(
  '/:id/metrics',
  validate({ params: incidentIdParamsSchema }),
  getIncidentMetrics,
);

incidentsRouter.get(
  '/:id/postmortem',
  validate({ params: incidentIdParamsSchema }),
  getPostmortem,
);
