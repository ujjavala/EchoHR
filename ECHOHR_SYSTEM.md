# EchoHR

EchoHR is a fast-to-implement employee lifecycle management system built in Notion with lightweight automations through Make, Slack, calendar, email, and OpenAI. The design is opinionated for a hackathon: one workspace, a small number of databases, strong relations, visible status tracking, and empathetic automation.

## 1. Workspace Structure

Top-level pages:

1. `EchoHR HQ`
2. `Hiring Command Center`
3. `Onboarding Hub`
4. `Growth & Reviews`
5. `Culture & Engagement`
6. `Offboarding & Alumni`
7. `Automation Ops`

Core databases:

1. `People`
2. `Candidates`
3. `Roles`
4. `Applications`
5. `Interviews`
6. `Offers`
7. `Onboarding Journeys`
8. `Tasks`
9. `Check-ins`
10. `Performance Reviews`
11. `Compensation Events`
12. `Recognition`
13. `Pulse Surveys`
14. `Offboarding Cases`
15. `Knowledge Transfers`
16. `Alumni`
17. `Templates & Playbooks`
18. `Automation Log`

## 2. Operating Model

The system uses `People` as the shared directory across candidates, employees, managers, buddies, interviewers, and alumni. Lifecycle-specific databases connect to `People` so dashboards and automations stay simple.

Transparency is enforced with:

- every candidate and employee having a visible current stage
- every active process carrying an explicit owner
- every stage carrying a target next action date
- every automation updating the human-facing portal and sending a timely message

## 3. Database Schemas

### 3.1 People

Purpose: master record for anyone interacting with EchoHR.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Name | Title | Full name |
| Person ID | Formula | `upper(slice(replaceAll(id(),"-",""),0,8))` |
| Work Email | Email | Primary work email |
| Personal Email | Email | Candidate or fallback email |
| Slack User ID | Text | Used for Slack automation |
| Lifecycle Type | Select | Candidate, Employee, Manager, Interviewer, Buddy, Alumni |
| Employment Status | Select | Prospect, Active, Leave, Exited |
| Department | Select | Eng, Product, Design, Sales, Ops, Other |
| Team | Select | Flexible |
| Location | Select | City or timezone grouping |
| Manager | Relation -> People | Direct manager |
| Buddy | Relation -> People | Assigned onboarding buddy |
| Start Date | Date | Employee start |
| End Date | Date | Offboarding date |
| Birth Date | Date | For celebrations |
| Work Anniversary Month | Formula | `formatDate(prop("Start Date"), "MMMM")` |
| Tenure (Months) | Formula | `if(empty(prop("Start Date")), 0, dateBetween(now(), prop("Start Date"), "months"))` |
| Active Tasks | Rollup | From Tasks, count where status not done |
| Open Check-ins | Rollup | From Check-ins, count incomplete |
| Latest Review Score | Rollup | From Performance Reviews |
| Engagement Score | Rollup | Average from Pulse Surveys |
| Portal URL | URL | Shared Notion page or public link |
| Notes | Text | Light metadata |

Views:

- Active Employees
- Managers
- Candidates
- New Joiners This Month
- Birthdays This Month

### 3.2 Roles

Purpose: hiring templates and headcount planning.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Role Name | Title | Example: Senior Product Designer |
| Role ID | Formula | `upper(slice(replaceAll(id(),"-",""),0,6))` |
| Department | Select | Owning team |
| Hiring Manager | Relation -> People | Manager owner |
| Recruiter | Relation -> People | Optional |
| Level | Select | L1-L8 or custom |
| Employment Type | Select | Full-time, Contract, Intern |
| Location | Multi-select | Allowed locations |
| Hiring Status | Select | Draft, Open, On Hold, Closed |
| Open Date | Date | |
| Target Fill Date | Date | |
| Interview Plan | Text | Stage list |
| Candidate Count | Rollup | Applications count |
| Stage SLA Days | Number | Default target days |
| Offer Approval Required | Checkbox | |

### 3.3 Candidates

Purpose: candidate-facing record with transparent communication tracking.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Candidate Name | Title | |
| Person | Relation -> People | One-to-one when possible |
| Primary Role | Relation -> Roles | |
| Candidate Status | Select | Applied, Screening, Interviewing, Offer, Hired, Rejected, Withdrawn |
| Stage | Select | Applied, Recruiter Screen, Manager Screen, Panel, Decision, Offer, Closed |
| Stage Owner | Relation -> People | Current human owner |
| Applied On | Date | |
| Last Update Sent | Date | Most recent outbound update |
| Next Update Due | Formula | `if(or(prop("Candidate Status") == "Rejected", prop("Candidate Status") == "Hired", prop("Candidate Status") == "Withdrawn"), empty(), dateAdd(prop("Last Update Sent"), 3, "days"))` |
| Deadline Status | Formula | `if(empty(prop("Next Update Due")), "Closed", if(now() > prop("Next Update Due"), "Update overdue", if(dateBetween(prop("Next Update Due"), now(), "days") <= 1, "Update due soon", "On track")))` |
| Candidate Experience Promise | Formula | `if(prop("Candidate Status") == "Rejected", "Feedback sent", if(prop("Deadline Status") == "Update overdue", "Needs immediate update", "Next update committed"))` |
| Current Application | Relation -> Applications | Primary active application |
| Interviews | Rollup | From Interviews |
| Feedback Summary | Rollup | AI summary from Applications or Interviews |
| Candidate Portal Link | URL | Shared status page |
| Source | Select | Referral, LinkedIn, Careers Page, Agency, Event, Other |
| Sentiment | Select | Positive, Neutral, Concerned |
| Rejection Reason | Select | Skill mismatch, Timing, Compensation, Other |
| Personalized Next Step | Text | Human-readable message |

Views:

- Needs Update Now
- In Interviews
- Offer Stage
- Closed with Feedback Sent

### 3.4 Applications

Purpose: application-level tracking, useful for multi-role candidates.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Application ID | Title | `APP-001` style |
| Candidate | Relation -> Candidates | |
| Role | Relation -> Roles | |
| Application Status | Select | Active, Offer, Hired, Rejected, Withdrawn |
| Pipeline Stage | Select | Applied, Screen, Interview Loop, Final Review, Offer, Closed |
| Stage Order | Formula | numeric mapping for dashboards |
| Applied Date | Date | |
| Resume URL | URL | |
| Portfolio URL | URL | |
| Scheduler Link | URL | calendar booking link |
| Next Interview Date | Rollup | nearest from Interviews |
| Panel Complete | Formula | `if(prop("Completed Interviews") >= prop("Required Interviews"), true, false)` |
| Required Interviews | Number | default 3 |
| Completed Interviews | Rollup | count complete Interviews |
| Raw Feedback | Relation -> Interviews | indirect |
| AI Feedback Summary | Text | OpenAI generated |
| Decision Recommendation | Select | Strong Yes, Yes, Mixed, No, Strong No |
| Decision Due | Formula | `if(prop("Application Status") == "Active", dateAdd(prop("Next Interview Date"), 2, "days"), empty())` |
| Candidate Message Draft | Text | personalized update text |
| Ghosting Risk | Formula | `if(and(prop("Application Status") == "Active", now() > prop("Decision Due")), "High", "Low")` |

### 3.5 Interviews

Purpose: schedule, collect structured feedback, and summarize.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Interview Title | Title | Example: `Asha Patel - Hiring Manager` |
| Application | Relation -> Applications | |
| Candidate | Rollup | via Application |
| Role | Rollup | via Application |
| Interview Type | Select | Recruiter, Hiring Manager, Technical, Case, Panel, Culture |
| Interviewer | Relation -> People | |
| Coordinator | Relation -> People | optional |
| Scheduled For | Date | include time |
| Calendar Event ID | Text | for sync |
| Meeting Link | URL | |
| Status | Select | To Schedule, Scheduled, Completed, Cancelled, No Show |
| Score | Number | 1-5 |
| Strengths | Text | |
| Concerns | Text | |
| Recommendation | Select | Strong Yes, Yes, Mixed, No, Strong No |
| Feedback Submitted At | Date | |
| Feedback SLA | Formula | `dateAdd(prop("Scheduled For"), 1, "days")` |
| Feedback On Time | Formula | `if(empty(prop("Feedback Submitted At")), false, prop("Feedback Submitted At") <= prop("Feedback SLA"))` |
| AI Summary | Text | summary of this interview |
| Candidate-safe Summary | Text | kinder version for transparency |

Views:

- Needs Scheduling
- Feedback Overdue
- Today’s Interviews

### 3.6 Offers

Purpose: simple, template-based offer workflow.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Offer ID | Title | |
| Candidate | Relation -> Candidates | |
| Application | Relation -> Applications | |
| Role | Rollup | via Application |
| Offer Status | Select | Draft, Internal Approval, Sent, Negotiation, Accepted, Declined, Expired |
| Compensation Band | Text | |
| Base Salary | Number | |
| Equity | Text | |
| Bonus | Number | |
| Start Date Proposed | Date | |
| Approval Owner | Relation -> People | |
| Offer Letter Template | Relation -> Templates & Playbooks | |
| Offer Document URL | URL | Drive/DocuSign |
| Sent At | Date | |
| Response Due | Date | |
| Days Until Response | Formula | `if(empty(prop("Response Due")), empty(), dateBetween(prop("Response Due"), now(), "days"))` |
| Candidate Questions | Text | |
| Notes | Text | |

### 3.7 Onboarding Journeys

Purpose: one record per new hire to drive onboarding status and visibility.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Journey Name | Title | Usually `Name - Onboarding` |
| Employee | Relation -> People | |
| Start Date | Date | |
| Manager | Rollup | via Employee |
| Buddy | Rollup | via Employee |
| Journey Status | Select | Preboarding, Week 1, Month 1, Month 2, Month 3, Completed, Blocked |
| Personal Goals | Text | |
| Intro Message | Text | personalized welcome |
| Task Completion % | Rollup | from Tasks |
| Open Tasks | Rollup | count |
| First 30 Check-in | Rollup | from Check-ins |
| First 60 Check-in | Rollup | from Check-ins |
| First 90 Check-in | Rollup | from Check-ins |
| Health Status | Formula | `if(prop("Task Completion %") < 50 and dateBetween(now(), prop("Start Date"), "days") > 14, "Needs support", "On track")` |
| New Hire Portal | URL | Notion page |

### 3.8 Tasks

Purpose: all lifecycle tasks, not only onboarding.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Task | Title | |
| Task Type | Select | Hiring, Offer, Onboarding, Review, Compensation, Offboarding, Engagement |
| Related Person | Relation -> People | |
| Candidate | Relation -> Candidates | optional |
| Journey | Relation -> Onboarding Journeys | optional |
| Review | Relation -> Performance Reviews | optional |
| Offboarding Case | Relation -> Offboarding Cases | optional |
| Owner | Relation -> People | |
| Due Date | Date | |
| Status | Select | Not Started, In Progress, Waiting, Done, Cancelled |
| Priority | Select | High, Medium, Low |
| Auto-created | Checkbox | |
| Empathy Note | Text | message guidance for owner |
| SLA Status | Formula | `if(prop("Status") == "Done", "Done", if(now() > prop("Due Date"), "Overdue", if(dateBetween(prop("Due Date"), now(), "days") <= 1, "Due soon", "On track")))` |

### 3.9 Check-ins

Purpose: onboarding and ongoing manager check-ins.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Check-in Name | Title | |
| Employee | Relation -> People | |
| Manager | Relation -> People | |
| Check-in Type | Select | 30-day, 60-day, 90-day, Monthly, Quarterly, Stay Interview |
| Scheduled Date | Date | |
| Status | Select | Planned, Completed, Rescheduled, Missed |
| Employee Wins | Text | |
| Employee Challenges | Text | |
| Support Needed | Text | |
| Mood Score | Number | 1-5 |
| AI Summary | Text | |
| Next Actions | Text | |
| Visibility Note | Formula | `if(prop("Status") == "Planned", "This check-in is scheduled and visible to the employee", "Captured and shared")` |

### 3.10 Performance Reviews

Purpose: recurring reviews with AI summaries and calibration.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Review Name | Title | |
| Employee | Relation -> People | |
| Manager | Rollup | via Employee |
| Review Cycle | Select | Q1, Q2, Q3, Q4, Annual |
| Review Status | Select | Draft, Self Review, Manager Review, Calibration, Shared, Closed |
| Review Due Date | Date | |
| Self Review | Text | |
| Manager Review | Text | |
| Peer Inputs | Text | |
| Goal Progress | Number | 0-100 |
| Rating | Number | 1-5 |
| Promotion Recommendation | Select | No, Watchlist, Yes |
| Compensation Event | Relation -> Compensation Events | optional |
| AI Summary | Text | |
| Action Recommendations | Text | |
| Shared With Employee At | Date | |

### 3.11 Compensation Events

Purpose: salary reviews, promotions, and approvals.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Event Name | Title | |
| Employee | Relation -> People | |
| Event Type | Select | Salary Review, Promotion, Spot Bonus, Equity Refresh |
| Effective Date | Date | |
| Current Level | Text | |
| Proposed Level | Text | |
| Current Salary | Number | |
| Proposed Salary | Number | |
| Change % | Formula | `if(or(empty(prop("Current Salary")), prop("Current Salary") == 0), empty(), round(((prop("Proposed Salary") - prop("Current Salary")) / prop("Current Salary")) * 100))` |
| Business Case | Text | |
| Approval Status | Select | Draft, Manager Approved, Finance Approved, People Approved, Finalized, Declined |
| Approval Owner | Relation -> People | |
| Notification Status | Select | Pending, Sent |

### 3.12 Recognition

Purpose: peer shoutouts and culture signals.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Recognition Title | Title | |
| From | Relation -> People | |
| To | Relation -> People | |
| Category | Select | Customer Love, Teamwork, Craft, Leadership, Ownership |
| Message | Text | |
| Date | Date | |
| Shared in Slack | Checkbox | |

### 3.13 Pulse Surveys

Purpose: lightweight engagement tracking.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Survey Response | Title | |
| Employee | Relation -> People | |
| Survey Type | Select | Weekly Pulse, Monthly Pulse, Onboarding Pulse, Exit Pulse |
| Submitted At | Date | |
| eNPS Style Score | Number | 0-10 |
| Energy Score | Number | 1-5 |
| Clarity Score | Number | 1-5 |
| Support Score | Number | 1-5 |
| Free Text | Text | |
| AI Theme Summary | Text | |
| Follow-up Needed | Formula | `if(or(prop("Energy Score") <= 2, prop("Clarity Score") <= 2, prop("Support Score") <= 2), true, false)` |

### 3.14 Offboarding Cases

Purpose: resignation, involuntary exits, and offboarding checklist.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Case Name | Title | |
| Employee | Relation -> People | |
| Manager | Rollup | via Employee |
| Offboarding Type | Select | Resignation, Mutual Separation, End of Contract |
| Notice Received | Date | |
| Last Working Day | Date | |
| Status | Select | Open, Knowledge Capture, Exit Interview, Access Removal, Complete |
| Reason Category | Select | Growth, Compensation, Manager, Relocation, Personal, Other |
| Exit Survey | Relation -> Pulse Surveys | |
| Knowledge Transfer | Relation -> Knowledge Transfers | |
| AI Exit Summary | Text | |
| Alumni Eligible | Checkbox | |
| Open Tasks | Rollup | from Tasks |

### 3.15 Knowledge Transfers

Purpose: preserve context before an employee leaves.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Transfer Title | Title | |
| Employee | Relation -> People | |
| Systems Owned | Text | |
| Key Contacts | Text | |
| Open Risks | Text | |
| Documents Linked | URL | |
| Successor | Relation -> People | |
| Status | Select | Draft, In Review, Complete |
| AI Summary | Text | |

### 3.16 Alumni

Purpose: ongoing relationship with former employees.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Alumni Name | Title | |
| Person | Relation -> People | |
| Exit Date | Date | |
| Last Role | Text | |
| Rehire Eligible | Checkbox | |
| Alumni Group Joined | Checkbox | |
| Last Touchpoint | Date | |
| Notes | Text | |

### 3.17 Templates & Playbooks

Purpose: reusable content blocks and workflow templates.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Template Name | Title | |
| Template Type | Select | Offer Letter, Email, Slack, Checklist, Review, Survey |
| Audience | Select | Candidate, Employee, Manager, HR |
| Trigger Event | Select | Application Received, Interview Scheduled, Offer Sent, Start Date Set, Review Due, Exit Logged |
| Subject | Text | for email |
| Body | Text | message content |
| Active | Checkbox | |

### 3.18 Automation Log

Purpose: monitor workflows for demo visibility and debugging.

Properties:

| Property | Type | Notes |
| --- | --- | --- |
| Run Name | Title | |
| Workflow | Select | Hiring Update, Interview Reminder, Offer Send, Onboarding Kickoff, Check-in Generator, Review Summary, Offboarding Start, Culture Reminder |
| Entity Type | Select | Candidate, Application, Interview, Employee, Review, Offboarding |
| Entity ID | Text | |
| Triggered At | Date | |
| Result | Select | Success, Warning, Error |
| Details | Text | |

## 4. Critical Relations and Rollups

Required links:

1. `People` <-> `Candidates`
2. `Candidates` <-> `Applications`
3. `Applications` <-> `Roles`
4. `Applications` <-> `Interviews`
5. `Applications` <-> `Offers`
6. `People` <-> `Onboarding Journeys`
7. `People` <-> `Tasks`
8. `People` <-> `Check-ins`
9. `People` <-> `Performance Reviews`
10. `People` <-> `Compensation Events`
11. `People` <-> `Pulse Surveys`
12. `People` <-> `Offboarding Cases`
13. `Offboarding Cases` <-> `Knowledge Transfers`
14. `People` <-> `Alumni`

Most important rollups:

- candidate next interview date
- candidate last update sent
- employee open tasks
- employee open check-ins
- onboarding completion percentage
- latest review score
- average engagement score
- offboarding open tasks

## 5. Formula Set for Transparency

Use these formulas to make the experience visibly fair and responsive.

### Candidate stage health

```notion
if(
  or(prop("Candidate Status") == "Rejected", prop("Candidate Status") == "Hired", prop("Candidate Status") == "Withdrawn"),
  "Closed",
  if(
    empty(prop("Next Update Due")),
    "Needs owner",
    if(
      now() > prop("Next Update Due"),
      "Update overdue",
      if(dateBetween(prop("Next Update Due"), now(), "days") <= 1, "Update due soon", "On track")
    )
  )
)
```

### Candidate-friendly next step message

```notion
if(
  prop("Candidate Status") == "Rejected",
  "You have received a final update and feedback.",
  if(
    prop("Deadline Status") == "Update overdue",
    "We owe you an update today.",
    "Your next update is scheduled before " + formatDate(prop("Next Update Due"), "MMM D")
  )
)
```

### Onboarding health

```notion
if(
  prop("Journey Status") == "Completed",
  "Complete",
  if(
    prop("Task Completion %") < 50 and dateBetween(now(), prop("Start Date"), "days") > 14,
    "Needs support",
    if(prop("Open Tasks") > 5, "Busy", "On track")
  )
)
```

### Review readiness

```notion
if(
  prop("Review Status") == "Closed",
  "Closed",
  if(
    now() > prop("Review Due Date"),
    "Overdue",
    if(dateBetween(prop("Review Due Date"), now(), "days") <= 7, "Due this week", "On track")
  )
)
```

### Offboarding risk

```notion
if(
  prop("Status") == "Complete",
  "Complete",
  if(
    prop("Open Tasks") > 3 and dateBetween(prop("Last Working Day"), now(), "days") <= 7,
    "Urgent",
    "On track"
  )
)
```

## 6. Core Templates

### Candidate Portal Template

Sections:

1. Current stage
2. What happens next
3. Expected update date
4. Interview prep resources
5. Who to contact
6. Personalized note

Suggested text:

> We believe clarity is part of a respectful hiring process. If plans change, you will hear from us.

### Rejection Template

Subject:

`Thank you for your time with EchoHR`

Body:

`Thank you for the time and thought you put into the process. We have decided not to move forward for this role. We know rejections are disappointing, and we do not want to leave you guessing. We have included concise feedback below and will keep your profile for future roles if you opt in.`

Feedback block:

- what stood out
- why the match was not right now
- whether future roles may fit

### Offer Letter Template

Sections:

1. Role and title
2. Team and manager
3. Start date
4. Compensation summary
5. Benefits summary
6. Acceptance deadline
7. Signature instructions

### New Hire Portal Template

Sections:

1. Welcome note from manager
2. First-week schedule
3. Buddy introduction
4. Tools and accounts checklist
5. 30/60/90 plan
6. FAQ
7. Feedback channel

### Monthly Check-in Template

Prompt blocks:

- what went well this month
- where are you blocked
- how supported do you feel
- what should your manager know
- one thing we can improve

### Performance Review Template

Sections:

1. Goals
2. Wins
3. Challenges
4. Collaboration
5. Growth areas
6. Support requested
7. AI summary
8. Manager action plan

### Exit Interview Template

Sections:

1. Why are you leaving
2. What would have made you stay
3. How supported did you feel
4. What should we improve
5. What knowledge needs handover
6. Alumni interest
7. AI summary and trends tag

## 7. Dashboards

### Hiring Command Center

Widgets/views:

- Applications by stage
- Candidates needing update today
- Interviews this week
- Feedback overdue
- Offers awaiting response
- Funnel metrics by role

Key formulas surfaced:

- `Deadline Status`
- `Ghosting Risk`
- `Decision Due`

### Candidate Experience Board

Views:

- My stage
- Upcoming interviews
- Last update sent
- Next update promise
- final feedback status

This can be a filtered shared page per candidate using synced blocks or public page duplication.

### Onboarding Hub

Views:

- Starts in next 14 days
- Week 1 progress
- Needs support
- Buddy assignments
- open onboarding tasks by owner

### Growth & Reviews Dashboard

Views:

- Reviews due this month
- Calibration queue
- promotion recommendations
- compensation events awaiting approval
- manager completion rates

### Culture & Engagement Dashboard

Views:

- birthdays this week
- anniversaries this month
- recognitions this month
- pulse survey heatmap
- support-needed responses

### Offboarding & Alumni Dashboard

Views:

- active offboarding cases
- last day this week
- knowledge transfer incomplete
- exit themes
- alumni eligible and not invited

## 8. Hackathon-Ready Automation Workflows

Use Notion API + Make as the default. Use Zapier only when the connector is faster.

### Workflow 1: Application Received

Trigger:

- new form response or new `Candidates` record

Steps:

1. create/update `People`
2. create `Candidates` record
3. create `Applications` record
4. set `Last Update Sent = now`
5. generate personalized confirmation email
6. send Slack alert to recruiter/hiring manager
7. create `Automation Log` entry

Outputs:

- candidate gets immediate acknowledgment
- team sees owner and deadline

### Workflow 2: Candidate Update Guardrail

Trigger:

- scheduled every morning

Steps:

1. find candidates where `Deadline Status = Update overdue` or `Update due soon`
2. draft personalized update using stage context
3. send Slack DM to owner with one-click copy
4. optionally send email automatically for generic stage updates
5. log outcome

This workflow protects the no-ghosting promise.

### Workflow 3: Interview Scheduling

Trigger:

- application moved to `Interview Loop`

Steps:

1. create missing `Interviews` records from role interview plan
2. send scheduling link to candidate
3. reserve panel slots via Google Calendar or Outlook
4. post Slack reminder to interviewers
5. update candidate portal with schedule status

### Workflow 4: Interview Reminder + Feedback Chase

Trigger:

- 24 hours before interview
- 2 hours after completed interview

Steps:

1. send candidate prep email with agenda and names
2. send interviewer prep packet
3. after interview, send interviewer feedback form link
4. if feedback missing after SLA, ping in Slack
5. after all feedback arrives, summarize via OpenAI into `AI Feedback Summary`

### Workflow 5: Offer Generation and Send

Trigger:

- application status moved to `Offer`

Steps:

1. create `Offers` record from template
2. merge candidate and compensation data into Google Doc
3. export PDF or send through DocuSign
4. email candidate with clear deadline and contact person
5. notify hiring manager in Slack
6. if due date is near, send reminder

### Workflow 6: Accepted Offer to Onboarding Kickoff

Trigger:

- offer status moved to `Accepted`

Steps:

1. convert candidate `People` lifecycle type to `Employee`
2. set employee start date
3. create `Onboarding Journeys`
4. assign buddy from same department using filtered rotation list
5. generate onboarding tasks from template
6. create check-ins for day 30, 60, 90, then monthly through month 6
7. send welcome email and Slack intro draft
8. create new hire portal page

### Workflow 7: Monthly Check-in Generator

Trigger:

- scheduled daily

Condition:

- employees with tenure <= 6 months and missing check-in for target month

Steps:

1. create `Check-ins` record
2. create manager task
3. send empathetic Slack nudge to manager
4. update employee portal with planned conversation

### Workflow 8: Performance Review Cycle

Trigger:

- scheduled quarterly or manual cycle start

Steps:

1. create `Performance Reviews` for eligible employees
2. assign self-review and manager-review tasks
3. send reminders based on due date
4. after submissions, summarize self-review, peer input, and manager review with OpenAI
5. suggest action recommendations and promotion flags
6. push dashboard updates

### Workflow 9: Salary Review / Promotion Approvals

Trigger:

- new `Compensation Events` record

Steps:

1. send Slack approval request to manager or People lead
2. on approval, advance status
3. notify finance or final approver
4. when finalized, generate employee communication draft
5. log event for reporting

### Workflow 10: Resignation to Offboarding

Trigger:

- new `Offboarding Cases` record or employee status marked exiting

Steps:

1. create offboarding task checklist
2. schedule exit interview
3. generate knowledge transfer document template
4. schedule access removal with IT
5. send compassionate manager guidance
6. summarize exit survey and notes with OpenAI
7. if alumni eligible, create `Alumni` record and invite later

### Workflow 11: Recognition, Birthdays, Anniversaries

Trigger:

- daily scheduler

Steps:

1. find birthdays and anniversaries
2. send Slack celebration post
3. optionally create recognition prompts for managers
4. record sent status

### Workflow 12: Pulse Survey Insight Engine

Trigger:

- new `Pulse Surveys` response

Steps:

1. evaluate low support or low clarity scores
2. if risk flagged, notify manager and People partner privately
3. summarize themes weekly with OpenAI
4. update engagement dashboard and recommendations

## 9. OpenAI Prompt Recipes

### Interview Feedback Summary

```text
Summarize the interview feedback for a hiring decision.
Return:
1. concise summary
2. strengths
3. concerns
4. recommendation: Strong Yes / Yes / Mixed / No / Strong No
5. candidate-safe feedback in empathetic language
Use only the provided feedback and avoid inventing facts.
```

### Self Review Summary

```text
Summarize this self-review and manager review into:
1. wins
2. growth areas
3. support requests
4. manager actions
5. promotion signal
Keep wording constructive and specific.
```

### Exit Insight Summary

```text
Summarize exit interview notes into:
1. primary reasons for exit
2. preventable issues
3. systems/process themes
4. manager coaching suggestions
5. alumni relationship recommendation
Be respectful and avoid overconfidence.
```

## 10. Suggested Notion Templates by Database

Create these database templates inside Notion:

1. `Candidate - Applied`
2. `Candidate - Interview Stage`
3. `Candidate - Rejection with Feedback`
4. `Offer - Standard Full-Time`
5. `Onboarding - Engineering`
6. `Onboarding - Business Team`
7. `Check-in - 30 Day`
8. `Performance Review - Quarterly`
9. `Compensation Event - Promotion`
10. `Offboarding - Resignation`
11. `Knowledge Transfer - Standard`
12. `Recognition - Slack Shoutout`

## 11. Implementation Order for a 24-48 Hour Hackathon

### Phase 1: Core Demo

Build first:

1. `People`
2. `Candidates`
3. `Applications`
4. `Interviews`
5. `Offers`
6. `Onboarding Journeys`
7. `Tasks`
8. `Check-ins`
9. `Performance Reviews`
10. `Offboarding Cases`

Automate first:

1. application received
2. candidate update guardrail
3. interview reminders
4. accepted offer to onboarding kickoff
5. offboarding kickoff

### Phase 2: Polish

Add:

1. `Pulse Surveys`
2. `Recognition`
3. `Compensation Events`
4. `Knowledge Transfers`
5. `Alumni`
6. AI dashboards

## 12. Demo Story

Show the system in one continuous narrative:

1. candidate applies and instantly receives acknowledgment
2. interview gets scheduled and reminders fire
3. interview feedback is summarized by AI
4. candidate receives clear update instead of silence
5. offer is generated and accepted
6. employee onboarding portal, buddy, and check-ins appear automatically
7. quarterly review generates summary and promotion recommendation
8. resignation triggers respectful offboarding and alumni handoff

## 13. Success Metrics

Track these visibly:

- percentage of candidates updated within SLA
- average time in stage by role
- feedback completion rate within 24h
- onboarding task completion by day 30
- first 90 day sentiment average
- review completion rate
- promotion and appraisal cycle time
- offboarding completion before last working day
- alumni opt-in rate

## 14. EchoHR Philosophy Block

Place this at the top of the HQ dashboard:

> EchoHR runs on a simple belief: rejections hurt, but ghosting hurts even more. Every person in the system should know where they stand, what happens next, and when they will hear from us.
