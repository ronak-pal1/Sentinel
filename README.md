# Sentinel

SRE incident-response platform with **Demo** and **Real** modes.

## Modes

| Mode | Description |
|------|-------------|
| **Demo** | No API keys. Uses local simulator (`Break It` button) for a full scripted incident flow. |
| **Real** | Connect GitHub PAT, create webhooks, run TrueForge agent with Daytona sandbox (via TrueForge). PRs open only after human approval. |

After creating a profile, choose your mode on the mode selection screen.

## Quick start

```bash
# Terminal 1 — MongoDB required
cd server && cp .env.example .env && npm install && npm run dev

# Terminal 2
cd client && npm install && npm run dev
```

Optional for real mode:

- **TrueForge**: `npx @truefoundry/trueforge` (default `http://localhost:8790`)
- **Bootstrap TrueForge** (model, GitHub MCP, Daytona sandbox, `sentinel` agent):

  ```bash
  # Add DAYTONA_API_KEY, ANTHROPIC_API_KEY, GITHUB_TOKEN to server/.env first
  cd server && npm run setup:trueforge
  ```

- **Webhooks**: set `SERVER_PUBLIC_URL` in `server/.env` (default `http://localhost:3000`)

## Real mode flow

1. TrueForge: `npm run setup:trueforge` (or configure manually in TrueForge UI)
2. Sentinel Settings → connect GitHub PAT (for PR creation; separate from TrueForge GitHub MCP token)
3. Webhooks → create webhook + select repo → copy URL and `X-Sentinel-Secret`
4. POST alert payload to webhook URL
5. TrueForge agent investigates, uses **Daytona sandbox-as-tool** to verify fixes, pauses for approval
6. Human approves → Sentinel opens GitHub PR

### Example webhook trigger

```bash
curl -X POST http://localhost:3000/api/hooks/wh_XXXXX \
  -H "Content-Type: application/json" \
  -H "X-Sentinel-Secret: YOUR_SECRET" \
  -d '{"service":"checkout-svc","alertType":"HighErrorRate","message":"p99 latency exceeded 2s"}'
```
