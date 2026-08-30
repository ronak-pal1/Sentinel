import { describe, expect, it } from 'vitest';
import {
  buildGenericPayload,
  buildGrafanaPayload,
  buildPayload,
  getScenario,
  listScenarios,
  scenarioIdFromSlug,
} from '../../incident-cli/src/scenarios.js';

const sampleFields = {
  service: 'checkout-svc',
  alertType: 'p99 latency spike',
  message: 'checkout-svc p99 at 4.2s (threshold 2s)',
  severity: 'critical',
  description: 'Regression suspected',
};

describe('incident-cli scenarios', () => {
  it('lists four preset scenarios', () => {
    expect(listScenarios()).toHaveLength(4);
  });

  it('builds a generic payload from fields', () => {
    const payload = buildGenericPayload(sampleFields);

    expect(payload).toEqual({
      service: sampleFields.service,
      alertType: sampleFields.alertType,
      message: sampleFields.message,
      severity: sampleFields.severity,
    });
  });

  it('builds a Grafana payload from fields', () => {
    const payload = buildGrafanaPayload(sampleFields);

    expect(payload.alerts).toHaveLength(1);
    expect(payload.alerts[0]?.labels.service).toBe(sampleFields.service);
    expect(payload.alerts[0]?.labels.alertname).toBe(sampleFields.alertType);
    expect(payload.alerts[0]?.annotations.summary).toBe(sampleFields.message);
    expect(payload.alerts[0]?.annotations.description).toBe(
      sampleFields.description,
    );
  });

  it('buildPayload returns generic or grafana format', () => {
    const generic = buildPayload('generic', sampleFields);
    const grafana = buildPayload('grafana', sampleFields);

    expect(generic).toHaveProperty('service');
    expect(grafana).toHaveProperty('alerts');
  });

  it('normalizes scenario slug with underscores', () => {
    expect(scenarioIdFromSlug('error_rate')).toBe('error-rate');
    expect(scenarioIdFromSlug('LATENCY')).toBe('latency');
  });

  it('returns preset scenario by id', () => {
    const scenario = getScenario('latency');
    expect(scenario?.name).toBe('P99 Latency Spike');
    expect(scenario?.fields.service).toBe('checkout-svc');
  });
});
