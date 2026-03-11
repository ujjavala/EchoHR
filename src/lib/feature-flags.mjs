import { readFile } from "node:fs/promises";

const DEFAULT_FLAGS = {
  slack_notifications: true,
  ai_summaries: true,
  auto_candidate_applications: true,
  auto_onboarding_from_offer: true,
  feedback_sweep: true
};

let cachedFlags = null;

export async function loadFeatureFlags(path = process.env.FEATURE_FLAGS_PATH || "config/feature-flags.json") {
  if (cachedFlags) return cachedFlags;
  try {
    const text = await readFile(path, "utf8");
    const parsed = JSON.parse(text);
    cachedFlags = { ...DEFAULT_FLAGS, ...parsed };
  } catch {
    cachedFlags = { ...DEFAULT_FLAGS };
  }
  return cachedFlags;
}

export function setFeatureFlags(flags) {
  cachedFlags = { ...DEFAULT_FLAGS, ...flags };
  return cachedFlags;
}

export function getFeatureFlags() {
  return cachedFlags || { ...DEFAULT_FLAGS };
}

export function isFeatureEnabled(name, fallback = true) {
  const flags = getFeatureFlags();
  if (name in flags) return Boolean(flags[name]);
  return fallback;
}
