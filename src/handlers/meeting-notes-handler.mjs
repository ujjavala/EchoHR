import { generateOpenAISummary } from "../lib/openai.mjs";
import { todayISO, pickTitle, getRelationIds } from "../lib/feedback.mjs";
import { dateProperty } from "../lib/notion.mjs";
import { sendSlackMessage } from "../lib/slack.mjs";

export async function handleMeetingNotesWebhook(body, notionClient) {
  const kind = body?.kind || "interview";
  const notes = body?.notes || "";
  if (!notes) return { ok: false, skipped: true, reason: "No notes provided" };

  if (kind === "interview") {
    const interviewId = body.interviewId;
    if (!interviewId) return { ok: false, skipped: true, reason: "Missing interviewId" };
    const summary = await generateOpenAISummary("interview", { notes });
    await notionClient.request(`/v1/pages/${interviewId}`, {
      method: "PATCH",
      body: {
        properties: {
          "AI Summary": { rich_text: [{ type: "text", text: { content: JSON.stringify(summary) } }] },
          "Candidate-safe Summary": { rich_text: [{ type: "text", text: { content: summary?.candidate_safe_feedback || "" } }] },
          "Feedback Submitted At": dateProperty(todayISO())
        }
      }
    });
    const interview = await notionClient.request(`/v1/pages/${interviewId}`);
    const applicationIds = getRelationIds(interview, "Application");
    if (applicationIds.length) {
      const app = await notionClient.request(`/v1/pages/${applicationIds[0]}`);
      const candidateIds = getRelationIds(app, "Candidate");
      if (candidateIds.length) {
        await notionClient.request(`/v1/pages/${candidateIds[0]}`, {
          method: "PATCH",
          body: {
            properties: {
              "Last Update Sent": dateProperty(todayISO()),
              "Personalized Next Step": { rich_text: [{ type: "text", text: { content: "Thanks for the interview—here’s your feedback and next step." } }] }
            }
          }
        });
      }
    }
    await sendSlackMessage({
      text: `Interview feedback posted for ${pickTitle(interview)}. Candidate-safe summary drafted.`,
      channel: process.env.SLACK_DEFAULT_CHANNEL
    }).catch(() => null);
    return { ok: true, type: "interview", summary };
  }

  if (kind === "review") {
    const reviewId = body.reviewId;
    if (!reviewId) return { ok: false, skipped: true, reason: "Missing reviewId" };
    const summary = await generateOpenAISummary("review", { notes });
    await notionClient.request(`/v1/pages/${reviewId}`, {
      method: "PATCH",
      body: {
        properties: {
          "AI Summary": { rich_text: [{ type: "text", text: { content: summary?.summary || "" } }] },
          "Action Recommendations": { rich_text: [{ type: "text", text: { content: (summary?.manager_actions || []).join(" ") || "" } }] },
          "Shared With Employee At": dateProperty(todayISO())
        }
      }
    });
    await sendSlackMessage({
      text: `Review summary posted for ${reviewId}. Action recommendations drafted.`,
      channel: process.env.SLACK_DEFAULT_CHANNEL
    }).catch(() => null);
    return { ok: true, type: "review", summary };
  }

  return { ok: false, skipped: true, reason: "Unknown kind" };
}
