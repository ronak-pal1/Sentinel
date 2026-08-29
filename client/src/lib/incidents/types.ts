import type {
  Incident,
  IncidentPhase,
  LogEvent,
  MetricPoint,
  SystemHealth,
} from "../types";

export type IncidentState = {
  incidents: Incident[];
  logsByIncident: Record<string, LogEvent[]>;
  metricsByIncident: Record<string, MetricPoint[]>;
  liveMetrics: MetricPoint[];
  activeIncidentId: string | null;
};

export type IncidentContextValue = {
  state: IncidentState;
  breakIt: () => string | null;
  approve: (incidentId: string) => void;
  reject: (incidentId: string) => void;
  retry: (incidentId: string) => void;
  escalate: (incidentId: string) => void;
  close: (incidentId: string) => void;
  getIncident: (id: string) => Incident | undefined;
  getLogs: (id: string) => LogEvent[];
  getMetrics: (id: string) => MetricPoint[];
  systemHealth: SystemHealth;
  isRealMode?: boolean;
};

export type { IncidentPhase };
