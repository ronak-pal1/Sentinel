import { Router } from 'express';
import {
  createAgentSession,
  createAgentTurn,
  getAgentSession,
  getAgentStatus,
  streamAgentTurn,
  submitAgentApproval,
} from '../controllers/agent.controller';
import { mutationRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import {
  approvalBodySchema,
  createSessionBodySchema,
  createTurnBodySchema,
  sessionIdParamsSchema,
  sessionTurnParamsSchema,
} from '../validators/agent.validators';

export const agentRouter = Router();

agentRouter.get('/status', getAgentStatus);

agentRouter.post(
  '/sessions',
  mutationRateLimiter,
  validate({ body: createSessionBodySchema }),
  createAgentSession,
);

agentRouter.get(
  '/sessions/:sessionId',
  validate({ params: sessionIdParamsSchema }),
  getAgentSession,
);

agentRouter.post(
  '/sessions/:sessionId/turns',
  mutationRateLimiter,
  validate({ params: sessionIdParamsSchema, body: createTurnBodySchema }),
  createAgentTurn,
);

agentRouter.get(
  '/sessions/:sessionId/turns/:turnId/stream',
  validate({ params: sessionTurnParamsSchema }),
  streamAgentTurn,
);

agentRouter.post(
  '/sessions/:sessionId/approvals',
  mutationRateLimiter,
  validate({ params: sessionIdParamsSchema, body: approvalBodySchema }),
  submitAgentApproval,
);
