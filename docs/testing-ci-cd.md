# Testing & CI/CD

## Local checks
- Static checks: `npm run check` (runs `node --check` on key entrypoints).
- Seed demo (idempotent): `npm run demo -- --force-new` (requires `NOTION_TOKEN`, `NOTION_PARENT_PAGE_ID`).
- Automation server smoke:
  - `npm run automation-server` (port 8787)
  - `curl http://127.0.0.1:8787/health`
  - `curl -X POST http://127.0.0.1:8787/webhooks/meeting-notes -H "Content-Type: application/json" -d '{"kind":"interview","interviewId":"TEST","notes":"demo"}'`

## GitHub Actions
- Workflow: `.github/workflows/ci.yml`
- Runs on push/PR:
  - `npm ci`
  - `npm run check`
- Extend by adding jobs for integration tests once service mocks are available.

## Suggested next additions
- Add contract tests for webhook payloads (Notion/Figma/Slack) using saved fixtures.
- Add load test for feedback-sweep query on Interviews DS.
- Add snapshot tests for seeded schemas (compare `.echohr-install-state.json` shape).
- Add Playwright (optional) for Notion UI view recipes is not possible via API; keep manual checklist in `docs/views-and-dashboards.md`.
