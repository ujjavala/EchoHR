const COLORS = ["blue", "green", "orange", "red", "yellow", "pink", "brown", "gray", "default"];

function colorFor(index) {
  return COLORS[index % COLORS.length];
}

function title() {
  return { type: "title", title: {} };
}

function text() {
  return { type: "rich_text", rich_text: {} };
}

function email() {
  return { type: "email", email: {} };
}

function url() {
  return { type: "url", url: {} };
}

function date() {
  return { type: "date", date: {} };
}

function checkbox() {
  return { type: "checkbox", checkbox: {} };
}

function people() {
  return { type: "people", people: {} };
}

function number(format = "number") {
  return {
    type: "number",
    number: {
      format
    }
  };
}

function select(options) {
  return {
    type: "select",
    select: {
      options: options.map((name, index) => ({
        name,
        color: colorFor(index)
      }))
    }
  };
}

function multiSelect(options) {
  return {
    type: "multi_select",
    multi_select: {
      options: options.map((name, index) => ({
        name,
        color: colorFor(index)
      }))
    }
  };
}

function formula(expression) {
  return {
    type: "formula",
    formula: {
      expression
    }
  };
}

export const sections = [
  {
    key: "hiring",
    title: "Hiring Command Center",
    icon: "🎯",
    description: "Candidate pipeline, interviews, offers, and the no-ghosting guardrail."
  },
  {
    key: "onboarding",
    title: "Onboarding Hub",
    icon: "🚀",
    description: "Preboarding, buddy assignment, and first 90-day momentum."
  },
  {
    key: "growth",
    title: "Growth & Reviews",
    icon: "📈",
    description: "Check-ins, reviews, promotions, and compensation."
  },
  {
    key: "culture",
    title: "Culture & Engagement",
    icon: "🎉",
    description: "Recognition, pulse surveys, anniversaries, and support signals."
  },
  {
    key: "offboarding",
    title: "Offboarding & Alumni",
    icon: "🌱",
    description: "Resignations, knowledge transfer, exit insight, and alumni tracking."
  },
  {
    key: "automation",
    title: "Automation Ops",
    icon: "⚙️",
    description: "Workflow playbooks, prompts, and operational visibility."
  }
];

export const databases = [
  {
    key: "people",
    title: "People",
    section: "hiring",
    icon: "🧑",
    description: "Master directory for candidates, employees, managers, buddies, and alumni.",
    properties: {
      Name: title(),
      "Person ID": formula('"PENDING"'),
      "Work Email": email(),
      "Personal Email": email(),
      "Slack User ID": text(),
      "Lifecycle Type": select(["Candidate", "Employee", "Manager", "Interviewer", "Buddy", "Alumni"]),
      "Employment Status": select(["Prospect", "Active", "Leave", "Exited"]),
      "Job Title": text(),
      "Org Layer": select(["Founder", "Executive", "Director", "Manager", "IC", "Candidate", "Alumni"]),
      Department: select(["Eng", "Product", "Design", "Sales", "Ops", "Other"]),
      Team: select(["Platform", "Product", "Growth", "Revenue", "Operations", "Other"]),
      Location: select(["Sydney", "Remote APAC", "Remote US", "Remote EU", "Other"]),
      "Start Date": date(),
      "End Date": date(),
      "Birth Date": date(),
      "Work Anniversary Month": formula('""'),
      "Tenure (Months)": formula('0'),
      "Portal URL": url(),
      Notes: text()
    }
  },
  {
    key: "roles",
    title: "Roles",
    section: "hiring",
    icon: "🧩",
    description: "Open roles, interview plans, and hiring ownership.",
    properties: {
      "Role Name": title(),
      "Role ID": formula('"ROLE"'),
      Department: select(["Eng", "Product", "Design", "Sales", "Ops", "Other"]),
      Level: select(["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"]),
      "Employment Type": select(["Full-time", "Contract", "Intern"]),
      Location: multiSelect(["Sydney", "Remote APAC", "Remote US", "Remote EU"]),
      "Hiring Status": select(["Draft", "Open", "On Hold", "Closed"]),
      "Open Date": date(),
      "Target Fill Date": date(),
      "Interview Plan": text(),
      "Stage SLA Days": number(),
      "Offer Approval Required": checkbox()
    }
  },
  {
    key: "templates",
    title: "Templates & Playbooks",
    section: "automation",
    icon: "📚",
    description: "Message, checklist, and playbook content used across EchoHR.",
    properties: {
      "Template Name": title(),
      "Template Type": select(["Offer Letter", "Email", "Slack", "Checklist", "Review", "Survey"]),
      Audience: select(["Candidate", "Employee", "Manager", "HR"]),
      "Trigger Event": select(["Application Received", "Interview Scheduled", "Offer Sent", "Start Date Set", "Review Due", "Exit Logged"]),
      Subject: text(),
      Body: text(),
      Active: checkbox()
    }
  },
  {
    key: "candidates",
    title: "Candidates",
    section: "hiring",
    icon: "💼",
    description: "Candidate records with stage visibility and update commitments.",
    properties: {
      "Candidate Name": title(),
      "Candidate Status": select(["Applied", "Screening", "Interviewing", "Offer", "Hired", "Rejected", "Withdrawn"]),
      Stage: select(["Applied", "Recruiter Screen", "Manager Screen", "Panel", "Decision", "Offer", "Closed"]),
      "Applied On": date(),
      "Last Update Sent": date(),
      "Next Update Due": formula('now()'),
      "Deadline Status": formula('"On track"'),
      "Candidate Experience Promise": formula('"Next update committed"'),
      "Candidate Portal Link": url(),
      Source: select(["Referral", "LinkedIn", "Careers Page", "Agency", "Event", "Other"]),
      Sentiment: select(["Positive", "Neutral", "Concerned"]),
      "Rejection Reason": select(["Skill mismatch", "Timing", "Compensation", "Other"]),
      "Personalized Next Step": text()
    }
  },
  {
    key: "applications",
    title: "Applications",
    section: "hiring",
    icon: "🗂️",
    description: "Application-level pipeline for multi-role flexibility and AI feedback.",
    properties: {
      "Application ID": title(),
      "Application Status": select(["Active", "Offer", "Hired", "Rejected", "Withdrawn"]),
      "Pipeline Stage": select(["Applied", "Screen", "Interview Loop", "Final Review", "Offer", "Closed"]),
      "Stage Order": formula('0'),
      "Applied Date": date(),
      "Resume URL": url(),
      "Portfolio URL": url(),
      "Scheduler Link": url(),
      "AI Feedback Summary": text(),
      "Decision Recommendation": select(["Strong Yes", "Yes", "Mixed", "No", "Strong No"]),
      "Decision Due": formula('now()'),
      "Candidate Message Draft": text(),
      "Ghosting Risk": formula('"Low"')
    }
  },
  {
    key: "interviews",
    title: "Interviews",
    section: "hiring",
    icon: "🎙️",
    description: "Interview scheduling, feedback capture, and AI summaries.",
    properties: {
      "Interview Title": title(),
      "Interview Type": select(["Recruiter", "Hiring Manager", "Technical", "Case", "Panel", "Culture"]),
      "Scheduled For": date(),
      "Calendar Event ID": text(),
      "Meeting Link": url(),
      Status: select(["To Schedule", "Scheduled", "Completed", "Cancelled", "No Show"]),
      Score: number(),
      Strengths: text(),
      Concerns: text(),
      Recommendation: select(["Strong Yes", "Yes", "Mixed", "No", "Strong No"]),
      "Feedback Submitted At": date(),
      "Feedback SLA": formula('now()'),
      "Feedback On Time": formula('false'),
      "AI Summary": text(),
      "Candidate-safe Summary": text()
    }
  },
  {
    key: "offers",
    title: "Offers",
    section: "hiring",
    icon: "✉️",
    description: "Offer generation, approval, and acceptance tracking.",
    properties: {
      "Offer ID": title(),
      "Offer Status": select(["Draft", "Internal Approval", "Sent", "Negotiation", "Accepted", "Declined", "Expired"]),
      "Compensation Band": text(),
      "Base Salary": number("dollar"),
      Equity: text(),
      Bonus: number("dollar"),
      "Start Date Proposed": date(),
      "Offer Document URL": url(),
      "Sent At": date(),
      "Response Due": date(),
      "Days Until Response": formula('0'),
      "Candidate Questions": text(),
      Notes: text()
    }
  },
  {
    key: "onboardingJourneys",
    title: "Onboarding Journeys",
    section: "onboarding",
    icon: "🧭",
    description: "New hire visibility, buddy support, and first-month momentum.",
    properties: {
      "Journey Name": title(),
      "Start Date": date(),
      "Journey Status": select(["Preboarding", "Week 1", "Month 1", "Month 2", "Month 3", "Completed", "Blocked"]),
      "Personal Goals": text(),
      "Intro Message": text(),
      "New Hire Portal": url(),
      "Health Status": formula('"On track"')
    }
  },
  {
    key: "checkins",
    title: "Check-ins",
    section: "growth",
    icon: "🗓️",
    description: "30, 60, 90-day and recurring employee check-ins.",
    properties: {
      "Check-in Name": title(),
      "Check-in Type": select(["30-day", "60-day", "90-day", "Monthly", "Quarterly", "Stay Interview"]),
      "Scheduled Date": date(),
      Status: select(["Planned", "Completed", "Rescheduled", "Missed"]),
      "Employee Wins": text(),
      "Employee Challenges": text(),
      "Support Needed": text(),
      "Mood Score": number(),
      "AI Summary": text(),
      "Next Actions": text(),
      "Visibility Note": formula('"Visible"')
    }
  },
  {
    key: "performanceReviews",
    title: "Performance Reviews",
    section: "growth",
    icon: "📝",
    description: "Self reviews, manager reviews, calibration, and AI-assisted summaries.",
    properties: {
      "Review Name": title(),
      "Review Cycle": select(["Q1", "Q2", "Q3", "Q4", "Annual"]),
      "Review Status": select(["Draft", "Self Review", "Manager Review", "Calibration", "Shared", "Closed"]),
      "Review Due Date": date(),
      "Self Review": text(),
      "Manager Review": text(),
      "Peer Inputs": text(),
      "Linked Goal Progress %": number("percent"),
      "Achievements Snapshot": text(),
      "Goal Progress": number("percent"),
      Rating: number(),
      "Promotion Recommendation": select(["No", "Watchlist", "Yes"]),
      "AI Summary": text(),
      "Action Recommendations": text(),
      "Shared With Employee At": date(),
      "Review Readiness": formula('"On track"')
    }
  },
  {
    key: "goals",
    title: "Goals",
    section: "growth",
    icon: "🎯",
    description: "Employee goals tied to check-ins, reviews, and compensation decisions.",
    properties: {
      "Goal Title": title(),
      "Cycle": select(["Q1", "Q2", "Q3", "Q4", "Annual", "Onboarding"]),
      Category: select(["Business", "Growth", "Behavior", "Project", "Onboarding"]),
      Status: select(["Draft", "Active", "At Risk", "Completed", "Dropped"]),
      "Start Date": date(),
      "Due Date": date(),
      "Success Metric": text(),
      "Progress %": number("percent"),
      "Manager Notes": text(),
      "Employee Update": text(),
      "AI Coaching Note": text(),
      "Needs Feedback By": formula('now()'),
      "Feedback Status": formula('"On track"')
    }
  },
  {
    key: "achievements",
    title: "Achievements",
    section: "growth",
    icon: "🏆",
    description: "Evidence-backed achievements linked to goals, reviews, and appraisals.",
    properties: {
      "Achievement Title": title(),
      Type: select(["Delivery", "Leadership", "Customer Impact", "Process Improvement", "Learning", "Recognition"]),
      "Achievement Date": date(),
      Impact: select(["Low", "Medium", "High", "Strategic"]),
      Summary: text(),
      Evidence: text(),
      "Manager Validation": select(["Pending", "Validated", "Needs Detail"]),
      "AI Summary": text(),
      "Promotion Evidence": checkbox()
    }
  },
  {
    key: "compensationEvents",
    title: "Compensation Events",
    section: "growth",
    icon: "💸",
    description: "Salary reviews, promotions, and compensation approvals.",
    properties: {
      "Event Name": title(),
      "Event Type": select(["Salary Review", "Promotion", "Spot Bonus", "Equity Refresh"]),
      "Effective Date": date(),
      "Current Level": text(),
      "Proposed Level": text(),
      "Current Salary": number("dollar"),
      "Proposed Salary": number("dollar"),
      "Change %": formula('0'),
      "Business Case": text(),
      "Approval Status": select(["Draft", "Manager Approved", "Finance Approved", "People Approved", "Finalized", "Declined"]),
      "Notification Status": select(["Pending", "Sent"])
    }
  },
  {
    key: "recognition",
    title: "Recognition",
    section: "culture",
    icon: "👏",
    description: "Peer recognition and culture signals.",
    properties: {
      "Recognition Title": title(),
      Category: select(["Customer Love", "Teamwork", "Craft", "Leadership", "Ownership"]),
      Message: text(),
      Date: date(),
      "Shared in Slack": checkbox()
    }
  },
  {
    key: "pulseSurveys",
    title: "Pulse Surveys",
    section: "culture",
    icon: "💓",
    description: "Engagement signals and AI theme extraction.",
    properties: {
      "Survey Response": title(),
      "Survey Type": select(["Weekly Pulse", "Monthly Pulse", "Onboarding Pulse", "Exit Pulse"]),
      "Submitted At": date(),
      "eNPS Style Score": number(),
      "Energy Score": number(),
      "Clarity Score": number(),
      "Support Score": number(),
      "Free Text": text(),
      "AI Theme Summary": text(),
      "Follow-up Needed": formula('false')
    }
  },
  {
    key: "knowledgeTransfers",
    title: "Knowledge Transfers",
    section: "offboarding",
    icon: "📤",
    description: "Knowledge handover before an employee leaves.",
    properties: {
      "Transfer Title": title(),
      "Systems Owned": text(),
      "Key Contacts": text(),
      "Open Risks": text(),
      "Documents Linked": url(),
      Status: select(["Draft", "In Review", "Complete"]),
      "AI Summary": text()
    }
  },
  {
    key: "offboardingCases",
    title: "Offboarding Cases",
    section: "offboarding",
    icon: "👋",
    description: "Resignation, access removal, exit insight, and alumni handoff.",
    properties: {
      "Case Name": title(),
      "Offboarding Type": select(["Resignation", "Mutual Separation", "End of Contract"]),
      "Notice Received": date(),
      "Last Working Day": date(),
      Status: select(["Open", "Knowledge Capture", "Exit Interview", "Access Removal", "Complete"]),
      "Reason Category": select(["Growth", "Compensation", "Manager", "Relocation", "Personal", "Other"]),
      "AI Exit Summary": text(),
      "Alumni Eligible": checkbox()
    }
  },
  {
    key: "alumni",
    title: "Alumni",
    section: "offboarding",
    icon: "🌿",
    description: "Former employee relationship tracking.",
    properties: {
      "Alumni Name": title(),
      "Exit Date": date(),
      "Last Role": text(),
      "Rehire Eligible": checkbox(),
      "Alumni Group Joined": checkbox(),
      "Last Touchpoint": date(),
      Notes: text()
    }
  },
  {
    key: "tasks",
    title: "Tasks",
    section: "onboarding",
    icon: "✅",
    description: "Cross-lifecycle tasks for hiring, onboarding, reviews, and offboarding.",
    properties: {
      Task: title(),
      "Task Type": select(["Hiring", "Offer", "Onboarding", "Review", "Compensation", "Offboarding", "Engagement"]),
      "Due Date": date(),
      Status: select(["Not Started", "In Progress", "Waiting", "Done", "Cancelled"]),
      Priority: select(["High", "Medium", "Low"]),
      "Auto-created": checkbox(),
      "Empathy Note": text(),
      "SLA Status": formula('"On track"')
    }
  },
  {
    key: "automationLog",
    title: "Automation Log",
    section: "automation",
    icon: "📟",
    description: "Operational visibility for automation runs.",
    properties: {
      "Run Name": title(),
      Workflow: select(["Hiring Update", "Interview Reminder", "Offer Send", "Onboarding Kickoff", "Check-in Generator", "Review Summary", "Offboarding Start", "Culture Reminder"]),
      "Entity Type": select(["Candidate", "Application", "Interview", "Employee", "Review", "Offboarding"]),
      "Entity ID": text(),
      "Triggered At": date(),
      Result: select(["Success", "Warning", "Error"]),
      Details: text()
    }
  }
];

export const relationPatches = [
  { db: "people", property: "Manager", target: "people", synced: "Direct Reports" },
  { db: "people", property: "Buddy", target: "people", synced: "Buddy For" },
  { db: "roles", property: "Hiring Manager", target: "people", synced: "Open Roles" },
  { db: "roles", property: "Recruiter", target: "people", synced: "Recruiting Roles" },
  { db: "candidates", property: "Person", target: "people", synced: "Candidate Profile" },
  { db: "candidates", property: "Primary Role", target: "roles", synced: "Candidates" },
  { db: "candidates", property: "Stage Owner", target: "people", synced: "Owned Candidates" },
  { db: "applications", property: "Candidate", target: "candidates", synced: "Applications" },
  { db: "applications", property: "Role", target: "roles", synced: "Applications" },
  { db: "interviews", property: "Application", target: "applications", synced: "Interviews" },
  { db: "interviews", property: "Interviewer", target: "people", synced: "Interviews" },
  { db: "interviews", property: "Coordinator", target: "people", synced: "Coordinated Interviews" },
  { db: "offers", property: "Candidate", target: "candidates", synced: "Offers" },
  { db: "offers", property: "Application", target: "applications", synced: "Offers" },
  { db: "offers", property: "Approval Owner", target: "people", synced: "Approving Offers" },
  { db: "offers", property: "Offer Letter Template", target: "templates", synced: "Offer Usage" },
  { db: "onboardingJourneys", property: "Employee", target: "people", synced: "Onboarding Journeys" },
  { db: "checkins", property: "Employee", target: "people", synced: "Check-ins" },
  { db: "checkins", property: "Manager", target: "people", synced: "Managed Check-ins" },
  { db: "goals", property: "Employee", target: "people", synced: "Goals" },
  { db: "goals", property: "Manager", target: "people", synced: "Managed Goals" },
  { db: "goals", property: "Review", target: "performanceReviews", synced: "Goals" },
  { db: "goals", property: "Compensation Event", target: "compensationEvents", synced: "Goals" },
  { db: "goals", property: "Check-in", target: "checkins", synced: "Goals" },
  { db: "achievements", property: "Employee", target: "people", synced: "Achievements" },
  { db: "achievements", property: "Goal", target: "goals", synced: "Achievements" },
  { db: "achievements", property: "Review", target: "performanceReviews", synced: "Achievements" },
  { db: "achievements", property: "Compensation Event", target: "compensationEvents", synced: "Achievements" },
  { db: "performanceReviews", property: "Employee", target: "people", synced: "Performance Reviews" },
  { db: "performanceReviews", property: "Compensation Event", target: "compensationEvents", synced: "Review Basis" },
  { db: "compensationEvents", property: "Employee", target: "people", synced: "Compensation Events" },
  { db: "compensationEvents", property: "Approval Owner", target: "people", synced: "Compensation Approvals" },
  { db: "recognition", property: "From", target: "people", synced: "Recognition Given" },
  { db: "recognition", property: "To", target: "people", synced: "Recognition Received" },
  { db: "pulseSurveys", property: "Employee", target: "people", synced: "Pulse Responses" },
  { db: "knowledgeTransfers", property: "Employee", target: "people", synced: "Knowledge Transfers" },
  { db: "knowledgeTransfers", property: "Successor", target: "people", synced: "Knowledge Successor" },
  { db: "offboardingCases", property: "Employee", target: "people", synced: "Offboarding Cases" },
  { db: "offboardingCases", property: "Exit Survey", target: "pulseSurveys", synced: "Offboarding Case" },
  { db: "offboardingCases", property: "Knowledge Transfer", target: "knowledgeTransfers", synced: "Offboarding Case" },
  { db: "alumni", property: "Person", target: "people", synced: "Alumni Profile" },
  { db: "tasks", property: "Related Person", target: "people", synced: "Tasks" },
  { db: "tasks", property: "Candidate", target: "candidates", synced: "Tasks" },
  { db: "tasks", property: "Journey", target: "onboardingJourneys", synced: "Tasks" },
  { db: "tasks", property: "Review", target: "performanceReviews", synced: "Tasks" },
  { db: "tasks", property: "Offboarding Case", target: "offboardingCases", synced: "Tasks" },
  { db: "tasks", property: "Owner", target: "people", synced: "Owned Tasks" }
];

export const rollupPatches = [
  { db: "roles", property: "Candidate Count", relation: "Candidates", target: "candidates", rollup: "Candidate Name", fn: "count_values" },
  { db: "people", property: "Linked Tasks", relation: "Tasks", target: "tasks", rollup: "Task", fn: "count_values" },
  { db: "people", property: "Owned Tasks Count", relation: "Owned Tasks", target: "tasks", rollup: "Task", fn: "count_values" },
  { db: "people", property: "Linked Check-ins", relation: "Check-ins", target: "checkins", rollup: "Check-in Name", fn: "count_values" },
  { db: "people", property: "Goal Count", relation: "Goals", target: "goals", rollup: "Goal Title", fn: "count_values" },
  { db: "people", property: "Achievement Count", relation: "Achievements", target: "achievements", rollup: "Achievement Title", fn: "count_values" },
  { db: "performanceReviews", property: "Linked Goal Progress %", relation: "Goals", target: "goals", rollup: "Progress %", fn: "average" },
  { db: "performanceReviews", property: "Achievements Count", relation: "Achievements", target: "achievements", rollup: "Achievement Title", fn: "count_values" },
  { db: "compensationEvents", property: "Achievements Count", relation: "Achievements", target: "achievements", rollup: "Achievement Title", fn: "count_values" },
  { db: "people", property: "Latest Review Score", relation: "Performance Reviews", target: "performanceReviews", rollup: "Rating", fn: "max" },
  { db: "people", property: "Engagement Score", relation: "Pulse Responses", target: "pulseSurveys", rollup: "Support Score", fn: "average" },
  { db: "onboardingJourneys", property: "Task Count", relation: "Tasks", target: "tasks", rollup: "Task", fn: "count_values" },
  { db: "offboardingCases", property: "Task Count", relation: "Tasks", target: "tasks", rollup: "Task", fn: "count_values" }
];

export const seededTemplates = [
  {
    name: "Candidate - Application Acknowledgement",
    type: "Email",
    audience: "Candidate",
    trigger: "Application Received",
    subject: "We received your EchoHR application",
    body: "Thank you for applying. You are now in review, and we will update you with next steps within three business days.",
    content: [
      "Stage: Applied",
      "Promise: no ghosting, clear timelines, and timely feedback.",
      "Next step: recruiter review and scheduling or written update."
    ]
  },
  {
    name: "Candidate - Interview Scheduled",
    type: "Email",
    audience: "Candidate",
    trigger: "Interview Scheduled",
    subject: "Your EchoHR interview is scheduled",
    body: "Your interview is scheduled. This page should always show who you are meeting, what to expect, and when you will hear from us next.",
    content: [
      "Include interviewer names and roles.",
      "State expected feedback timeline.",
      "Add preparation resources and contact point."
    ]
  },
  {
    name: "Candidate - Rejection With Feedback",
    type: "Email",
    audience: "Candidate",
    trigger: "Interview Scheduled",
    subject: "Thank you for your time with EchoHR",
    body: "Thank you for the time and thought you put into the process. We are not moving forward for this role, and we do not want to leave you guessing. Concise feedback is included below.",
    content: [
      "What stood out positively",
      "Why the fit was not right right now",
      "Whether future roles may be a fit"
    ]
  },
  {
    name: "Offer - Standard Full-Time",
    type: "Offer Letter",
    audience: "Candidate",
    trigger: "Offer Sent",
    subject: "Your EchoHR offer",
    body: "This template includes role title, team, manager, start date, compensation summary, benefits snapshot, and acceptance deadline.",
    content: [
      "Role and reporting line",
      "Start date",
      "Compensation and benefits",
      "Acceptance instructions"
    ]
  },
  {
    name: "Onboarding - New Hire Portal",
    type: "Checklist",
    audience: "Employee",
    trigger: "Start Date Set",
    subject: "Welcome to EchoHR",
    body: "Use this portal to track your first-week tasks, buddy, schedule, and check-ins.",
    content: [
      "Welcome note from manager",
      "Buddy introduction",
      "Week 1 schedule",
      "30/60/90-day plan"
    ]
  },
  {
    name: "Review - Quarterly Performance",
    type: "Review",
    audience: "Manager",
    trigger: "Review Due",
    subject: "Quarterly performance review",
    body: "Capture goals, wins, challenges, collaboration feedback, growth areas, and requested support.",
    content: [
      "Self review prompt",
      "Manager review prompt",
      "AI summary prompt",
      "Action plan section"
    ]
  },
  {
    name: "Survey - Exit Interview",
    type: "Survey",
    audience: "Employee",
    trigger: "Exit Logged",
    subject: "Exit interview guide",
    body: "Capture departure reasons, support experience, improvement opportunities, and knowledge transfer needs.",
    content: [
      "Why are you leaving",
      "What would have made you stay",
      "What should we improve",
      "Alumni interest"
    ]
  }
];

export const automationPlaybooks = [
  {
    title: "Workflow 1 - Application Received",
    summary: "Instant acknowledgement, ownership assignment, and no-ghosting timer start.",
    steps: [
      "Trigger on new candidate form or Candidates row.",
      "Create or update People row.",
      "Create Applications row and set Last Update Sent.",
      "Send candidate acknowledgement email.",
      "Post recruiter Slack alert.",
      "Write Automation Log entry."
    ]
  },
  {
    title: "Workflow 2 - Candidate Update Guardrail",
    summary: "Daily check for update due soon or overdue candidates.",
    steps: [
      "Run every morning.",
      "Find candidates with Deadline Status equal to Update due soon or Update overdue.",
      "Draft a candidate-safe update message.",
      "DM the stage owner in Slack.",
      "Optionally auto-send generic stage updates."
    ]
  },
  {
    title: "Workflow 3 - Interview Reminder and Summary",
    summary: "Prep everyone before the interview and summarize feedback after.",
    steps: [
      "Send 24-hour candidate reminder with agenda and participants.",
      "Send interviewer prep packet.",
      "Collect feedback after the interview.",
      "Chase missing feedback after the SLA.",
      "Run OpenAI summary into the Applications AI Feedback Summary field."
    ]
  },
  {
    title: "Workflow 4 - Accepted Offer to Onboarding Kickoff",
    summary: "Convert candidate to employee and generate onboarding in one pass.",
    steps: [
      "Update People lifecycle type to Employee.",
      "Create Onboarding Journey.",
      "Assign buddy.",
      "Generate onboarding tasks.",
      "Create 30, 60, 90-day and monthly check-ins.",
      "Send welcome communications."
    ]
  },
  {
    title: "Workflow 5 - Performance Review Summary",
    summary: "Create reviews, pull linked goals and achievements, summarize, and suggest actions.",
    steps: [
      "Create review rows on cycle start.",
      "Attach current goals and validated achievements for each employee.",
      "Assign self-review and manager-review tasks.",
      "Remind owners before due dates.",
      "Summarize self, peer, manager, goal progress, and achievement evidence with OpenAI.",
      "Publish recommended actions, promotion flags, and appraisal guidance."
    ]
  },
  {
    title: "Workflow 6 - Resignation to Offboarding",
    summary: "Launch a respectful offboarding checklist and capture insight.",
    steps: [
      "Create Offboarding Case and linked tasks.",
      "Create knowledge transfer page.",
      "Schedule exit interview.",
      "Summarize exit notes with OpenAI.",
      "Create alumni row if eligible."
    ]
  }
];

export const demoSeed = {
  people: {
    founderCeo: { name: "Aarav Mehta", lifecycle: "Manager", status: "Active", orgLayer: "Founder", title: "Co-Founder & CEO", department: "Ops", team: "Operations", location: "Sydney", email: "aarav@echohr.demo", startDate: "2024-01-08" },
    founderCto: { name: "Nina Brooks", lifecycle: "Manager", status: "Active", orgLayer: "Founder", title: "Co-Founder & CTO", department: "Eng", team: "Platform", location: "Sydney", email: "nina@echohr.demo", startDate: "2024-01-08" },
    headPeople: { name: "Jordan Lee", lifecycle: "Manager", status: "Active", orgLayer: "Executive", title: "Head of People", department: "Ops", team: "Operations", location: "Sydney", email: "jordan@echohr.demo", startDate: "2025-01-10" },
    manager: { name: "Maya Chen", lifecycle: "Manager", status: "Active", orgLayer: "Director", title: "Director of Product", department: "Product", team: "Product", location: "Sydney", email: "maya@echohr.demo", startDate: "2024-04-15" },
    engLead: { name: "Marcus Hill", lifecycle: "Manager", status: "Active", orgLayer: "Executive", title: "VP Engineering", department: "Eng", team: "Platform", location: "Sydney", email: "marcus@echohr.demo", startDate: "2024-05-01" },
    designLead: { name: "Tessa Morgan", lifecycle: "Manager", status: "Active", orgLayer: "Director", title: "Head of Design", department: "Design", team: "Product", location: "Sydney", email: "tessa@echohr.demo", startDate: "2024-07-15" },
    salesLead: { name: "Elena Torres", lifecycle: "Manager", status: "Active", orgLayer: "Executive", title: "VP Sales", department: "Sales", team: "Revenue", location: "Sydney", email: "elena@echohr.demo", startDate: "2024-06-10" },
    recruiter: { name: "Priya Shah", lifecycle: "Employee", status: "Active", orgLayer: "IC", title: "Talent Partner", department: "Ops", team: "Operations", location: "Sydney", email: "priya@echohr.demo", startDate: "2025-05-12" },
    buddy: { name: "Ravi Singh", lifecycle: "Buddy", status: "Active", orgLayer: "IC", title: "Staff Engineer", department: "Eng", team: "Platform", location: "Remote APAC", email: "ravi@echohr.demo", startDate: "2025-11-04" },
    employee: { name: "Lena Park", lifecycle: "Employee", status: "Active", orgLayer: "IC", title: "Product Operations Manager", department: "Product", team: "Product", location: "Sydney", email: "lena@echohr.demo", startDate: "2026-02-03" },
    candidate: { name: "Asha Patel", lifecycle: "Candidate", status: "Prospect", orgLayer: "Candidate", title: "Senior Product Designer", department: "Design", team: "Product", location: "Sydney", email: "asha@example.com" },
    exiting: { name: "Omar Hassan", lifecycle: "Alumni", status: "Exited", orgLayer: "Alumni", title: "People Operations Specialist", department: "Ops", team: "Operations", location: "Sydney", email: "omar@example.com", startDate: "2024-02-05" },
    alumni: { name: "Omar Hassan" }
  },
  role: {
    title: "Senior Product Designer",
    department: "Design",
    level: "L5",
    type: "Full-time",
    location: ["Sydney", "Remote APAC"],
    status: "Open",
    openDate: "2026-03-01",
    targetFillDate: "2026-04-15",
    interviewPlan: "Recruiter screen -> Hiring manager -> Panel -> Decision",
    stageSlaDays: 3
  },
  candidate: {
    name: "Asha Patel",
    appliedOn: "2026-03-03",
    lastUpdateSent: "2026-03-09",
    interviewDate: "2026-03-12",
    portalUrl: "https://example.com/candidate/asha",
    resumeUrl: "https://example.com/resume/asha",
    portfolioUrl: "https://example.com/portfolio/asha",
    schedulerUrl: "https://example.com/schedule/asha",
    meetingUrl: "https://meet.google.com/demo-asha",
    nextStep: "Panel interview this week, then a decision update within 48 hours.",
    aiSummary: "Panel is optimistic. Candidate communicates clearly and demonstrates good systems thinking.",
    messageDraft: "You are in the panel stage. We will share a clear next update within 48 hours after the final interview."
  },
  goals: [
    {
      title: "Reduce onboarding friction for new hires",
      cycle: "Q1",
      category: "Project",
      status: "Active",
      startDate: "2026-02-03",
      dueDate: "2026-03-31",
      successMetric: "Cut setup questions in the first two weeks by 30%",
      progress: 0.8,
      employeeUpdate: "Published improved onboarding docs and reduced repeated setup questions.",
      managerNotes: "Strong evidence of leverage across the team.",
      aiCoaching: "Next step is to quantify time saved and socialize the changes more broadly."
    },
    {
      title: "Improve review process clarity",
      cycle: "Q1",
      category: "Growth",
      status: "Active",
      startDate: "2026-02-15",
      dueDate: "2026-03-31",
      successMetric: "Document examples and guidance for product review participation",
      progress: 0.65,
      employeeUpdate: "Collected examples and drafted a review rubric.",
      managerNotes: "Good momentum, needs one stronger cross-functional example.",
      aiCoaching: "Link the rubric to actual decisions to make impact evidence stronger."
    }
  ],
  achievements: [
    {
      title: "Shipped onboarding documentation refresh",
      type: "Process Improvement",
      date: "2026-02-20",
      impact: "High",
      summary: "Reworked setup documentation and ownership notes for new joiners.",
      evidence: "Reduced repeated setup questions and improved first-month clarity feedback.",
      validation: "Validated",
      aiSummary: "Strong evidence of leverage and ownership in the first quarter.",
      promotionEvidence: true
    },
    {
      title: "Built first retention dashboard draft",
      type: "Delivery",
      date: "2026-03-01",
      impact: "Medium",
      summary: "Created an early product-retention dashboard used in roadmap discussion.",
      evidence: "Shared with product and growth leads for weekly planning.",
      validation: "Validated",
      aiSummary: "Useful first-cut output with growing strategic value.",
      promotionEvidence: true
    }
  ]
};
