# Sentinel Incident CLI

Trigger Sentinel webhook incidents without Grafana — built for hackathon judges and quick demos.

## Quick start (3 steps)

1. **In Sentinel (Real mode):** Webhooks → create a webhook → copy the **URL** and **X-Sentinel-Secret** (secret shown once).
2. **Install and run:**

   ```bash
   cd incident-cli
   npm install
   npm run dev
   ```

3. **Pick a scenario** → confirm → open **Incidents** in Sentinel to watch the investigation.

## Interactive mode (default)

```bash
npm run dev
# or after build:
npm start
```

The CLI walks you through:

- Webhook URL and secret
- Payload format (Generic or Grafana-style)
- Incident scenario (latency spike, error rate, memory leak, DB pool, or custom)
- Confirmation before firing

Saved URL/secret are stored in `~/.sentinel-cli.json` (optional, mode 0600).

## One-shot mode (scripted demos)

```bash
npm run dev -- fire \
  --url http://localhost:3000/api/hooks/wh-abc123def456 \
  --secret YOUR_SECRET \
  --scenario latency \
  --format generic
```

### Scenarios

| ID | Description |
|----|-------------|
| `latency` | P99 latency spike on checkout-svc |
| `error-rate` | High error rate on checkout-svc |
| `memory-leak` | Memory leak on api-gateway |
| `db-pool` | DB connection pool exhaustion on payments-svc |
| `custom` | Use `--service`, `--alert-type`, `--message` flags |

List all scenarios:

```bash
npm run dev -- scenarios
```

### Custom alert

```bash
npm run dev -- fire \
  --url http://localhost:3000/api/hooks/wh-abc123def456 \
  --secret YOUR_SECRET \
  --scenario custom \
  --service my-service \
  --alert-type DiskFull \
  --message "disk usage at 95%"
```

## Commands

| Command | Description |
|---------|-------------|
| `sentinel-trigger` / `fire` | Trigger an incident (interactive by default) |
| `sentinel-trigger scenarios` | List preset scenarios |
| `sentinel-trigger config clear` | Clear saved webhook config |

## Payload formats

**Generic** (matches README curl example):

```json
{
  "service": "checkout-svc",
  "alertType": "HighErrorRate",
  "message": "p99 latency exceeded 2s",
  "severity": "critical"
}
```

**Grafana-style** (simulates Grafana unified alerting):

```json
{
  "alerts": [{
    "status": "firing",
    "labels": {
      "alertname": "HighErrorRate",
      "service": "checkout-svc",
      "severity": "critical"
    },
    "annotations": {
      "summary": "p99 latency exceeded 2s",
      "description": "checkout-svc p99 at 4.2s for 5m"
    }
  }]
}
```

## Troubleshooting

| Error | What to do |
|-------|------------|
| **401** | Re-copy `X-Sentinel-Secret` from Webhooks (shown once at creation) |
| **409** | Resolve or dismiss the active incident in Sentinel first |
| **410** | Webhook is disabled — re-enable or create a new one |
| **fetch failed** | Ensure Sentinel server is running (`cd server && npm run dev`) |

## Build

```bash
npm run build
npm link   # optional: use `sentinel-trigger` globally
```
