import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../middleware/asyncHandler';
import * as agentSessionService from '../services/agentSession.service';
import * as trueforge from '../services/trueforge.service';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export const getAgentStatus = asyncHandler(async (_req: Request, res: Response) => {
  const health = await trueforge.healthCheck();
  res.status(health.ok ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE).json({
    success: health.ok,
    data: health,
  });
});

export const createAgentSession = asyncHandler(async (req: Request, res: Response) => {
  const profileId = req.profileId!;
  const { title, incidentId } = req.body as {
    title?: string;
    incidentId?: string;
  };
  try {
    const session = await trueforge.createSession({
      ...(title ? { title } : {}),
      ...(incidentId ? { incidentId } : {}),
    });
    await agentSessionService.registerAgentSession({
      sessionId: session.id,
      profileId,
      ...(incidentId ? { incidentId } : {}),
    });
    res.status(StatusCodes.CREATED).json({ success: true, data: session });
  } catch (err) {
    logger.error('createAgentSession failed', err);
    throw new AppError(
      err instanceof Error ? err.message : 'Failed to create agent session',
      StatusCodes.BAD_GATEWAY,
    );
  }
});

export const getAgentSession = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params as { sessionId: string };
  await agentSessionService.assertAgentSessionOwnership(sessionId, req.profileId!);
  try {
    const session = await trueforge.getSession(sessionId);
    res.status(StatusCodes.OK).json({ success: true, data: session });
  } catch (err) {
    throw new AppError(
      err instanceof Error ? err.message : 'Session not found',
      StatusCodes.NOT_FOUND,
    );
  }
});

export const createAgentTurn = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params as { sessionId: string };
  await agentSessionService.assertAgentSessionOwnership(sessionId, req.profileId!);
  const body = req.body as {
    message?: string;
    input?: { type: string; [key: string]: unknown }[];
  };

  const input = body.message
    ? ([{ type: 'user.message' as const, content: body.message }] as const)
    : ([{ type: 'user.message' as const, content: 'Continue.' }] as const);

  try {
    const turn = await trueforge.createTurn(sessionId, [...input]);
    res.status(StatusCodes.ACCEPTED).json({ success: true, data: turn });
  } catch (err) {
    throw new AppError(
      err instanceof Error ? err.message : 'Failed to create turn',
      StatusCodes.BAD_GATEWAY,
    );
  }
});

export const streamAgentTurn = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, turnId } = req.params as { sessionId: string; turnId: string };
  await agentSessionService.assertAgentSessionOwnership(sessionId, req.profileId!);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let closed = false;
  const abortController = new AbortController();

  const cleanup = () => {
    if (closed) return;
    closed = true;
    abortController.abort();
  };

  req.on('close', cleanup);
  res.on('close', cleanup);

  const writeSse = (chunk: string): boolean => {
    if (closed || res.writableEnded || res.destroyed) {
      return false;
    }
    res.write(chunk);
    return true;
  };

  let stream:
    | (AsyncIterable<unknown> & { return?: () => Promise<unknown> })
    | undefined;

  try {
    stream = await trueforge.subscribeToTurn(sessionId, turnId, {
      signal: abortController.signal,
    });
    for await (const event of stream) {
      if (closed) break;
      if (!writeSse(`data: ${JSON.stringify(event)}\n\n`)) break;
    }
    if (!closed) {
      writeSse('event: done\ndata: {}\n\n');
      res.end();
    }
  } catch (err) {
    logger.error('streamAgentTurn failed', err);
    if (!closed && !res.writableEnded) {
      writeSse(
        `event: error\ndata: ${JSON.stringify({
          message: err instanceof Error ? err.message : 'stream error',
        })}\n\n`,
      );
      res.end();
    } else if (!res.headersSent) {
      throw new AppError(
        err instanceof Error ? err.message : 'Failed to stream turn',
        StatusCodes.BAD_GATEWAY,
      );
    }
  } finally {
    cleanup();
    await stream?.return?.();
  }
});

export const submitAgentApproval = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params as { sessionId: string };
  await agentSessionService.assertAgentSessionOwnership(sessionId, req.profileId!);
  const body = req.body as {
    toolCallId: string;
    threadId: string;
    status: 'allow' | 'deny';
    reason?: string;
  };

  try {
    const turn = await trueforge.submitApproval(sessionId, {
      toolCallId: body.toolCallId,
      threadId: body.threadId,
      status: body.status,
      ...(body.reason ? { reason: body.reason } : {}),
    });
    res.status(StatusCodes.OK).json({ success: true, data: turn });
  } catch (err) {
    throw new AppError(
      err instanceof Error ? err.message : 'Failed to submit approval',
      StatusCodes.BAD_GATEWAY,
    );
  }
});
