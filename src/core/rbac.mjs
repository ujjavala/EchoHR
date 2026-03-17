const ROLE_FLAGS = {
  recruiter: ["slack_notifications", "auto_candidate_applications"],
  manager: ["slack_notifications"],
  hr: ["slack_notifications", "auto_onboarding_from_offer", "feedback_sweep"],
  admin: ["slack_notifications", "ai_summaries", "auto_candidate_applications", "auto_onboarding_from_offer", "feedback_sweep"]
};

export function rbacAllows(role, flag) {
  if (!role) return true;
  if (role === "admin") return true;
  return ROLE_FLAGS[role]?.includes(flag) ?? false;
}
