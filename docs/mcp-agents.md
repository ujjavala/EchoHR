# MCP Agent Recipes for EchoHR

Use these prompts in your MCP-capable client (Notion + Slack + Calendar + Figma servers configured). Adjust channels/emails as needed.

## Figma comment → Task → Review meeting → Slack
“Fetch latest Figma comments tagged Ready for Review. For each: create a Notion Task in EchoHR Tasks (type Review), set Due Date tomorrow, link the Figma URL. Create a calendar event tomorrow 10am with attendees <emails>. Post a Slack update with task link + Figma link.”

MCP servers: Figma, Notion, Calendar, Slack.

## Candidate no-ghosting sweep
“In EchoHR Candidates, find active candidates whose Last Update Sent is >2 days ago. Draft candidate-safe updates, set Personalized Next Step, and notify Stage Owner in Slack. If missing Application, create one.”

MCP servers: Notion, Slack (optional).

## Offer → Onboarding
“For offers in Accepted, ensure an Onboarding Journey exists, create first 3 monthly Check-ins, and DM the manager/buddy in Slack with dates.”

MCP servers: Notion, Slack.

## Growth snapshot
“Summarize Goals, Achievements, and latest Review for each active employee; post a Slack digest; create calendar holds for any review due this week.”

MCP servers: Notion, Slack, Calendar.

## Slack defaults
- `SLACK_DEFAULT_CHANNEL` is the channel ID (e.g., `C06789XYZ`), not a token. Get it from Slack channel info or URL. Make sure the bot is invited.

## Multi-agent config
- Use `mcp/multi-agent-config.example.json` to register Notion + Slack + Calendar + Figma + your local automation server (`npm run mcp-remote:local`).

## Calendar tips
- Use “Calendar” MCP server (Google/Outlook) to create events; if unavailable, hit your existing calendar integration via Make/n8n with an HTTP node.
