export const INCIDENT_PHASES = [
  'alert',
  'investigating',
  'root_cause_found',
  'sandbox_verifying',
  'pr_opened',
  'awaiting_approval',
  'resolved',
  'rejected',
  'escalated',
] as const;

export type IncidentPhase = (typeof INCIDENT_PHASES)[number];

export const TERMINAL_PHASES: ReadonlySet<IncidentPhase> = new Set([
  'resolved',
  'rejected',
  'escalated',
]);

export const ACTIVE_PHASES: ReadonlySet<IncidentPhase> = new Set(
  INCIDENT_PHASES.filter((p) => !TERMINAL_PHASES.has(p)),
);

export const LOG_EVENT_TYPES = ['info', 'success', 'action', 'failure'] as const;
export type LogEventType = (typeof LOG_EVENT_TYPES)[number];

export const SYSTEM_HEALTH_STATUSES = [
  'healthy',
  'degraded',
  'investigating',
  'awaiting_approval',
  'resolved',
] as const;
export type SystemHealthStatus = (typeof SYSTEM_HEALTH_STATUSES)[number];
