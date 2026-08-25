import type { Incident, LogEvent, MetricPoint } from "./types";

const MOCK_DIFF = `--- a/checkout-svc/config.yaml
+++ b/checkout-svc/config.yaml
@@ -12,7 +12,7 @@ server:
   port: 8080
   read_timeout: 5s
-  write_timeout: 50ms
+  write_timeout: 200ms
   idle_timeout: 60s
 upstream:
   payment_gateway:`;

export const MOCK_PR_URL =
  "https://github.com/wemakedevs/sentinel-demo/pull/42";

export function generateHealthyMetrics(
  count = 40,
  baseLatency = 380,
): MetricPoint[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    t: now - (count - i) * 15_000,
    latencyMs: baseLatency + Math.round((Math.random() - 0.5) * 40),
    errorRate: Math.random() * 0.2,
  }));
}

export function generateResolvedMetrics(): MetricPoint[] {
  const now = Date.now() - 3_600_000;
  const points: MetricPoint[] = [];
  for (let i = 0; i < 50; i++) {
    const t = now + i * 12_000;
    let latencyMs = 360 + Math.round((Math.random() - 0.5) * 30);
    let errorRate = Math.random() * 0.15;
    if (i >= 12 && i < 28) {
      latencyMs = 3200 + Math.round(Math.random() * 1200);
      errorRate = 8 + Math.random() * 6;
    } else if (i >= 28 && i < 32) {
      latencyMs = 900 + Math.round(Math.random() * 400);
      errorRate = 2 + Math.random() * 2;
    }
    points.push({ t, latencyMs, errorRate });
  }
  return points;
}

const past1Id = "inc-checkout-2418";
const past2Id = "inc-payments-2387";

export const seedIncidents: Incident[] = [
  {
    id: past1Id,
    service: "checkout-svc",
    alertType: "p99 latency spike",
    phase: "resolved",
    startedAt: new Date(Date.now() - 86_400_000).toISOString(),
    resolvedAt: new Date(Date.now() - 86_200_000).toISOString(),
    rootCause: "Config regression: write_timeout 200ms → 50ms in deploy 7a2e",
    confidence: 0.94,
    sandboxResult: {
      latencyMs: 372,
      errorRate: 0,
      requestsReplayed: 500,
    },
    prUrl: "https://github.com/wemakedevs/sentinel-demo/pull/38",
    prNumber: 38,
    diff: MOCK_DIFF,
    qodoComments: [
      {
        line: 15,
        file: "checkout-svc/config.yaml",
        comment: "Restoring 200ms matches prior stable baseline. LGTM.",
      },
    ],
    approvedBy: "you",
    approvedAt: new Date(Date.now() - 86_220_000).toISOString(),
    resolvedBy: "human",
    proposedAction:
      "Merge PR #38 and redeploy checkout-svc with corrected write_timeout",
  },
  {
    id: past2Id,
    service: "payments-api",
    alertType: "elevated error rate",
    phase: "resolved",
    startedAt: new Date(Date.now() - 172_800_000).toISOString(),
    resolvedAt: new Date(Date.now() - 172_600_000).toISOString(),
    rootCause: "Stale Redis connection pool after deploy 3c91",
    confidence: 0.91,
    sandboxResult: {
      latencyMs: 210,
      errorRate: 0.1,
      requestsReplayed: 400,
    },
    prUrl: "https://github.com/wemakedevs/sentinel-demo/pull/35",
    prNumber: 35,
    diff: `--- a/payments-api/pool.go
+++ b/payments-api/pool.go
@@ -40,7 +40,7 @@ func NewPool(cfg Config) *Pool {
-  MaxIdle: cfg.MaxIdle,
+  MaxIdle: cfg.MaxIdle,
+  IdleTimeout: 30 * time.Second,`,
    approvedBy: "you",
    approvedAt: new Date(Date.now() - 172_620_000).toISOString(),
    resolvedBy: "human",
    proposedAction: "Merge PR #35 and restart payments-api pool",
  },
];

export const seedLogs: Record<string, LogEvent[]> = {
  [past1Id]: [
    {
      id: "log-p1-1",
      incidentId: past1Id,
      timestamp: new Date(Date.now() - 86_400_000).toISOString(),
      type: "success",
      message: "checkout-svc alert received — p99 latency 4.1s",
      phase: "alert",
    },
    {
      id: "log-p1-2",
      incidentId: past1Id,
      timestamp: new Date(Date.now() - 86_360_000).toISOString(),
      type: "action",
      tool: "grafana",
      message: "run investigate --readonly checkout-svc",
      phase: "investigating",
    },
    {
      id: "log-p1-3",
      incidentId: past1Id,
      timestamp: new Date(Date.now() - 86_320_000).toISOString(),
      type: "success",
      message: "root cause found — config regression in deploy 7a2e",
      phase: "root_cause_found",
    },
    {
      id: "log-p1-4",
      incidentId: past1Id,
      timestamp: new Date(Date.now() - 86_280_000).toISOString(),
      type: "success",
      tool: "sandbox",
      message: "sandbox confirms fix — latency back to 372ms",
      phase: "sandbox_verifying",
    },
    {
      id: "log-p1-5",
      incidentId: past1Id,
      timestamp: new Date(Date.now() - 86_240_000).toISOString(),
      type: "action",
      tool: "github",
      message: "github: open PR #38",
      phase: "pr_opened",
    },
    {
      id: "log-p1-6",
      incidentId: past1Id,
      timestamp: new Date(Date.now() - 86_220_000).toISOString(),
      type: "success",
      message: "Approved by you — merged and deployed",
      phase: "resolved",
    },
  ],
  [past2Id]: [
    {
      id: "log-p2-1",
      incidentId: past2Id,
      timestamp: new Date(Date.now() - 172_800_000).toISOString(),
      type: "success",
      message: "payments-api alert — error rate 12%",
      phase: "alert",
    },
    {
      id: "log-p2-2",
      incidentId: past2Id,
      timestamp: new Date(Date.now() - 172_700_000).toISOString(),
      type: "success",
      message: "Approved by you — merged and deployed",
      phase: "resolved",
    },
  ],
};

export const seedMetrics: Record<string, MetricPoint[]> = {
  [past1Id]: generateResolvedMetrics(),
  [past2Id]: generateResolvedMetrics(),
};

export const LIVE_DIFF = MOCK_DIFF;

export const LIVE_QODO = [
  {
    line: 15,
    file: "checkout-svc/config.yaml",
    comment:
      "Restoring write_timeout to 200ms matches the pre-regression baseline. Sandbox replay looks clean.",
  },
];
