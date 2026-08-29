import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { LogEvent, type LogEventAttrs } from '../models/LogEvent';
import { Incident, type IncidentAttrs } from '../models/Incident';
import { createEventId } from '../utils/ids';
import type { IncidentPhase, LogEventType } from '../types/domain';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export type EventCursor = {
  timestamp: string;
  id: string;
};

async function assertIncidentOwnership(
  incidentId: string,
  profileId: string,
): Promise<void> {
  const incident = await Incident.findOne({ id: incidentId, profileId }).lean();
  if (!incident) {
    throw new AppError(`Incident not found: ${incidentId}`, StatusCodes.NOT_FOUND);
  }
}

function buildCursorFilter(cursor: EventCursor): Record<string, unknown> {
  return {
    $or: [
      { timestamp: { $gt: cursor.timestamp } },
      { timestamp: cursor.timestamp, id: { $gt: cursor.id } },
    ],
  };
}

export async function listEvents(
  incidentId: string,
  profileId: string,
  cursor?: EventCursor,
): Promise<LogEventAttrs[]> {
  await assertIncidentOwnership(incidentId, profileId);

  const filter: Record<string, unknown> = { incidentId };
  if (cursor) {
    Object.assign(filter, buildCursorFilter(cursor));
  }

  return LogEvent.find(filter).sort({ timestamp: 1, id: 1 }).lean<LogEventAttrs[]>();
}

export async function appendEvent(input: {
  incidentId: string;
  type: LogEventType;
  message: string;
  tool?: string;
  detail?: string;
  phase?: IncidentPhase;
  timestamp?: string;
}): Promise<LogEventAttrs> {
  const doc: LogEventAttrs = {
    id: createEventId(),
    incidentId: input.incidentId,
    timestamp: input.timestamp ?? new Date().toISOString(),
    type: input.type,
    message: input.message,
    ...(input.tool !== undefined ? { tool: input.tool } : {}),
    ...(input.detail !== undefined ? { detail: input.detail } : {}),
    ...(input.phase !== undefined ? { phase: input.phase } : {}),
  };
  const event = await LogEvent.create(doc);
  return event.toObject();
}

export function streamIncidentEvents(
  incidentId: string,
  profileId: string,
  res: Response,
): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let lastCursor: EventCursor = { timestamp: new Date(0).toISOString(), id: '' };
  let closed = false;
  let pollTimer: NodeJS.Timeout | undefined;

  const writeEvent = (event: string, data: unknown) => {
    if (closed) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  writeEvent('connected', { incidentId });

  const tick = async () => {
    if (closed) return;
    await assertIncidentOwnership(incidentId, profileId);
    const events = await listEvents(incidentId, profileId, lastCursor);
    for (const ev of events) {
      writeEvent('log', ev);
      lastCursor = { timestamp: ev.timestamp, id: ev.id };
    }
    const incident = await Incident.findOne({ id: incidentId, profileId }).lean<IncidentAttrs>();
    if (incident) {
      writeEvent('phase', { id: incident.id, phase: incident.phase });
    }
  };

  const schedulePoll = () => {
    pollTimer = setTimeout(async () => {
      if (closed) return;
      try {
        await tick();
      } catch (err) {
        logger.error('SSE poll error', err);
      } finally {
        if (!closed) {
          schedulePoll();
        }
      }
    }, 1000);
  };

  const heartbeat = setInterval(() => {
    if (!closed) {
      res.write(': heartbeat\n\n');
    }
  }, 15_000);

  void tick().finally(() => {
    if (!closed) {
      schedulePoll();
    }
  });

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (pollTimer) {
      clearTimeout(pollTimer);
    }
    clearInterval(heartbeat);
  };

  res.on('close', cleanup);
  res.on('error', cleanup);
}
