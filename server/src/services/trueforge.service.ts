import type { TrueForge } from '@truefoundry/trueforge-sdk';
import { TrueForge as TrueForgeClient, TrueForgeError } from '@truefoundry/trueforge-sdk';
import { env } from '../config/env';
import {
  buildSentinelAgentManifest,
} from '../constants/sentinelAgent';
import { logger } from '../utils/logger';

type TurnInput = NonNullable<
  Parameters<TrueForge['sessions']['createTurn']>[1]['input']
>;

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
    spec: buildSentinelAgentManifest(env.TRUEFORGE_MODEL),
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
  options?: { afterSequenceNumber?: number; signal?: AbortSignal },
) {
  const tf = getTrueForgeClient();
  const params: { afterSequenceNumber?: number; signal?: AbortSignal } = {};
  if (options?.afterSequenceNumber !== undefined) {
    params.afterSequenceNumber = options.afterSequenceNumber;
  }
  if (options?.signal !== undefined) {
    params.signal = options.signal;
  }
  return tf.sessions.subscribeToTurn(sessionId, turnId, params);
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

export async function sandboxHealthCheck(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const tf = getTrueForgeClient();
    const response = await tf.server.getCapabilities();
    const enabled =
      typeof response === 'object' &&
      response &&
      'data' in response &&
      typeof (response as { data: unknown }).data === 'object' &&
      (response as { data: { sandbox?: { enabled?: boolean } } }).data.sandbox
        ?.enabled === true;
    return {
      ok: enabled,
      message: enabled
        ? 'Daytona sandbox provider configured in TrueForge'
        : 'Configure Daytona under TrueForge Settings → Sandbox providers',
    };
  } catch (err) {
    const message =
      err instanceof TrueForgeError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Could not check sandbox capability';
    return { ok: false, message };
  }
}

export function isTrueForgeError(err: unknown): err is TrueForgeError {
  return err instanceof TrueForgeError;
}
