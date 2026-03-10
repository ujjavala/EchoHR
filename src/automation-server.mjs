import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { loadDotEnv } from "./lib/env.mjs";
import { NotionClient, pageTitleProperty, selectProperty, dateProperty } from "./lib/notion.mjs";

loadDotEnv();

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";
const SLACK_DEFAULT_CHANNEL = process.env.SLACK_DEFAULT_CHANNEL || "";
const NOTION_TOKEN = process.env.NOTION_TOKEN || "";
const NOTION_VERSION = process.env.NOTION_VERSION || "2025-09-03";
const FIGMA_TOKEN = process.env.FIGMA_TOKEN || "";

let cachedInstallState = null;
let cachedNotionClient = null;

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

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function pickTitle(page) {
  const titleKey = Object.keys(page.properties || {}).find((k) => page.properties[k].type === "title");
  if (!titleKey) return "Untitled";
  return (page.properties[titleKey].title || []).map((t) => t.plain_text || "").join("");
}

async function createApplicationFromCandidate(candidatePageId) {
  const state = await loadInstallState();
  if (!state) return { ok: false, skipped: true, reason: "No install state" };

  const candidateDs = state.databases?.candidates?.dataSourceId;
  const applicationsDs = state.databases?.applications?.dataSourceId;
  if (!candidateDs || !applicationsDs) return { ok: false, skipped: true, reason: "Missing data source IDs" };

  const client = notion();
  const candidate = await client.request(`/v1/pages/${candidatePageId}`);
  const title = pickTitle(candidate);
  const relationProps = candidate.properties || {};
  const primaryRoleRel = relationProps["Primary Role"]?.relation || [];
  const stageOwnerRel = relationProps["Stage Owner"]?.relation || [];

  const appId = `APP-${Date.now().toString().slice(-6)}`;

  await client.createRow({
    dataSourceId: applicationsDs,
    properties: {
      "Application ID": pageTitleProperty(appId),
      Candidate: { relation: [{ id: candidatePageId }] },
      Role: primaryRoleRel.length ? { relation: primaryRoleRel } : undefined,
      "Application Status": selectProperty("Active"),
      "Pipeline Stage": selectProperty("Applied"),
      "Applied Date": dateProperty(isoToday())
    }
  });

  // SLA reminder task for stage owner
  const tasksDs = state.databases?.tasks?.dataSourceId;
  if (tasksDs) {
    const dueInTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await client.createRow({
      dataSourceId: tasksDs,
      properties: {
        Task: pageTitleProperty(`Send update to ${title}`),
        "Task Type": selectProperty("Hiring"),
        "Due Date": dateProperty(dueInTwoDays),
        Status: selectProperty("Not Started"),
        Priority: selectProperty("High"),
        "Auto-created": { checkbox: true },
        "Empathy Note": {
          rich_text: [
            {
              type: "text",
              text: { content: "No ghosting: send a clear next-step update within 2 business days." }
            }
          ]
        },
        ...(stageOwnerRel.length ? { Owner: { relation: stageOwnerRel } } : {})
      }
    });
  }

  return { ok: true, createdApplicationId: appId, candidateTitle: title, stageOwnerId: stageOwnerRel[0]?.id };
}

async function createOnboardingFromAcceptedOffer(offerPageId) {
  const state = await loadInstallState();
  if (!state) return { ok: false, skipped: true, reason: "No install state" };
  const offersDs = state.databases?.offers?.dataSourceId;
  const journeysDs = state.databases?.onboardingJourneys?.dataSourceId;
  const checkinsDs = state.databases?.checkins?.dataSourceId;
  if (!offersDs || !journeysDs || !checkinsDs) return { ok: false, skipped: true, reason: "Missing data source IDs" };

  const client = notion();
  const offer = await client.request(`/v1/pages/${offerPageId}`);
  const candidateRel = offer.properties?.Candidate?.relation || [];
  const startDate = offer.properties?.["Start Date Proposed"]?.date?.start || isoToday();
  const title = pickTitle(offer);

  if (!candidateRel.length) return { ok: false, skipped: true, reason: "Offer missing Candidate relation" };

  // Onboarding journey
  const journeyTitle = `${title} - Onboarding`;
  const journey = await client.createRow({
    dataSourceId: journeysDs,
    properties: {
      "Journey Name": pageTitleProperty(journeyTitle),
      Employee: { relation: candidateRel },
      "Start Date": dateProperty(startDate),
      "Journey Status": selectProperty("Preboarding"),
      "Intro Message": {
        rich_text: [
          { type: "text", text: { content: "Welcome aboard! Your buddy and check-ins are set up." } }
        ]
      }
    }
  });

  // First 3 monthly check-ins
  const managerRel = offer.properties?.["Approval Owner"]?.relation || [];
  for (let month = 1; month <= 3; month += 1) {
    const due = new Date(startDate);
    due.setMonth(due.getMonth() + month - 1);
    const checkinDate = due.toISOString().slice(0, 10);
    await client.createRow({
      dataSourceId: checkinsDs,
      properties: {
        "Check-in Name": pageTitleProperty(`${title} - Month ${month}`),
        Employee: { relation: candidateRel },
        ...(managerRel.length ? { Manager: { relation: managerRel } } : {}),
        "Check-in Type": selectProperty("Monthly"),
        "Scheduled Date": dateProperty(checkinDate),
        Status: selectProperty("Planned")
      }
    });
  }

  return { ok: true, onboardingJourneyId: journey.id };
}

async function processNotionWebhook(body) {
  const events = body?.events || (body?.event ? [body.event] : [body]).filter(Boolean);
  const results = [];
  for (const event of events) {
    const dsId =
      event?.data?.parent?.data_source_id ||
      event?.data_source_id ||
      event?.parent?.data_source_id;
    const pageId = event?.data?.id || event?.id;
    if (!dsId || !pageId) {
      results.push({ ok: false, skipped: true, reason: "Missing data_source_id or page id" });
      continue;
    }
    const state = await loadInstallState();
    if (!state) {
      results.push({ ok: false, skipped: true, reason: "No install state" });
      continue;
    }

    // Candidate created -> Application + SLA task
    if (dsId === state.databases?.candidates?.dataSourceId && event?.type === "page_created") {
      const res = await createApplicationFromCandidate(pageId);
      results.push(res);
      // Optional Slack notify
      if (SLACK_BOT_TOKEN) {
        await sendSlackMessage({
          text: `New candidate processed: ${res.candidateTitle}. Application created (${res.createdApplicationId}). SLA task added for stage owner.`,
          channel: SLACK_DEFAULT_CHANNEL
        });
      }
      continue;
    }

    // Offer status Accepted -> Onboarding journey + check-ins
    if (dsId === state.databases?.offers?.dataSourceId) {
      const offer = await notion().request(`/v1/pages/${pageId}`);
      const status = offer.properties?.["Offer Status"]?.select?.name || "";
      if (status === "Accepted") {
        const res = await createOnboardingFromAcceptedOffer(pageId);
        results.push(res);
        if (SLACK_BOT_TOKEN) {
          await sendSlackMessage({
            text: `Offer accepted: ${pickTitle(offer)}. Onboarding journey created and first 3 monthly check-ins scheduled.`,
            channel: SLACK_DEFAULT_CHANNEL
          });
        }
        continue;
      }
    }

    results.push({ ok: true, skipped: true, reason: "No matching automation" });
  }
  return results;
}

async function createTaskFromFigmaComment({ fileKey, message, nodeId, fileUrl }) {
  const state = await loadInstallState();
  if (!state) return { ok: false, skipped: true, reason: "No install state" };
  const tasksDs = state.databases?.tasks?.dataSourceId;
  if (!tasksDs) return { ok: false, skipped: true, reason: "Missing Tasks data source ID" };

  const notionClient = notion();
  const due = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const task = await notionClient.createRow({
    dataSourceId: tasksDs,
    properties: {
      Task: pageTitleProperty(`Review: ${nodeId || fileKey}`),
      "Task Type": selectProperty("Review"),
      "Due Date": dateProperty(due),
      Status: selectProperty("Not Started"),
      Priority: selectProperty("High"),
      "Empathy Note": {
        rich_text: [
          { type: "text", text: { content: "From Figma comment tagged Ready for Review." } },
          { type: "text", text: { content: ` ${fileUrl}` } }
        ]
      }
    }
  });

  if (SLACK_BOT_TOKEN) {
    await sendSlackMessage({
      text: `Created review task from Figma: ${task.url || task.id}\nComment: ${message}`,
      channel: SLACK_DEFAULT_CHANNEL
    });
  }

  return { ok: true, taskUrl: task.url || task.id };
}

async function handleFigmaWebhook(body) {
  if (!FIGMA_TOKEN) return { ok: false, skipped: true, reason: "FIGMA_TOKEN not set" };
  const events = body?.events || (body?.event ? [body.event] : [body]).filter(Boolean);
  const results = [];
  for (const event of events) {
    const comment = event?.comment || event?.data?.comment || event;
    const message = comment?.message || "";
    if (!message.toLowerCase().includes("ready for review")) {
      results.push({ ok: true, skipped: true, reason: "No Ready for Review tag" });
      continue;
    }
    const fileKey = comment?.file_key || comment?.fileKey || comment?.fileId;
    const nodeId = comment?.client_meta?.node_id || comment?.node_id || "frame";
    const fileUrl = comment?.file_url || `https://www.figma.com/file/${fileKey}`;
    if (!fileKey) {
      results.push({ ok: false, skipped: true, reason: "Missing file key" });
      continue;
    }
    results.push(await createTaskFromFigmaComment({ fileKey, message, nodeId, fileUrl }));
  }
  return results;
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

function summaryPrompt(kind, payload) {
  if (kind === "interview") {
    return `Summarize the interview feedback. Return valid JSON with keys: summary, strengths, concerns, recommendation, candidate_safe_feedback.\n\nInput:\n${JSON.stringify(payload, null, 2)}`;
  }

  if (kind === "review") {
    return `Summarize the performance review. Return valid JSON with keys: summary, wins, growth_areas, support_requests, manager_actions, promotion_signal.\n\nInput:\n${JSON.stringify(payload, null, 2)}`;
  }

  if (kind === "exit") {
    return `Summarize the exit notes. Return valid JSON with keys: summary, reasons_for_exit, preventable_issues, process_themes, manager_coaching, alumni_recommendation.\n\nInput:\n${JSON.stringify(payload, null, 2)}`;
  }

  return `Summarize this HR workflow payload into valid JSON with keys summary and next_actions.\n\nInput:\n${JSON.stringify(payload, null, 2)}`;
}

async function generateOpenAISummary(kind, payload) {
  if (!OPENAI_API_KEY) {
    return {
      provider: "fallback",
      kind,
      summary: `OpenAI API key not configured. Fallback summary for ${kind}.`,
      input_echo: payload
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are an HR operations copilot. Be empathetic, concise, and do not invent facts. Return valid JSON only."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: summaryPrompt(kind, payload)
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const text = data.output_text || "";

  try {
    return JSON.parse(text);
  } catch {
    return {
      provider: "openai",
      raw: text
    };
  }
}

async function sendSlackMessage({ text, channel = SLACK_DEFAULT_CHANNEL }) {
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

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/health") {
      return json(response, 200, {
        ok: true,
        service: "echohr-automation-server",
        port: PORT,
        openaiConfigured: Boolean(OPENAI_API_KEY),
        slackConfigured: Boolean(SLACK_BOT_TOKEN)
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
      const results = await processNotionWebhook(body);
      return json(response, 200, { ok: true, processed: results });
    }

    if (request.method === "POST" && url.pathname === "/webhooks/figma") {
      const body = await readBody(request);
      const results = await handleFigmaWebhook(body);
      return json(response, 200, { ok: true, processed: results });
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
