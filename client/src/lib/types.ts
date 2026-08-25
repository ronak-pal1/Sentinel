export type IncidentPhase =
  | "alert"
  | "investigating"
  | "root_cause_found"
  | "sandbox_verifying"
  | "pr_opened"
  | "awaiting_approval"
  | "resolved"
  | "rejected"
  | "escalated";

export type Incident = {
  id: string;
  service: string;
  alertType: string;
  phase: IncidentPhase;
  startedAt: string;
  resolvedAt?: string;
  rootCause?: string;
  confidence?: number;
  sandboxResult?: {
    latencyMs: number;
    errorRate: number;
    requestsReplayed: number;
  };
  prUrl?: string;
  prNumber?: number;
  diff?: string;
  qodoComments?: { line: number; file: string; comment: string }[];
  approvedBy?: string;
  approvedAt?: string;
  resolvedBy?: "auto" | "human";
  proposedAction?: string;
};

export type LogEvent = {
  id: string;
  incidentId: string;
  timestamp: string;
  type: "info" | "success" | "action" | "failure";
  tool?: string;
  message: string;
  detail?: string;
  phase?: IncidentPhase;
};

export type MetricPoint = {
  t: number;
  latencyMs: number;
  errorRate: number;
};

export type SystemHealth = {
  service: string;
  status: "healthy" | "degraded" | "investigating" | "awaiting_approval" | "resolved";
  latencyMs: number;
  errorRate: number;
};

export const PHASE_ORDER: IncidentPhase[] = [
  "alert",
  "investigating",
  "root_cause_found",
  "sandbox_verifying",
  "pr_opened",
  "awaiting_approval",
  "resolved",
];

export const PHASE_LABELS: Record<IncidentPhase, string> = {
  alert: "Alert",
  investigating: "Investigate",
  root_cause_found: "Root Cause",
  sandbox_verifying: "Sandbox Verify",
  pr_opened: "PR Opened",
  awaiting_approval: "Approve",
  resolved: "Resolved",
  rejected: "Rejected",
  escalated: "Escalated",
};
