import { sendSlackMessage } from "../lib/slack.mjs";
import { isFeatureEnabled } from "../lib/feature-flags.mjs";

export async function feedbackSweep(notionClient, state) {
  if (!isFeatureEnabled("feedback_sweep", true)) return { ok: true, skipped: true, reason: "feedback_sweep disabled" };
  const interviewsDs = state.databases?.interviews?.dataSourceId;
  if (!interviewsDs) return { ok: false, skipped: true, reason: "Missing Interviews data source" };

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const res = await notionClient.queryDatabase(interviewsDs, {
    filter: {
      and: [
        { property: "Status", select: { equals: "Completed" } },
        { property: "Feedback Submitted At", date: { is_empty: true } },
        { property: "Scheduled For", date: { before: sevenDaysAgo } }
      ]
    }
  });

  const overdue = (res.results || []).map((page) => {
    const titleKey = Object.keys(page.properties || {}).find((k) => page.properties[k].type === "title");
    const items = titleKey ? page.properties[titleKey].title || [] : [];
    return items.map((t) => t.plain_text || "").join("");
  });

  if (overdue.length) {
    await sendSlackMessage({
      text: `Feedback overdue (>7d) for interviews: ${overdue.join(", ")}`,
      channel: process.env.SLACK_DEFAULT_CHANNEL
    }).catch(() => null);
  }

  if (process.env.EMAIL_WEBHOOK && overdue.length) {
    await fetch(process.env.EMAIL_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: "EchoHR feedback reminder", interviews: overdue })
    }).catch(() => null);
  }

  return { ok: true, overdue: overdue.length };
}
