import { loadDotEnv, requireEnv } from "../src/lib/env.mjs";
import { NotionClient, pageTitleProperty, selectProperty, dateProperty } from "../src/lib/notion.mjs";
import { readFileSync } from "node:fs";

loadDotEnv();

const FIGMA_TOKEN = requireEnv("FIGMA_TOKEN");
const NOTION_TOKEN = requireEnv("NOTION_TOKEN");
const NOTION_VERSION = process.env.NOTION_VERSION || "2025-09-03";
const TASKS_DS = process.env.TASKS_DATA_SOURCE_ID || null; // optional override
let figmaFileUrl = process.argv[2] || "";

if (!figmaFileUrl) {
  console.error("Usage: node scripts/figma-to-notion-demo.mjs <figma_file_url_or_design_url>");
  process.exit(1);
}

// Accept /design/... links and normalize to /file/ without querystring.
if (figmaFileUrl.includes("/design/")) {
  const base = figmaFileUrl.split("?")[0];
  figmaFileUrl = base.replace("/design/", "/file/");
}

async function getFigmaComments(fileUrl) {
  const fileKey = fileUrl.split("/file/")[1]?.split("/")[0];
  if (!fileKey) throw new Error("Could not parse Figma file key from URL.");

  let res;
  try {
    res = await fetch(`https://api.figma.com/v1/files/${fileKey}/comments`, {
      headers: { "X-Figma-Token": FIGMA_TOKEN }
    });
  } catch (error) {
    throw new Error(`Figma fetch failed: ${error.message}`);
  }
  if (!res.ok) {
    throw new Error(`Figma API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function pickLatestReady(comments) {
  const ready = comments?.comments?.filter((c) =>
    (c?.message || "").toLowerCase().includes("ready for review")
  ) || [];
  return ready.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
}

async function main() {
  const comments = await getFigmaComments(figmaFileUrl);
  const latest = pickLatestReady(comments);
  if (!latest) {
    console.log("No comments tagged 'Ready for Review' found. Add one and rerun.");
    return;
  }

  const taskTitle = `Review: ${latest?.client_meta?.node_id || "Figma frame"}`;
  const due = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const notion = new NotionClient({ token: NOTION_TOKEN, version: NOTION_VERSION });
  let install = {};
  try {
    install = JSON.parse(readFileSync(".echohr-install-state.json", "utf8"));
  } catch (error) {
    install = {};
  }
  const tasksDs = TASKS_DS || install.databases?.tasks?.dataSourceId;
  if (!tasksDs) throw new Error("Tasks data source id not found. Set TASKS_DATA_SOURCE_ID or rerun seeder.");

  const task = await notion.createRow({
    dataSourceId: tasksDs,
    properties: {
      Task: pageTitleProperty(taskTitle),
      "Task Type": selectProperty("Review"),
      "Due Date": dateProperty(due),
      Status: selectProperty("Not Started"),
      Priority: selectProperty("High"),
      "Empathy Note": {
        rich_text: [
          { type: "text", text: { content: "From Figma comment tagged Ready for Review." } },
          { type: "text", text: { content: ` ${figmaFileUrl}` } }
        ]
      }
    }
  });

  console.log("Created Notion task:", task.url || task.id);
  console.log("Figma comment:", latest.message);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
