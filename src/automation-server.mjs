import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { loadDotEnv } from "./lib/env.mjs";
import { NotionClient } from "./lib/notion.mjs";
import { handleFigmaWebhook } from "./handlers/figma-handler.mjs";
import { handleMeetingNotesWebhook } from "./handlers/meeting-notes-handler.mjs";
import { feedbackSweep } from "./handlers/feedback-sweep-handler.mjs";
import { processNotionWebhook } from "./handlers/notion-webhook-handler.mjs";
import { statusSweep } from "./handlers/status-sweep-handler.mjs";
import { loadFeatureFlags, getFeatureFlags, isFeatureEnabled, setFeatureFlags } from "./lib/feature-flags.mjs";
import { createLimiter } from "./core/limiter.mjs";
import { withRequestId, logger } from "./core/logger.mjs";
import { pendingCount } from "./db/job-queue.mjs";
import crypto from "node:crypto";
import { rbacAllows } from "./core/rbac.mjs";
import { snapshot, setMetric } from "./core/metrics.mjs";

loadDotEnv();

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const NOTION_TOKEN = process.env.NOTION_TOKEN || "";
const NOTION_VERSION = process.env.NOTION_VERSION || "2025-09-03";
const NOTION_WEBHOOK_SECRET = process.env.NOTION_WEBHOOK_SECRET || "";
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || "";

let cachedInstallState = null;
let cachedNotionClient = null;
const limiter = createLimiter({
  concurrency: Number(process.env.NOTION_RATE_CONCURRENCY || 1),
  intervalMs: Number(process.env.NOTION_RATE_DELAY_MS || 400),
  backoffBaseMs: Number(process.env.NOTION_BACKOFF_BASE_MS || 800)
});

// Preload feature flags
await loadFeatureFlags().catch(() => null);

function notion() {
  if (!NOTION_TOKEN) {
    throw new Error("NOTION_TOKEN is required for webhook processing.");
  }
  if (!cachedNotionClient) {
    const base = new NotionClient({ token: NOTION_TOKEN, version: NOTION_VERSION });
    // In high-volume mode, wrap Notion operations with a simple limiter
    if (process.env.HIGH_VOLUME === "true") {
      cachedNotionClient = new Proxy(base, {
        get(target, prop) {
          const value = target[prop];
          if (typeof value !== "function") return value;
          return (...args) => limiter(() => target[prop](...args));
        }
      });
    } else {
      cachedNotionClient = base;
    }
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

  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw);
}

async function readBodyRaw(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    const requestId = withRequestId(request);
    const start = Date.now();
    logger.info("request", { path: url.pathname, method: request.method, requestId });

    if (request.method === "GET" && url.pathname === "/ready") {
      const pgConfigured = Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);
      let pgOk = false;
      if (pgConfigured) {
        try {
          const { getPg } = await import("./db/pg.mjs");
          const pg = getPg();
          if (pg) {
            await pg.query("SELECT 1");
            pgOk = true;
          }
        } catch {
          pgOk = false;
        }
      }
      return json(response, 200, {
        ok: true,
        service: "echohr-automation-server",
        postgresConfigured: pgConfigured,
        queuePending: pgConfigured ? await pendingCount().catch(() => 0) : 0
      });
    }

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
    if (request.method === "GET" && url.pathname === "/metrics") {
      return json(response, 200, snapshot());
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
      const raw = await readBodyRaw(request);
      if (NOTION_WEBHOOK_SECRET) {
        const sig = request.headers["x-echohr-signature"];
        const hmac = crypto.createHmac("sha256", NOTION_WEBHOOK_SECRET).update(raw).digest("hex");
        if (sig !== hmac) return json(response, 401, { ok: false, error: "invalid signature" });
      }
      const body = raw ? JSON.parse(raw) : {};
      const role = body?.context?.role;
      if (role && !rbacAllows(role, "auto_candidate_applications")) {
        return json(response, 403, { ok: false, error: "forbidden by RBAC" });
      }
      if (!isFeatureEnabled("auto_candidate_applications", true) && !isFeatureEnabled("auto_onboarding_from_offer", true)) {
        return json(response, 200, { ok: true, skipped: true, reason: "Automation disabled by feature flags" });
      }
      const state = await loadInstallState();
      if (!state) return json(response, 200, { ok: false, reason: "No install state" });
      const results = await processNotionWebhook(body, notion(), state);
      return json(response, 200, { ok: true, processed: results });
    }

    if (request.method === "POST" && url.pathname === "/webhooks/figma") {
      const raw = await readBodyRaw(request);
      if (process.env.FIGMA_WEBHOOK_SECRET) {
        const sig = request.headers["x-figma-signature"];
        const hmac = crypto.createHmac("sha256", process.env.FIGMA_WEBHOOK_SECRET).update(raw).digest("hex");
        if (sig !== hmac) return json(response, 401, { ok: false, error: "invalid figma signature" });
      }
      const body = raw ? JSON.parse(raw) : {};
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

    if (request.method === "POST" && url.pathname === "/ops/status-sweep") {
      const state = await loadInstallState();
      if (!state) return json(response, 200, { ok: false, reason: "No install state" });
      const result = await statusSweep(notion(), state);
      return json(response, 200, result);
    }

    if (request.method === "POST" && url.pathname === "/webhooks/slack") {
      const raw = await readBodyRaw(request);
      if (SLACK_SIGNING_SECRET) {
        const ts = request.headers["x-slack-request-timestamp"];
        const sig = request.headers["x-slack-signature"];
        const base = `v0:${ts}:${raw}`;
        const hmac = "v0=" + crypto.createHmac("sha256", SLACK_SIGNING_SECRET).update(base).digest("hex");
        if (sig !== hmac) return json(response, 401, { ok: false, error: "invalid slack signature" });
      }
      const body = JSON.parse(raw || "{}");
      if (body.type === "url_verification" && body.challenge) {
        return json(response, 200, { challenge: body.challenge });
      }
      return json(response, 200, { ok: true, route: "slack", received: body });
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
  } finally {
    setMetric("webhook_latency_ms", Date.now() - start);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`EchoHR automation server listening on http://${HOST}:${PORT}`);
});
