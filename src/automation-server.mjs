import { createServer } from "node:http";
import { loadDotEnv } from "./lib/env.mjs";

loadDotEnv();

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";
const SLACK_DEFAULT_CHANNEL = process.env.SLACK_DEFAULT_CHANNEL || "";

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
      return json(response, 200, {
        ok: true,
        route: "notion",
        received: await readBody(request),
        hint: "Connect this endpoint from Make or Zapier to enrich and route Notion events."
      });
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
