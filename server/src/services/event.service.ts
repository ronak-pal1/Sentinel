import type { Response } from 'express';
import { LogEvent, type LogEventAttrs } from '../models/LogEvent';
import { Incident, type IncidentAttrs } from '../models/Incident';
import { createEventId } from '../utils/ids';
import type { IncidentPhase, LogEventType } from '../types/domain';
import { logger } from '../utils/logger';

export async function listEvents(
  incidentId: string,
  since?: string,
): Promise<LogEventAttrs[]> {
  const filter: Record<string, unknown> = { incidentId };
  if (since) {
    filter.timestamp = { $gt: since };
  }
  return LogEvent.find(filter).sort({ timestamp: 1 }).lean<LogEventAttrs[]>();
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

export function streamIncidentEvents(incidentId: string, res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let lastTimestamp = new Date(0).toISOString();
  let closed = false;

  const writeEvent = (event: string, data: unknown) => {
    if (closed) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  writeEvent('connected', { incidentId });

  const tick = async () => {
    if (closed) return;
    try {
      const events = await listEvents(incidentId, lastTimestamp);
      for (const ev of events) {
        writeEvent('log', ev);
        lastTimestamp = ev.timestamp;
      }
      const incident = await Incident.findOne({ id: incidentId }).lean<IncidentAttrs>();
      if (incident) {
        writeEvent('phase', { id: incident.id, phase: incident.phase });
      }
    } catch (err) {
      logger.error('SSE poll error', err);
    }
  };

  const interval = setInterval(() => {
    void tick();
  }, 1000);

  const heartbeat = setInterval(() => {
    if (!closed) {
      res.write(': heartbeat\n\n');
    }
  }, 15_000);

  void tick();

  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearInterval(interval);
    clearInterval(heartbeat);
  };

  res.on('close', cleanup);
  res.on('error', cleanup);
}
