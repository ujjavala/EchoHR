import { isFeatureEnabled } from "./feature-flags.mjs";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

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

export async function generateOpenAISummary(kind, payload) {
  if (!isFeatureEnabled("ai_summaries", true)) {
    return {
      provider: "disabled",
      kind,
      summary: `AI summaries disabled by feature flag.`,
      input_echo: payload
    };
  }
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
