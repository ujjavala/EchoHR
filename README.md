# EchoHR

Executable Notion seeder for a hackathon-ready employee lifecycle management system.

Primary operational model:

- `Notion MCP` for day-to-day agent-driven operations and updates
- `Notion API` for deterministic bulk provisioning and scripted bootstrap
- `Make` / `Zapier` for cross-system triggers

Security note:

- do not commit Notion secrets or issued access tokens

## What this repo does

It creates an `EchoHR` workspace structure inside Notion with:

- top-level hub pages
- lifecycle databases
- key relations and rollups
- seeded message and checklist templates
- automation playbook pages
- realistic demo records across hiring, onboarding, reviews, engagement, and offboarding
- a startup-scale dummy dataset with roughly 50 people, active hiring, and annual review records
- founders, execs, HR/People, managers, and IC reporting lines seeded into the org structure
- first-class goals and achievements linked into reviews and appraisals
- Notion MCP guidance and reusable operational prompts
- a local automation server for OpenAI and Slack glue
- Make and Zapier starter scenario manifests
- versioned installs (`EchoHR HQ vN (latest)`) with automatic unarchive-and-retitle of older versions on `--force-new`

## What you need

1. A Notion internal integration token
2. A parent Notion page shared with that integration
3. Node 22+

## Environment

Copy `.env.example` to `.env` and fill in:

- `NOTION_TOKEN`
- `NOTION_PARENT_PAGE_ID`

Optional:

- `NOTION_VERSION` defaults to `2025-09-03`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SLACK_BOT_TOKEN`
- `SLACK_DEFAULT_CHANNEL`
- `PORT` defaults to `8787`

## Run

```bash
npm run create
```

Optional demo content:

```bash
npm run create -- --seed-demo
```

One-command hackathon setup:

```bash
npm run demo
```

Force a brand new install instead of reusing the recorded one:

```bash
npm run demo -- --force-new
```

Dry run:

```bash
npm run create -- --dry-run
```

Run the local automation server:

```bash
npm run automation-server
```

Recreate everything from scratch (new versioned root, refreshed schemas, rollups, demo data):

```bash
npm run demo -- --force-new
```

## Output

After a successful run, the script writes local IDs and URLs to:

- `echohr-install-output.json`
- `.echohr-install-state.json`

Automation assets live in:

- `automations/make`
- `automations/zapier`
- `automations/prompts`
- `automations/samples`
- `mcp`

Lifecycle automation intent:

- zero ghosting for candidates through explicit update deadlines
- zero silent appraisal cycles through linked goals, achievements, and feedback nudges
- visible onboarding, check-in, review, offboarding, and alumni next steps

Notion MCP usage:

- use Notion MCP for ongoing record updates, summaries, reminders, dashboard maintenance, and lifecycle follow-through
- use the seeder in this repo for initial workspace bootstrap, because it is easier to keep deterministic than conversational MCP creation
- MCP drives the Notion `data_source` endpoints for relations, rollups, and queries (no legacy `database_id` queries), enabling reliable dual relations and rollups
- use MCP prompts in `mcp/notion-mcp-playbook.md` to drive candidate updates, review evidence sync, offboarding follow-up, mood/celebration pings, and zero-ghosting checks

Internal Notion integration guidance:

- connect the `Echo HR` integration to the parent page before running the seeder
- use the internal integration secret directly as `NOTION_TOKEN`
- bootstrap EchoHR into a normal Notion page, not an existing database page

## Notes

- The script uses the current Notion `database` + `data source` APIs directly with `fetch`; no external dependencies are required.
- By default, reruns reuse the previously recorded EchoHR install and will not create another top-level page unless you pass `--force-new`.
- Fresh installs are titled `EchoHR HQ v1 (latest)`, `EchoHR HQ v2 (latest)`, and so on. When a newer forced install is created, the previous root page drops the `latest` suffix.
- Notion still does not expose full view management through the API, so dashboard view layouts remain a short manual pass in the app.
- Formula properties cannot be updated after creation via the API, so formulas are implemented only where they can be created safely during provisioning.
- The local automation server exposes `GET /health`, `POST /summaries/interview`, `POST /summaries/review`, `POST /summaries/exit`, `POST /slack/notify`, `POST /webhooks/notion`, and `POST /webhooks/slack`.
- Rollups are created through the `data_source` endpoint (with database fallback) after schema refresh; if you see rollup skips, run `npm run demo -- --force-new` to regenerate a clean version.
