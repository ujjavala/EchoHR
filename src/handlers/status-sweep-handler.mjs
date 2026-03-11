import { STATUS_FIELDS_BY_DB } from "./notion-webhook-handler.mjs";
import { sendSlackMessage } from "../lib/slack.mjs";

function statusPieces(page, fields) {
  const props = page.properties || {};
  const list = fields && fields.length
    ? fields
    : Object.entries(props)
        .filter(([, v]) => v?.type === "select" || v?.type === "status")
        .map(([name]) => name);
  return list
    .map((name) => {
      const v = props[name];
      const val = v?.select?.name || v?.status?.name;
      return val ? `${name}: ${val}` : null;
    })
    .filter(Boolean);
}

export async function statusSweep(notionClient, state, windowMinutes = 15) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const messages = [];

  for (const [key, fields] of Object.entries(STATUS_FIELDS_BY_DB)) {
    const dsId = state.databases?.[key]?.dataSourceId;
    if (!dsId) continue;

    const res = await notionClient
      .queryDatabase(dsId, {
        filter: {
          timestamp: "last_edited_time",
          last_edited_time: { after: since }
        },
        page_size: 10
      })
      .catch(() => ({ results: [] }));

    for (const page of res.results || []) {
      const pieces = statusPieces(page, fields);
      if (pieces.length) {
        const props = page.properties || {};
        const titleKey = Object.keys(props).find((p) => props[p].type === "title");
        const title = titleKey ? (props[titleKey].title || []).map((t) => t.plain_text).join("") : page.id;
        messages.push(`Status update (${key}): ${title} — ${pieces.join(" · ")}`);
      }
    }
  }

  if (messages.length) {
    await sendSlackMessage({
      text: messages.join("\n"),
      channel: process.env.SLACK_DEFAULT_CHANNEL
    }).catch(() => null);
  }

  return { ok: true, sent: messages.length, since };
}
