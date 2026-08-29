import { StatusCodes } from 'http-status-codes';
import { MetricPoint, type MetricPointAttrs } from '../models/MetricPoint';
import { Incident, type IncidentAttrs } from '../models/Incident';
import { ACTIVE_PHASES, type SystemHealthStatus } from '../types/domain';
import { AppError } from '../utils/AppError';

async function assertIncidentOwnership(
  incidentId: string,
  profileId: string,
): Promise<void> {
  const incident = await Incident.findOne({ id: incidentId, profileId }).lean();
  if (!incident) {
    throw new AppError(`Incident not found: ${incidentId}`, StatusCodes.NOT_FOUND);
  }
}

export async function getIncidentMetrics(incidentId: string, profileId: string) {
  await assertIncidentOwnership(incidentId, profileId);
  const points = await MetricPoint.find({ incidentId })
    .sort({ t: 1 })
    .lean<MetricPointAttrs[]>();
  return points.map((p) => ({
    t: p.t,
    latencyMs: p.latencyMs,
    errorRate: p.errorRate,
  }));
}

export async function getLiveMetrics(limit = 60) {
  const points = await MetricPoint.find({ incidentId: null })
    .sort({ t: -1 })
    .limit(limit)
    .lean<MetricPointAttrs[]>();
  return points
    .reverse()
    .map((p) => ({
      t: p.t,
      latencyMs: p.latencyMs,
      errorRate: p.errorRate,
    }));
}

export async function appendMetricPoint(input: {
  incidentId?: string | null;
  latencyMs: number;
  errorRate: number;
  t?: number;
}) {
  return MetricPoint.create({
    incidentId: input.incidentId ?? null,
    t: input.t ?? Date.now(),
    latencyMs: input.latencyMs,
    errorRate: input.errorRate,
  });
}

export async function getSystemHealth(): Promise<{
  service: string;
  status: SystemHealthStatus;
  latencyMs: number;
  errorRate: number;
}> {
  const active = await Incident.findOne({
    phase: { $in: [...ACTIVE_PHASES] },
  })
    .sort({ startedAt: -1 })
    .lean<IncidentAttrs>();

  const latest = await MetricPoint.findOne(
    active ? { incidentId: active.id } : { incidentId: null },
  )
    .sort({ t: -1 })
    .lean<MetricPointAttrs>();

  let status: SystemHealthStatus = 'healthy';
  if (active) {
    if (active.phase === 'awaiting_approval') {
      status = 'awaiting_approval';
    } else if (
      active.phase === 'investigating' ||
      active.phase === 'root_cause_found' ||
      active.phase === 'sandbox_verifying' ||
      active.phase === 'pr_opened' ||
      active.phase === 'alert'
    ) {
      status = 'investigating';
    } else {
      status = 'degraded';
    }
  }

  return {
    service: active?.service ?? 'checkout-svc',
    status,
    latencyMs: latest?.latencyMs ?? 42,
    errorRate: latest?.errorRate ?? 0.001,
  };
}
