# Sentinel integration tests

Black-box API and CLI tests for the Sentinel stack. Runs against the Express server with an in-memory MongoDB — no external MongoDB, TrueForge, or GitHub credentials required.

## Prerequisites

- Node.js 24+
- Server and incident-cli source at `../server` and `../incident-cli` (this repo layout)

## Run tests

From the repo root:

```bash
npm test
```

Or from this directory:

```bash
npm ci
npm test
```

Watch mode:

```bash
npm run test:watch
```

## Structure

| Path | Purpose |
|------|---------|
| `helpers/` | Test server bootstrap, env, API client, DB seeding |
| `fixtures/` | Sample Grafana and generic webhook payloads |
| `integration/` | Supertest HTTP tests against `/api/*` |
| `cli/` | incident-cli payload builders and trigger logic |

## Adding tests

1. Use `startTestApp()` / `stopTestApp()` from `helpers/testApp.ts` in `beforeAll` / `afterAll`.
2. Prefer `helpers/apiClient.ts` for authenticated requests.
3. Do not statically import server modules at the top level — env must be set first (see `helpers/testApp.ts`).

## CI

GitHub Actions runs `cd tests && npm ci && npm test` on push and pull request.
