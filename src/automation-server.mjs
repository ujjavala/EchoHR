import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { loadDotEnv } from "./lib/env.mjs";
import { NotionClient } from "./lib/notion.mjs";
import { handleFigmaWebhook } from "./handlers/figma-handler.mjs";
import { handleMeetingNotesWebhook } from "./handlers/meeting-notes-handler.mjs";
import { feedbackSweep } from "./handlers/feedback-sweep-handler.mjs";
import { processNotionWebhook } from "./handlers/notion-webhook-handler.mjs";
import { loadFeatureFlags, getFeatureFlags, isFeatureEnabled, setFeatureFlags } from "./lib/feature-flags.mjs";

loadDotEnv();

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const NOTION_TOKEN = process.env.NOTION_TOKEN || "";
const NOTION_VERSION = process.env.NOTION_VERSION || "2025-09-03";

let cachedInstallState = null;
let cachedNotionClient = null;

// Preload feature flags
await loadFeatureFlags().catch(() => null);

function notion() {
  if (!NOTION_TOKEN) {
    throw new Error("NOTION_TOKEN is required for webhook processing.");
  }
  if (!cachedNotionClient) {
    cachedNotionClient = new NotionClient({ token: NOTION_TOKEN, version: NOTION_VERSION });
  }
  return cachedNotionClient;
}

async function loadInstallState() {
  if (cachedInstallState) return cachedInstallState;
  try {
    const raw = await readFile(".echohr-install-state.json", "utf8");
    cachedInstallState = JSON.parse(raw);
    return cachedInstallState;
  } catch (error) {
    console.warn("Install state not found; webhook automation will no-op. Error:", error.message);
    return null;
  }
}

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body, null, 2));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/health") {
      return json(response, 200, {
        ok: true,
        service: "echohr-automation-server",
        port: PORT,
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
        slackConfigured: Boolean(process.env.SLACK_BOT_TOKEN),
        featureFlags: getFeatureFlags()
      });
    }

    if (request.method === "POST" && url.pathname === "/summaries/interview") {
      return json(response, 200, await generateOpenAISummary("interview", await readBody(request)));
    }

    if (request.method === "POST" && url.pathname === "/summaries/review") {
      return json(response, 200, await generateOpenAISummary("review", await readBody(request)));
    }

    if (request.method === "POST" && url.pathname === "/summaries/exit") {
      return json(response, 200, await generateOpenAISummary("exit", await readBody(request)));
    }

    if (request.method === "POST" && url.pathname === "/slack/notify") {
      return json(response, 200, await sendSlackMessage(await readBody(request)));
    }

    if (request.method === "POST" && url.pathname === "/webhooks/notion") {
      const body = await readBody(request);
      if (!isFeatureEnabled("auto_candidate_applications", true) && !isFeatureEnabled("auto_onboarding_from_offer", true)) {
        return json(response, 200, { ok: true, skipped: true, reason: "Automation disabled by feature flags" });
      }
      const state = await loadInstallState();
      if (!state) return json(response, 200, { ok: false, reason: "No install state" });
      const results = await processNotionWebhook(body, notion(), state);
      return json(response, 200, { ok: true, processed: results });
    }

    if (request.method === "POST" && url.pathname === "/webhooks/figma") {
      const body = await readBody(request);
      const state = await loadInstallState();
      if (!state) return json(response, 200, { ok: false, reason: "No install state" });
      const results = await handleFigmaWebhook(body, state, notion());
      return json(response, 200, { ok: true, processed: results });
    }

    if (request.method === "POST" && url.pathname === "/webhooks/meeting-notes") {
      const body = await readBody(request);
      const result = await handleMeetingNotesWebhook(body, notion());
      return json(response, 200, { ok: true, processed: [result] });
    }

    if (request.method === "POST" && url.pathname === "/ops/feedback-sweep") {
      if (!isFeatureEnabled("feedback_sweep", true)) {
        return json(response, 200, { ok: true, skipped: true, reason: "Feedback sweep disabled by feature flag" });
      }
      const state = await loadInstallState();
      if (!state) return json(response, 200, { ok: false, reason: "No install state" });
      const result = await feedbackSweep(notion(), state);
      return json(response, 200, result);
    }

    if (request.method === "POST" && url.pathname === "/webhooks/slack") {
      const body = await readBody(request);
      if (body.type === "url_verification" && body.challenge) {
        return json(response, 200, { challenge: body.challenge });
      }

      return json(response, 200, {
        ok: true,
        route: "slack",
        received: body
      });
    }

    // Runtime feature flag override (admin/testing): POST /ops/feature-flags {flags:{}}
    if (request.method === "POST" && url.pathname === "/ops/feature-flags") {
      const body = await readBody(request);
      setFeatureFlags(body.flags || {});
      return json(response, 200, { ok: true, featureFlags: getFeatureFlags() });
    }

    return json(response, 404, {
      error: "Not found",
      path: url.pathname
    });
  } catch (error) {
    return json(response, 500, {
      ok: false,
      error: error.message
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`EchoHR automation server listening on http://${HOST}:${PORT}`);
});
