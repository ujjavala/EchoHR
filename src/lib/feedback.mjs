import { pageTitleProperty, selectProperty, dateProperty } from "./notion.mjs";

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function buildReviewTaskProps({ title, dueDate, fileUrl }) {
  return {
    Task: pageTitleProperty(title),
    "Task Type": selectProperty("Review"),
    "Due Date": dateProperty(dueDate),
    Status: selectProperty("Not Started"),
    Priority: selectProperty("High"),
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
