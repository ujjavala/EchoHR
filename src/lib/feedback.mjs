import { pageTitleProperty, selectProperty, dateProperty } from "./notion.mjs";
import { TASK_PRIORITY, TASK_STATUS, TASK_TYPES } from "./constants.mjs";

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function buildReviewTaskProps({ title, dueDate, fileUrl }) {
  return {
    Task: pageTitleProperty(title),
    "Task Type": selectProperty(TASK_TYPES.REVIEW),
    "Due Date": dateProperty(dueDate),
    Status: selectProperty(TASK_STATUS.NOT_STARTED),
    Priority: selectProperty(TASK_PRIORITY.HIGH),
    "Empathy Note": {
      rich_text: [
        { type: "text", text: { content: "From Figma comment tagged Ready for Review." } },
        { type: "text", text: { content: ` ${fileUrl}` } }
      ]
    }
  };
}

export function pickTitle(page) {
  const titleKey = Object.keys(page.properties || {}).find((k) => page.properties[k].type === "title");
  if (!titleKey) return "Untitled";
  return (page.properties[titleKey].title || []).map((t) => t.plain_text || "").join("");
}

export function getRelationIds(page, prop) {
  return page?.properties?.[prop]?.relation?.map((r) => r.id) || [];
}
