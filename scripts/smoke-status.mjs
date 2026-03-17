#!/usr/bin/env node
import { loadDotEnv, requireEnv, loadJsonIfExists } from "../src/lib/env.mjs";
import { NotionClient } from "../src/lib/notion.mjs";
import { statusSweep } from "../src/handlers/status-sweep-handler.mjs";

loadDotEnv();

const token = process.env.NOTION_TOKEN || requireEnv("NOTION_TOKEN");
const version = process.env.NOTION_VERSION || "2025-09-03";
const state = loadJsonIfExists(".echohr-install-state.json");
if (!state?.databases) {
  console.error("Missing .echohr-install-state.json; run npm run demo first.");
  process.exit(1);
}

const notion = new NotionClient({ token, version });
const windowMinutes = Number(process.env.SMOKE_WINDOW_MIN || 60);

statusSweep(notion, state, windowMinutes)
  .then((res) => {
    console.log("smoke-status", res);
  })
  .catch((err) => {
    console.error("smoke-status failed", err.message);
    process.exit(1);
  });
