*This is a submission for the [Notion MCP Challenge](https://dev.to/challenges/notion-2026-03-04)*

## What I Built
EchoHR: a fully Notion-native employee lifecycle system (candidates → offers → onboarding → growth → performance → compensation → offboarding → alumni) provisioned automatically via MCP. It spins up versioned hubs, 20+ linked data sources, dual relations and rollups, AI-ready fields, templates, automation playbooks, and a startup-scale demo dataset so teams can demo and iterate instantly—zero ghosting for candidates and employees.

## Video Demo
<!-- TODO: Add Loom link showing one-click provisioning, pipelines, dashboards, and Slack/AI automations running. -->

## Show us the code
Repo: https://github.com/your-org/echohr  
Workspace path for this submission: `/Users/ujja/code/personal/echohr`

## How I Used Notion MCP
- Drove Notion’s `data_source` APIs through MCP: create pages, data sources, relations, and rollups; seed demo data; persist install state for idempotent re-runs.
- Provisioned 20+ interconnected data sources (People, Roles, Candidates, Applications, Interviews, Offers, Journeys, Check-ins, Goals, Achievements, Reviews, Compensation, Tasks, Automation Log, etc.) with dual relations and SLA rollups for “no-ghosting” guardrails.
- Added MCP-friendly automation playbooks for Slack/email/calendar + OpenAI summarization hooks (feedback, reviews, exit notes).
- Implemented versioned installs (`--force-new`) with automatic unarchiving and schema refresh, so hackathon teams can iterate safely and always know the “latest” workspace.
- Seeded realistic 50-person startup org, open roles, live pipeline, check-ins, reviews, promotions, exits, recognition, and pulse surveys—ready for dashboards and AI summaries out of the box.

<!-- Optional: Add a cover image here, e.g., ![EchoHR Cover](cover.png) -->

<!-- Team Submissions: Please pick one member to publish the submission and credit teammates by listing their DEV usernames directly in the body of the post. -->

<!-- Thanks for participating! -->
