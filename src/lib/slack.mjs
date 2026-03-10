const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";
const SLACK_DEFAULT_CHANNEL = process.env.SLACK_DEFAULT_CHANNEL || "";

export async function sendSlackMessage({ text, channel = SLACK_DEFAULT_CHANNEL }) {
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
    throw new Error(`Slack request failed: ${JSON.stringify(data)}`);
  }

  return data;
}
