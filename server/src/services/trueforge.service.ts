import type { TrueForge } from '@truefoundry/trueforge-sdk';
import { TrueForge as TrueForgeClient, TrueForgeError } from '@truefoundry/trueforge-sdk';
import { env } from '../config/env';
import { logger } from '../utils/logger';

type TurnInput = NonNullable<
  Parameters<TrueForge['sessions']['createTurn']>[1]['input']
>;

const SENTINEL_INSTRUCTIONS = `You are Sentinel, an SRE incident-response agent.
Investigate production alerts using available tools (metrics, logs, deploys, sandbox, GitHub).
Be concise. Prefer read-only investigation first.
When you propose a fix (PR / merge / redeploy), pause for human approval before mutating production.
Always state root cause hypothesis and confidence when diagnosis is ready.`;

let client: TrueForgeClient | undefined;

export function getTrueForgeClient(): TrueForgeClient {
  if (!client) {
    const options: ConstructorParameters<typeof TrueForgeClient>[0] = {
      baseUrl: env.TRUEFORGE_BASE_URL,
      timeoutInSeconds: 600,
    };
    if (env.TRUEFORGE_TOKEN) {
      options.token = env.TRUEFORGE_TOKEN;
    }
    client = new TrueForgeClient(options);
  }
  return client;
}

function buildAgentPayload() {
  if (env.TRUEFORGE_AGENT_NAME) {
    return { name: env.TRUEFORGE_AGENT_NAME };
  }
  return {
    spec: {
      model: { name: env.TRUEFORGE_MODEL },
      instructions: SENTINEL_INSTRUCTIONS,
    },
  };
}

export async function createSession(options?: {
  title?: string;
  incidentId?: string;
}): Promise<{ id: string; title: string | null; createdAt: string }> {
  const tf = getTrueForgeClient();
  const response = await tf.sessions.create({
    agent: buildAgentPayload(),
  });
  const session = response.data;
  logger.info('TrueForge session created', {
    sessionId: session.id,
    incidentId: options?.incidentId,
  });
  return {
    id: session.id,
    title: options?.title ?? session.title,
    createdAt: session.createdAt,
  };
}

export async function getSession(sessionId: string) {
  const tf = getTrueForgeClient();
  const response = await tf.sessions.get(sessionId);
  return response.data;
}

export async function createTurn(sessionId: string, input: TurnInput) {
  const tf = getTrueForgeClient();
  const response = await tf.sessions.createTurn(sessionId, {
    input,
    previousTurnId: 'auto',
  });
  return response.data;
}

export async function runTurnStream(sessionId: string, input: TurnInput) {
  const tf = getTrueForgeClient();
  return tf.sessions.createTurnStream(sessionId, {
    input,
    previousTurnId: 'auto',
  });
}

export async function subscribeToTurn(
  sessionId: string,
  turnId: string,
  afterSequenceNumber?: number,
) {
  const tf = getTrueForgeClient();
  if (afterSequenceNumber !== undefined) {
    return tf.sessions.subscribeToTurn(sessionId, turnId, {
      afterSequenceNumber,
    });
  }
  return tf.sessions.subscribeToTurn(sessionId, turnId, {});
}

export async function submitApproval(
  sessionId: string,
  approval: {
    toolCallId: string;
    threadId: string;
    status: 'allow' | 'deny';
    reason?: string;
  },
) {
  const decision =
    approval.status === 'allow'
      ? ({ status: 'allow' } as const)
      : approval.reason
        ? ({ status: 'deny', reason: approval.reason } as const)
        : ({ status: 'deny' } as const);

  return createTurn(sessionId, [
    {
      type: 'user.tool_approval',
      toolCallId: approval.toolCallId,
      threadId: approval.threadId,
      approval: decision,
    },
  ]);
}

export async function healthCheck(): Promise<{
  ok: boolean;
  baseUrl: string;
  message: string;
}> {
  const baseUrl = env.TRUEFORGE_BASE_URL;
  try {
    const tf = getTrueForgeClient();
    await tf.server.getCapabilities();
    return { ok: true, baseUrl, message: 'TrueForge reachable' };
  } catch (err) {
    const message =
      err instanceof TrueForgeError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'TrueForge unreachable';
    logger.warn('TrueForge health check failed', message);
    return { ok: false, baseUrl, message };
  }
}

export function isTrueForgeError(err: unknown): err is TrueForgeError {
  return err instanceof TrueForgeError;
}
