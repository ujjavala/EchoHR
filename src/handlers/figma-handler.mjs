import { buildReviewTaskProps, todayISO } from "../lib/feedback.mjs";
import { sendSlackMessage } from "../lib/slack.mjs";

export async function handleFigmaWebhook(body, state, notionClient) {
  const events = body?.events || (body?.event ? [body.event] : [body]).filter(Boolean);
  const results = [];
  const tasksDs = state.databases?.tasks?.dataSourceId;
  if (!tasksDs) return [{ ok: false, skipped: true, reason: "Missing Tasks data source ID" }];

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

    const due = todayISO();
    const task = await notionClient.createRow({
      dataSourceId: tasksDs,
      properties: buildReviewTaskProps({ title: `Review: ${nodeId || fileKey}`, dueDate: due, fileUrl })
    });

    await sendSlackMessage({
      text: `Created review task from Figma: ${task.url || task.id}\nComment: ${message}`,
      channel: process.env.SLACK_DEFAULT_CHANNEL
    }).catch(() => null);

    results.push({ ok: true, taskUrl: task.url || task.id });
  }
  return results;
}
