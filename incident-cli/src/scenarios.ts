export type PayloadFormat = 'generic' | 'grafana';

export type ScenarioId =
  | 'latency'
  | 'error-rate'
  | 'memory-leak'
  | 'db-pool'
  | 'custom';

export type ScenarioFields = {
  service: string;
  alertType: string;
  message: string;
  severity: string;
  description?: string;
};

export type Scenario = {
  id: ScenarioId;
  name: string;
  description: string;
  fields: ScenarioFields;
};

export type GenericPayload = {
  service: string;
  alertType: string;
  message: string;
  severity: string;
};

export type GrafanaPayload = {
  alerts: Array<{
    status: 'firing';
    labels: {
      alertname: string;
      service: string;
      job: string;
      severity: string;
    };
    annotations: {
      summary: string;
      description: string;
    };
  }>;
};

export type WebhookPayload = GenericPayload | GrafanaPayload;

const PRESETS: Scenario[] = [
  {
    id: 'latency',
    name: 'P99 Latency Spike',
    description: 'checkout-svc p99 latency exceeds threshold',
    fields: {
      service: 'checkout-svc',
      alertType: 'p99 latency spike',
      message: 'checkout-svc p99 at 4.2s (threshold 2s)',
      severity: 'critical',
      description: 'checkout-svc p99 at 4.2s for 5m — write_timeout regression suspected',
    },
  },
  {
    id: 'error-rate',
    name: 'High Error Rate',
    description: 'checkout-svc error rate above SLO',
    fields: {
      service: 'checkout-svc',
      alertType: 'HighErrorRate',
      message: 'error rate 11% over 5m (threshold 2%)',
      severity: 'critical',
      description: '5xx responses spiking on /checkout endpoint',
    },
  },
  {
    id: 'memory-leak',
    name: 'Memory Leak',
    description: 'api-gateway heap usage sustained high',
    fields: {
      service: 'api-gateway',
      alertType: 'MemoryLeak',
      message: 'heap usage 92% sustained 10m',
      severity: 'warning',
      description: 'JVM heap climbing 1.2% per minute — possible connection leak',
    },
  },
  {
    id: 'db-pool',
    name: 'DB Pool Exhaustion',
    description: 'payments-svc connection pool saturated',
    fields: {
      service: 'payments-svc',
      alertType: 'DBConnectionPoolExhausted',
      message: 'all 50 connections in use, requests timing out',
      severity: 'critical',
      description: 'HikariCP pool exhausted — checkout requests failing with 503',
    },
  },
];

export function listScenarios(): Scenario[] {
  return PRESETS;
}

export function getScenario(id: ScenarioId): Scenario | undefined {
  if (id === 'custom') return undefined;
  return PRESETS.find((s) => s.id === id);
}

export function buildGenericPayload(fields: ScenarioFields): GenericPayload {
  return {
    service: fields.service,
    alertType: fields.alertType,
    message: fields.message,
    severity: fields.severity,
  };
}

export function buildGrafanaPayload(fields: ScenarioFields): GrafanaPayload {
  const description =
    fields.description ?? `${fields.service}: ${fields.message}`;

  return {
    alerts: [
      {
        status: 'firing',
        labels: {
          alertname: fields.alertType,
          service: fields.service,
          job: fields.service,
          severity: fields.severity,
        },
        annotations: {
          summary: fields.message,
          description,
        },
      },
    ],
  };
}

export function buildPayload(
  format: PayloadFormat,
  fields: ScenarioFields,
): WebhookPayload {
  return format === 'grafana'
    ? buildGrafanaPayload(fields)
    : buildGenericPayload(fields);
}

export function scenarioIdFromSlug(value: string): ScenarioId | undefined {
  const normalized = value.toLowerCase().replace(/_/g, '-');
  const ids: ScenarioId[] = [
    'latency',
    'error-rate',
    'memory-leak',
    'db-pool',
    'custom',
  ];
  return ids.find((id) => id === normalized);
}
