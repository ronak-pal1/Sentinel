import type { Incident, IncidentPhase, LogEvent, MetricPoint } from "./types";
import { LIVE_DIFF, LIVE_QODO, MOCK_PR_URL } from "./seed";

export type SimAction =
  | { type: "APPEND_LOG"; log: LogEvent }
  | { type: "SET_PHASE"; incidentId: string; phase: IncidentPhase; patch?: Partial<Incident> }
  | { type: "APPEND_METRIC"; incidentId: string; point: MetricPoint }
  | { type: "SET_METRICS"; incidentId: string; points: MetricPoint[] };

type Emit = (action: SimAction) => void;

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function log(
  incidentId: string,
  type: LogEvent["type"],
  message: string,
  extra?: Partial<LogEvent>,
): LogEvent {
  return {
    id: uid("log"),
    incidentId,
    timestamp: new Date().toISOString(),
    type,
    message,
    ...extra,
  };
}

function metricPoint(
  latencyMs: number,
  errorRate: number,
): MetricPoint {
  return { t: Date.now(), latencyMs, errorRate };
}

/** Scripted demo lifecycle. Returns a cancel function. */
export function runIncidentSimulation(
  incidentId: string,
  emit: Emit,
): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const schedule = (ms: number, fn: () => void) => {
    timers.push(setTimeout(fn, ms));
  };

  // Continuous metric stream during active incident
  const metricInterval = setInterval(() => {
    // Default degraded until phases override via SET_METRICS bursts;
    // individual APPEND_METRIC keeps the sparkline alive.
  }, 2000);
  timers.push(metricInterval as unknown as ReturnType<typeof setTimeout>);

  // t=0 alert already set by breakIt; start streaming failure metrics
  schedule(200, () => {
    emit({
      type: "APPEND_LOG",
      log: log(
        incidentId,
        "success",
        "checkout-svc alert received — p99 latency 4.2s",
        { phase: "alert", tool: "grafana" },
      ),
    });
    for (let i = 0; i < 6; i++) {
      schedule(300 + i * 400, () => {
        emit({
          type: "APPEND_METRIC",
          incidentId,
          point: metricPoint(3800 + Math.random() * 900, 9 + Math.random() * 5),
        });
      });
    }
  });

  schedule(2200, () => {
    emit({
      type: "SET_PHASE",
      incidentId,
      phase: "investigating",
    });
    emit({
      type: "APPEND_LOG",
      log: log(
        incidentId,
        "action",
        "run investigate --readonly checkout-svc",
        { phase: "investigating", tool: "grafana" },
      ),
    });
  });

  schedule(3500, () => {
    emit({
      type: "APPEND_LOG",
      log: log(
        incidentId,
        "info",
        "querying grafana, tracing last 4 deploys",
        {
          phase: "investigating",
          tool: "grafana",
          detail:
            "deploys:\n  8f1c  14m ago  write_timeout: 50ms\n  7a2e  2h ago   write_timeout: 200ms\n  3c91  1d ago   write_timeout: 200ms",
        },
      ),
    });
  });

  schedule(4800, () => {
    emit({
      type: "APPEND_LOG",
      log: log(
        incidentId,
        "info",
        "↳ deploy 8f1c raised timeout 200ms → 50ms",
        { phase: "investigating" },
      ),
    });
  });

  // One intentional MCP failure that recovers (error state)
  schedule(5600, () => {
    emit({
      type: "APPEND_LOG",
      log: log(
        incidentId,
        "failure",
        "github: rate-limit probe failed — retrying",
        {
          phase: "investigating",
          tool: "github",
          detail: "HTTP 429 from api.github.com — backoff 1.2s",
        },
      ),
    });
  });

  schedule(6500, () => {
    emit({
      type: "APPEND_LOG",
      log: log(incidentId, "info", "github: connection restored", {
        phase: "investigating",
        tool: "github",
      }),
    });
  });

  schedule(7200, () => {
    emit({
      type: "SET_PHASE",
      incidentId,
      phase: "root_cause_found",
      patch: {
        rootCause:
          "Config regression: write_timeout 200ms → 50ms in deploy 8f1c",
        confidence: 0.96,
        proposedAction:
          "Merge PR #42 and redeploy checkout-svc with the corrected timeout value",
      },
    });
    emit({
      type: "APPEND_LOG",
      log: log(
        incidentId,
        "success",
        "root cause found — config regression in 8f1c (96% confidence)",
        { phase: "root_cause_found" },
      ),
    });
  });

  schedule(9000, () => {
    emit({
      type: "SET_PHASE",
      incidentId,
      phase: "sandbox_verifying",
    });
    emit({
      type: "APPEND_LOG",
      log: log(
        incidentId,
        "action",
        "sandbox: replay traffic against patched config",
        { phase: "sandbox_verifying", tool: "sandbox" },
      ),
    });
  });

  schedule(11_000, () => {
    emit({
      type: "SET_PHASE",
      incidentId,
      phase: "sandbox_verifying",
      patch: {
        sandboxResult: {
          latencyMs: 380,
          errorRate: 0,
          requestsReplayed: 500,
        },
      },
    });
    emit({
      type: "APPEND_LOG",
      log: log(
        incidentId,
        "success",
        "sandbox confirms fix — latency 380ms, 0 errors in 500 requests",
        {
          phase: "sandbox_verifying",
          tool: "sandbox",
          detail:
            "p50=210ms p95=340ms p99=380ms\nerrors=0/500\nisolation=ephemeral clone",
        },
      ),
    });
    // Sandbox recovery preview on sparkline
    for (let i = 0; i < 4; i++) {
      schedule(200 + i * 350, () => {
        emit({
          type: "APPEND_METRIC",
          incidentId,
          point: metricPoint(360 + Math.random() * 50, Math.random() * 0.2),
        });
      });
    }
  });

  schedule(13_500, () => {
    emit({
      type: "SET_PHASE",
      incidentId,
      phase: "pr_opened",
      patch: {
        prUrl: MOCK_PR_URL,
        prNumber: 42,
        diff: LIVE_DIFF,
        qodoComments: LIVE_QODO,
      },
    });
    emit({
      type: "APPEND_LOG",
      log: log(incidentId, "action", "github: open PR #42", {
        phase: "pr_opened",
        tool: "github",
        detail: MOCK_PR_URL,
      }),
    });
  });

  schedule(15_000, () => {
    emit({
      type: "APPEND_LOG",
      log: log(
        incidentId,
        "info",
        "qodo: review comments received on config.yaml:15",
        { phase: "pr_opened", tool: "github" },
      ),
    });
  });

  schedule(16_200, () => {
    emit({
      type: "SET_PHASE",
      incidentId,
      phase: "awaiting_approval",
    });
    emit({
      type: "APPEND_LOG",
      log: log(
        incidentId,
        "action",
        "waiting on human approval — action is irreversible once merged",
        { phase: "awaiting_approval" },
      ),
    });
    // Keep failure metrics visible while waiting (live system still broken)
    for (let i = 0; i < 8; i++) {
      schedule(500 + i * 1500, () => {
        emit({
          type: "APPEND_METRIC",
          incidentId,
          point: metricPoint(3600 + Math.random() * 800, 8 + Math.random() * 4),
        });
      });
    }
  });

  return () => {
    timers.forEach(clearTimeout);
    clearInterval(metricInterval);
  };
}

export function createBreakItIncident(): {
  incident: Incident;
  initialLogs: LogEvent[];
  initialMetrics: MetricPoint[];
} {
  const id = `inc-checkout-${Math.floor(2400 + Math.random() * 500)}`;
  const now = Date.now();
  const healthy = Array.from({ length: 24 }, (_, i) => ({
    t: now - (24 - i) * 12_000,
    latencyMs: 360 + Math.round((Math.random() - 0.5) * 40),
    errorRate: Math.random() * 0.2,
  }));

  const incident: Incident = {
    id,
    service: "checkout-svc",
    alertType: "p99 latency spike",
    phase: "alert",
    startedAt: new Date().toISOString(),
    proposedAction:
      "Merge PR #42 and redeploy checkout-svc with the corrected timeout value",
  };

  return {
    incident,
    initialLogs: [
      log(id, "info", "synthetic failure injected into checkout-svc", {
        phase: "alert",
        tool: "sandbox",
      }),
    ],
    initialMetrics: [
      ...healthy,
      metricPoint(4100, 11),
    ],
  };
}
