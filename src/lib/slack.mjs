import { isFeatureEnabled } from "./feature-flags.mjs";
import { inc } from "../core/metrics.mjs";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";
const SLACK_DEFAULT_CHANNEL = process.env.SLACK_DEFAULT_CHANNEL || "";

export async function sendSlackMessage({ text, channel = SLACK_DEFAULT_CHANNEL }) {
  if (!isFeatureEnabled("slack_notifications", true)) {
    return { ok: true, skipped: true, reason: "Slack notifications disabled by feature flag", text, channel };
  }
  if (!SLACK_BOT_TOKEN || !channel) {
    return {
      provider: "fallback",
      ok: true,
      skipped: true,
      reason: "Slack not configured",
      text,
      channel
    };
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`
    },
    body: JSON.stringify({
      channel,
      text
    })
  });

  const data = await response.json();
  if (!data.ok) {
    inc("slack_failed");
    throw new Error(`Slack request failed: ${JSON.stringify(data)}`);
  }
  inc("slack_sent");
  return data;
}

// Enqueue via Postgres job queue if configured, else send immediately
export async function sendSlackAsync(payload) {
  try {
    const { enqueueJob } = await import("../db/job-queue.mjs");
    const res = await enqueueJob("slack_notify", payload);
    if (res?.ok) return { queued: true };
  } catch {
    // fall through to direct send
  }
  return sendSlackMessage(payload);
}
