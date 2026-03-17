# Notion Pipelines (future-ready wiring)

Notion Pipelines is in limited beta. EchoHR is ready to consume pipeline events via the existing webhook endpoints.

Suggested pipeline steps (once you have access):

- **Candidate created** → Action: HTTP POST to `/webhooks/notion` with the `page_created` payload (Candidates DS) to auto-create Application + SLA Task.
- **Offer status becomes Accepted** → HTTP POST to `/webhooks/notion` (Offers DS) to auto-create Onboarding Journey + first 3 Check-ins.
- **Any status changed** (Candidates, Applications, Tasks, Reviews, Offboarding) → HTTP POST to `/webhooks/notion` to trigger Slack status pings + optional Supabase sync.
- **Interview completed** → HTTP POST to `/webhooks/meeting-notes` with transcript/notes for AI feedback (candidate-safe + manager actions).
- **Scheduled sweep** → HTTP POST to `/ops/feedback-sweep` daily to catch any missed feedback.

Notes:
- Keep `HIGH_VOLUME=true` and `NOTION_RATE_DELAY_MS=400` for safer write pacing if you fan out many pipeline actions.
- If you enable Supabase, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE` so all pipeline-driven changes are mirrored for analytics.

Endpoint base: wherever your automation server is hosted (default dev: `http://127.0.0.1:8787`).
