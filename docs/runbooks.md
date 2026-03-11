# EchoHR Runbooks (Ops / On-Call)

## Webhook failures (Notion/Figma/Slack)
1. Check `/health` on the automation server. Confirm `openaiConfigured`, `slackConfigured`, and `featureFlags`.
2. Review server logs for the route (`/webhooks/notion`, `/webhooks/figma`, `/webhooks/meeting-notes`).
3. Re-send payload with curl from README to reproduce.
4. If Slack/Figma tokens expired, rotate tokens and restart server. Use `config/feature-flags.json` to temporarily disable Slack notifications.

## Feedback overdue
1. Run `curl -X POST http://127.0.0.1:8787/ops/feedback-sweep`.
2. If disabled by flag, set `feedback_sweep:true` in `config/feature-flags.json` or POST `/ops/feature-flags {"flags":{"feedback_sweep":true}}`.
3. Check Interviews DB filters for “Completed & no Feedback Submitted At”.

## AI summaries stuck
1. Ensure `OPENAI_API_KEY` set; `/health` shows `openaiConfigured:true`.
2. Confirm `ai_summaries:true` in feature flags.
3. Retry with `curl /webhooks/meeting-notes` sample.

## Auto onboarding not firing
1. Offer page must have `Offer Status = Accepted` and be in Offers DS used by `.echohr-install-state.json`.
2. Ensure `auto_onboarding_from_offer:true` in feature flags.
3. Re-play event via `/webhooks/notion` with offer page id + data_source_id.

## Candidate → Application not firing
1. Candidate page must be in Candidates DS from install state.
2. `auto_candidate_applications:true` flag enabled.
3. Re-play via `/webhooks/notion` page_created payload.

## Slack not posting
1. Verify token and channel (`SLACK_BOT_TOKEN`, `SLACK_DEFAULT_CHANNEL`).
2. Check feature flag `slack_notifications:true`.
3. Ensure bot is invited to the channel.

## Rolling back/refreshing install
1. Delete `.echohr-install-state.json`.
2. `npm run demo -- --force-new` with a valid `NOTION_PARENT_PAGE_ID`.
3. Restart automation server.

## Capturing logs
Run automation server with plain stdout; pipe to file if needed:
```bash
PORT=8787 npm run automation-server > /tmp/echohr.log 2>&1
```
