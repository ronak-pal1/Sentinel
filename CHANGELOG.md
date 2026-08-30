# Changelog

All notable changes to Sentinel are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- **Incident CLI** (`incident-cli/`) — interactive and one-shot CLI to trigger webhook alerts for hackathon demos and judge testing
  - Preset scenarios: latency spike, high error rate, memory leak, DB pool exhaustion, custom
  - Generic and Grafana-style payload formats
  - Saved config support (`~/.sentinel-cli.json`)
  - Styled terminal output with Sentinel branding
- Comprehensive **README** with architecture diagrams, feature table, and centered portal preview
- **CONTRIBUTING.md** with development setup, code conventions, and PR guidelines

---

## [0.2.0] — 2026-03-15

### Added

- **TrueForge integration** — `sentinel` agent with OpenRouter LLM, GitHub MCP, and Daytona sandbox
- **TrueForge bootstrap script** (`npm run setup:trueforge`) for one-command agent registration
- **Webhook ingestion** — `POST /api/hooks/:webhookId` with Grafana and generic JSON payload support
- **Webhook management UI** — create, list, delete webhooks linked to GitHub repos
- **Human approval gate** — approve or reject agent-proposed fixes before PR merge
- **Real incident provider** — live SSE updates from server during Real mode investigations
- **GitHub integration** — PAT storage (encrypted), repo listing, PR creation on approval
- **Incident orchestrator** — full lifecycle from alert through sandbox verification to PR
- **Rate limiting** on webhook ingestion and mutation endpoints

### Changed

- GitHub MCP in TrueForge agent is conditional on Daytona sandbox availability
- Deployment workflows updated for EC2 + PM2 server deploy and static client deploy

---

## [0.1.0] — 2026-03-01

### Added

- **Initial release** — Sentinel SRE incident-response platform for WeMakeDevs hackathon
- **Demo mode** — zero-setup scripted incident simulator with `Break It` button
- **Real mode** selection screen and profile-based mode switching
- **Incident dashboard** — phase stepper, event log, metrics sparkline, investigation graph
- **React Flow visualizations** — incident flow, sandbox verify, PR review, approval gate graphs
- **Landing page** — hero section, capability showcase, monitoring graph simulation
- **Profile system** — local identity with Demo/Real mode persistence
- **MongoDB persistence** — incidents, events, metrics, profiles, settings
- **Express 5 API** — health, profiles, incidents, settings, system metrics
- **Responsive UI** — Tailwind CSS 4 with light/dark theme tokens
- **GitHub Actions** — deploy-server and deploy-client workflows for EC2

---

## Version history summary

| Version | Highlights |
|---------|------------|
| **0.1.0** | Demo mode, incident dashboard, landing page, profile system |
| **0.2.0** | TrueForge agent, webhooks, GitHub PRs, Real mode pipeline |
| **Unreleased** | Incident CLI, documentation overhaul |

[Unreleased]: https://github.com/ronak-pal1/Sentinel/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/ronak-pal1/Sentinel/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ronak-pal1/Sentinel/releases/tag/v0.1.0
