# Contributing to Sentinel

Thank you for your interest in contributing to Sentinel! This guide covers everything you need to get the project running locally, understand the codebase, and submit changes.

---

## Table of contents

- [Code of conduct](#code-of-conduct)
- [Getting started](#getting-started)
- [Development workflow](#development-workflow)
- [Project architecture](#project-architecture)
- [Code conventions](#code-conventions)
- [Making changes](#making-changes)
- [Pull requests](#pull-requests)
- [Deployment](#deployment)

---

## Code of conduct

Be respectful, constructive, and collaborative. Sentinel is a hackathon project — help others learn and ship.

---

## Getting started

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ (24 recommended) | Required for server and client |
| MongoDB | 6+ | Local or Atlas |
| Git | Latest | |

For **Real mode** development you will also need:

- [TrueForge](https://github.com/truefoundry/trueforge) running locally
- OpenRouter API key
- Daytona API key (sandbox verification)
- GitHub Personal Access Token

### Clone and install

```bash
git clone https://github.com/ronak-pal1/Sentinel.git
cd Sentinel
```

Install dependencies in each package you plan to work on:

```bash
# Server (required)
cd server && cp .env.example .env && npm install

# Client (required for UI work)
cd ../client && npm install

# Incident CLI (optional)
cd ../incident-cli && npm install
```

### Environment setup

**Server** — copy and edit `server/.env`:

```bash
cd server
cp .env.example .env
```

Minimum for local development:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/sentinel
CLIENT_ORIGIN=http://localhost:5173
SERVER_PUBLIC_URL=http://localhost:3000
SETTINGS_ENCRYPTION_KEY=<run: openssl rand -hex 32>
```

**Client** — optional; Vite proxies API in dev by default:

```bash
cd client
cp .env.example .env   # if present
```

### Run locally

Open three terminals (or use a process manager):

```bash
# Terminal 1 — MongoDB (if not already running)
mongod

# Terminal 2 — API server
cd server && npm run dev

# Terminal 3 — Frontend
cd client && npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`

### Real mode bootstrap (optional)

```bash
# Start TrueForge in a separate terminal
npx @truefoundry/trueforge

# Configure server/.env with DAYTONA_API_KEY, OPENROUTER_API_KEY, etc.
cd server && npm run setup:trueforge
```

---

## Development workflow

### Recommended branch naming

```
feat/short-description
fix/short-description
docs/short-description
chore/short-description
```

### Before you commit

Run type checks in the packages you touched:

```bash
# Server
cd server && npm run typecheck

# Client
cd client && npm run lint && npm run build

# Incident CLI
cd incident-cli && npm run typecheck && npm run build

# Integration tests (from repo root)
npm test
# or: cd tests && npm ci && npm test
```

### Testing your changes

| Area | How to verify |
|------|---------------|
| **Automated tests** | `npm test` from repo root (in-memory MongoDB; no TrueForge/GitHub required) |
| **Demo mode** | Create profile → Demo → click **Break It** → walk through incident phases |
| **Webhooks** | Real mode → create webhook → `curl` or `incident-cli` → check Incidents page |
| **Agent flow** | Real mode + TrueForge running → fire webhook → watch event log and phase transitions |
| **Settings** | Connect GitHub PAT → list repos on Webhooks page |
| **Incident CLI** | `cd incident-cli && npm run dev` → interactive flow |

---

## Project architecture

```
┌─────────────────────────────────────────────────────────────┐
│  client/          React SPA — dashboard, flows, settings    │
├─────────────────────────────────────────────────────────────┤
│  server/          Express API — orchestration, persistence  │
│    routes/        HTTP endpoints                            │
│    services/      Business logic (orchestrator, webhooks)   │
│    models/        Mongoose schemas                          │
│    middleware/    Auth, validation, rate limits             │
├─────────────────────────────────────────────────────────────┤
│  incident-cli/    Standalone webhook trigger for demos      │
└─────────────────────────────────────────────────────────────┘
```

### Key services (server)

| Service | File | Responsibility |
|---------|------|----------------|
| **Incident orchestrator** | `services/incidentOrchestrator.service.ts` | Creates incidents, drives agent sessions, handles approval |
| **Webhook service** | `services/webhook.service.ts` | Parses Grafana/generic payloads, verifies secrets |
| **TrueForge service** | `services/trueforge.service.ts` | Agent session management and streaming |
| **GitHub service** | `services/github.service.ts` | Repo listing, PR creation |
| **Event service** | `services/event.service.ts` | Append-only incident event log |

### Key client modules

| Module | Path | Responsibility |
|--------|------|----------------|
| **API client** | `lib/api.ts` | Typed REST calls to server |
| **Incident providers** | `lib/incidents/` | Demo vs Real incident state |
| **Simulator** | `lib/simulator.ts` | Scripted demo lifecycle |
| **Flow graphs** | `components/flow/` | React Flow investigation visualizations |

### Authentication model

- **Profiles** — local identity stored in browser; `X-Profile-Id` + `X-Profile-Token` headers
- **Real mode** — requires profile mode `"real"` for webhooks and GitHub
- **Webhooks** — public ingestion via `X-Sentinel-Secret` (no profile headers)

### Incident phases

Defined in `server/src/types/domain.ts`:

```
alert → investigating → root_cause_found → sandbox_verifying
  → pr_opened → awaiting_approval → resolved | rejected | escalated
```

Only one **active** incident (non-terminal phase) is allowed per profile at a time.

---

## Code conventions

### TypeScript

- Strict mode enabled in all packages
- Prefer explicit types at module boundaries (API payloads, service returns)
- Use Zod validators for request bodies in server routes

### Server

- Routes are thin — delegate to controllers → services
- Use `asyncHandler` wrapper for async route handlers
- Throw `AppError` with HTTP status codes for expected failures
- New endpoints: add route → controller → service → validator (if needed)

### Client

- Functional React components with hooks
- Tailwind CSS for styling; match existing design tokens in `index.css`
- API calls go through `lib/api.ts` — do not fetch directly from components
- Demo and Real modes share UI but use separate incident providers

### Naming

| Item | Convention | Example |
|------|------------|---------|
| Incident IDs | `inc-{service-slug}-{hex}` | `inc-checkout-svc-a1b2c3` |
| Webhook IDs | `wh-{hex}` | `wh-a1b2c3d4e5f6` |
| Profile IDs | `prof-{hex}` | `prof-a1b2c3d4e5f6` |
| Files | camelCase for TS, PascalCase for React components | `incident.service.ts`, `IncidentDetail.tsx` |

### Comments

Write self-documenting code. Add comments only for non-obvious business logic (e.g., why only one active incident, Grafana payload parsing quirks).

---

## Making changes

### Adding a new API endpoint

1. Define Zod schema in `server/src/validators/`
2. Add service function in `server/src/services/`
3. Add controller handler in `server/src/controllers/`
4. Register route in `server/src/routes/`
5. Add typed client function in `client/src/lib/api.ts`

### Adding a new incident phase or event type

1. Update `INCIDENT_PHASES` in `server/src/types/domain.ts`
2. Update `Incident` model if new fields are needed
3. Update orchestrator transitions in `incidentOrchestrator.service.ts`
4. Update client types in `client/src/lib/types.ts`
5. Update UI components (PhaseStepper, flow graphs)

### Adding a webhook payload format

1. Extend `parseAlertPayload()` in `webhook.service.ts`
2. Add a scenario or format option in `incident-cli/src/scenarios.ts`
3. Document the format in `incident-cli/README.md`

### Adding a CLI scenario

1. Add preset to `incident-cli/src/scenarios.ts`
2. Scenario automatically appears in interactive select and `scenarios` command

---

## Pull requests

### Before opening a PR

- [ ] Code compiles (`npm run typecheck` / `npm run build`)
- [ ] Client lints clean (`npm run lint` in client)
- [ ] Integration tests pass (`npm test` from repo root)
- [ ] Manually tested the affected flow (Demo and/or Real mode)
- [ ] No secrets or `.env` files committed
- [ ] Updated docs if behavior changed (README, CHANGELOG, package READMEs)

### PR title format

```
feat: add PagerDuty webhook format support
fix: handle 409 when active incident exists in CLI
docs: update Real mode setup instructions
chore: bump TrueForge SDK version
```

### PR description template

```markdown
## Summary
Brief description of what changed and why.

## Test plan
- [ ] Demo mode: ...
- [ ] Real mode: ...
- [ ] Incident CLI: ...

## Screenshots (if UI change)
```

### Review expectations

- Keep PRs focused — one feature or fix per PR when possible
- Respond to review feedback promptly
- Squash or rebase if requested before merge

---

## Deployment

Sentinel uses GitHub Actions for EC2 deployment. Deploys are **manual** — triggered only when the commit message contains:

| Trigger phrase | Workflow | Target |
|----------------|----------|--------|
| `DEPLOY SERVER` | `.github/workflows/deploy-server.yml` | EC2 via PM2 |
| `DEPLOY CLIENT` | `.github/workflows/deploy-client.yml` | Static hosting |

Required GitHub secrets: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, `SERVER_ENV_FILE`, and client-specific secrets.

Do not deploy from feature branches unless coordinating with maintainers.

---

## Getting help

- Open a [GitHub Issue](https://github.com/ronak-pal1/Sentinel/issues) for bugs or feature requests
- Check existing issues before creating duplicates
- Include reproduction steps, environment details, and logs when reporting bugs

---

Thank you for contributing to Sentinel!
