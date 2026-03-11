#!/usr/bin/env node
import { loadDotEnv } from "../src/lib/env.mjs";
import { loadJsonIfExists } from "../src/lib/env.mjs";
import { NotionClient } from "../src/lib/notion.mjs";
import { sendSlackMessage } from "../src/lib/slack.mjs";
import { STATUS_FIELDS_BY_DB } from "../src/handlers/notion-webhook-handler.mjs";

loadDotEnv();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = process.env.NOTION_VERSION || "2025-09-03";
const WINDOW_MINUTES = Number(process.env.STATUS_WATCH_WINDOW_MIN || 15);

function statusPieces(page, fields) {
  const props = page.properties || {};
  const list =
    fields && fields.length
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

function titleOf(page) {
  const props = page.properties || {};
  const titleKey = Object.keys(props).find((p) => props[p].type === "title");
  if (!titleKey) return page.id;
  return (props[titleKey].title || []).map((t) => t.plain_text).join("");
}

async function main() {
  if (!NOTION_TOKEN) {
    console.error("NOTION_TOKEN required");
    process.exit(1);
  }

  const state = loadJsonIfExists(".echohr-install-state.json");
  if (!state?.databases) {
    console.error("Missing .echohr-install-state.json");
    process.exit(1);
  }

  const notion = new NotionClient({ token: NOTION_TOKEN, version: NOTION_VERSION });
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const messages = [];

  for (const [key, fields] of Object.entries(STATUS_FIELDS_BY_DB)) {
    const dsId = state.databases?.[key]?.dataSourceId;
    if (!dsId) continue;

    const res = await notion
      .queryDatabase(dsId, {
        filter: { timestamp: "last_edited_time", last_edited_time: { after: since } },
        page_size: 20
      })
      .catch(() => ({ results: [] }));

    for (const page of res.results || []) {
      const pieces = statusPieces(page, fields);
      if (!pieces.length) continue;
      messages.push(`Status update (${key}): ${titleOf(page)} — ${pieces.join(" · ")}`);
    }
  }

  if (!messages.length) {
    console.log(`No status changes in last ${WINDOW_MINUTES}m`);
    return;
  }

  await sendSlackMessage({
    text: messages.join("\n"),
    channel: process.env.SLACK_DEFAULT_CHANNEL
  }).catch((err) => console.error("Slack send failed", err.message));

  console.log(`Sent ${messages.length} updates`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
