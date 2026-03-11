import { pageTitleProperty, selectProperty, dateProperty } from "../lib/notion.mjs";
import { pickTitle } from "../lib/feedback.mjs";
import { sendSlackMessage } from "../lib/slack.mjs";
import { isFeatureEnabled } from "../lib/feature-flags.mjs";

export const STATUS_FIELDS_BY_DB = {
  candidates: ["Candidate Status", "Stage"],
  applications: ["Application Status", "Pipeline Stage"],
  offers: ["Offer Status"],
  onboardingJourneys: ["Journey Status"],
  checkins: ["Status"],
  performanceReviews: ["Review Status"],
  offboardingCases: ["Status"],
  tasks: ["Status"],
  goals: ["Status"]
};

function collectStatusFields(dbKey, page) {
  const props = page.properties || {};
  const explicit = STATUS_FIELDS_BY_DB[dbKey] || [];
  const fields = explicit.length
    ? explicit
    : Object.entries(props)
        .filter(([, v]) => v?.type === "select" || v?.type === "status")
        .map(([name]) => name);
  const pieces = [];
  for (const name of fields) {
    const val = props[name]?.select?.name || props[name]?.status?.name;
    if (val) pieces.push(`${name}: ${val}`);
  }
  return pieces;
}

function statusMessage(dbKey, page) {
  const pieces = collectStatusFields(dbKey, page);
  if (!pieces.length) return null;
  return `${pickTitle(page)} — ${pieces.join(" · ")}`;
}

async function createApplicationFromCandidate(notionClient, state, candidatePageId) {
  const candidateDs = state.databases?.candidates?.dataSourceId;
  const applicationsDs = state.databases?.applications?.dataSourceId;
  const tasksDs = state.databases?.tasks?.dataSourceId;
  if (!candidateDs || !applicationsDs) return { ok: false, skipped: true, reason: "Missing data source IDs" };

  const candidate = await notionClient.request(`/v1/pages/${candidatePageId}`);
  const title = pickTitle(candidate);
  const relationProps = candidate.properties || {};
  const primaryRoleRel = relationProps["Primary Role"]?.relation || [];
  const stageOwnerRel = relationProps["Stage Owner"]?.relation || [];

  const appId = `APP-${Date.now().toString().slice(-6)}`;

  await notionClient.createRow({
    dataSourceId: applicationsDs,
    properties: {
      "Application ID": pageTitleProperty(appId),
      Candidate: { relation: [{ id: candidatePageId }] },
      Role: primaryRoleRel.length ? { relation: primaryRoleRel } : undefined,
      "Application Status": selectProperty("Active"),
      "Pipeline Stage": selectProperty("Applied"),
      "Applied Date": dateProperty(new Date().toISOString().slice(0, 10))
    }
  });

  if (tasksDs) {
    const dueInTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await notionClient.createRow({
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

async function createOnboardingFromAcceptedOffer(notionClient, state, offerPageId) {
  const offersDs = state.databases?.offers?.dataSourceId;
  const journeysDs = state.databases?.onboardingJourneys?.dataSourceId;
  const checkinsDs = state.databases?.checkins?.dataSourceId;
  if (!offersDs || !journeysDs || !checkinsDs) return { ok: false, skipped: true, reason: "Missing data source IDs" };

  const offer = await notionClient.request(`/v1/pages/${offerPageId}`);
  const candidateRel = offer.properties?.Candidate?.relation || [];
  const startDate = offer.properties?.["Start Date Proposed"]?.date?.start || new Date().toISOString().slice(0, 10);
  const title = pickTitle(offer);

  if (!candidateRel.length) return { ok: false, skipped: true, reason: "Offer missing Candidate relation" };

  const journeyTitle = `${title} - Onboarding`;
  const journey = await notionClient.createRow({
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

  const managerRel = offer.properties?.["Approval Owner"]?.relation || [];
  for (let month = 1; month <= 3; month += 1) {
    const due = new Date(startDate);
    due.setMonth(due.getMonth() + month - 1);
    const checkinDate = due.toISOString().slice(0, 10);
    await notionClient.createRow({
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

  return { ok: true, onboardingJourneyId: journey.id, offerTitle: title };
}

export async function processNotionWebhook(body, notionClient, state) {
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

    if (dsId === state.databases?.candidates?.dataSourceId && event?.type === "page_created") {
      if (!isFeatureEnabled("auto_candidate_applications", true)) {
        results.push({ ok: true, skipped: true, reason: "auto_candidate_applications disabled" });
        continue;
      }
      const res = await createApplicationFromCandidate(notionClient, state, pageId);
      results.push(res);
      await sendSlackMessage({
        text: `New candidate processed: ${res.candidateTitle}. Application created (${res.createdApplicationId}). SLA task added for stage owner.`,
        channel: process.env.SLACK_DEFAULT_CHANNEL
      }).catch(() => null);
      continue;
    }

    if (dsId === state.databases?.offers?.dataSourceId) {
      if (!isFeatureEnabled("auto_onboarding_from_offer", true)) {
        results.push({ ok: true, skipped: true, reason: "auto_onboarding_from_offer disabled" });
        continue;
      }
      const offer = await notionClient.request(`/v1/pages/${pageId}`);
      const status = offer.properties?.["Offer Status"]?.select?.name || "";
      if (status === "Accepted") {
        const res = await createOnboardingFromAcceptedOffer(notionClient, state, pageId);
        results.push(res);
        await sendSlackMessage({
          text: `Offer accepted: ${res.offerTitle}. Onboarding journey created and first 3 monthly check-ins scheduled.`,
          channel: process.env.SLACK_DEFAULT_CHANNEL
        }).catch(() => null);
        continue;
      }
    }

    // Status change notifications across lifecycle
    if (event?.type === "page_updated") {
      const dbKey = Object.keys(state.databases || {}).find((k) => state.databases[k].dataSourceId === dsId);
      if (dbKey) {
        const page = await notionClient.request(`/v1/pages/${pageId}`);
        const msg = statusMessage(dbKey, page);
        if (msg) {
          await sendSlackMessage({
            text: `Status update (${dbKey}): ${msg}`,
            channel: process.env.SLACK_DEFAULT_CHANNEL
          }).catch(() => null);
          results.push({ ok: true, notified: true, db: dbKey, pageId });
          continue;
        }
      }
    }

    results.push({ ok: true, skipped: true, reason: "No matching automation" });
  }
  return results;
}
