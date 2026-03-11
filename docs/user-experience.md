# EchoHR UX Quick Wins (Notion-native)

Goal: make EchoHR feel like a product, not a spreadsheet, in 10–15 minutes after provisioning.

## Covers, icons, theming
- Add a distinct cover + emoji to each section page (Hiring, Onboarding, Growth, Culture, Offboarding).
- Use consistent accent colors per stage:
  - Hiring: orange
  - Onboarding: blue
  - Growth/Performance: green
  - Culture: purple
  - Offboarding/Alumni: red

## Default views to apply (per DB)
- Candidates: Board by Stage; show Stage Owner, Last Update Sent, Personalized Next Step; filter “Last Update Sent” > 2 days ago → “Needs update.”
- Offers: Calendar by Response Due; Board by Offer Status.
- Onboarding Journeys: Timeline by Start Date; Board by Journey Status.
- Tasks: Board by Status; badge Priority; filter “Auto-created” to manage system SLAs separately.
- Check-ins: Calendar by Scheduled Date; Board by Status; badge Mood Score.
- Goals: Board by Status; Table sorted by Due Date; show Progress % and Manager Notes.
- Performance Reviews: Board by Review Status; Gallery showing Rating & Promotion Recommendation.
- Achievements: Gallery grouped by Impact; card cover = page cover.
- Recognition: Gallery grouped by Category; card shows From, To, Message, Date.
- Pulse Surveys: Board by Survey Type; Table sorted by Submitted At; formula badge for Mood = avg(Energy, Clarity, Support).
- Offboarding Cases: Board by Status; show Reason Category, Last Working Day, Knowledge Transfer.

## Dashboards to assemble (copy/paste blocks)
- Hiring Command Center: Candidates board (group by Stage), Offers calendar, Interviews calendar, KPI callouts (Open roles, Candidates needing updates, Avg time in stage).
- Onboarding Hub: Journeys timeline, Tasks board filtered to Onboarding, Check-ins calendar.
- Growth & Performance: Goals board, Reviews board, Achievements gallery, Compensation events table (pending approvals).
- Culture & Engagement: Recognition gallery, Pulse board, Mood-of-day linked view, Birthday/Anniversary linked views (filters on dates).
- Offboarding & Alumni: Offboarding board, Knowledge Transfer table, Alumni table with last touchpoint.

## Portal pages (copy this structure)
### Candidate portal (per candidate)
- Status (select), Next step (rich text), Deadline (date)
- Contacts: Recruiter, Stage Owner
- Timeline: linked Applications/Interviews
- Feedback: Candidate-safe summary (from meeting-notes automation)
- Resources: links to role, JD, scheduler

### New-hire portal (per onboarding journey)
- Welcome callout with buddy + manager + start date
- Checklist linked view filtered to that journey
- Calendar view of check-ins
- Intro video/links, team map, first-week milestones

### Employee growth hub (per person)
- Linked Goals (board), Achievements (gallery), Check-ins (list), Performance Reviews (gallery with rating), Recognitions (list)
- Mood-of-day entry + pulse survey link

## Mood-of-day / celebrations
- Create a “Mood of Day” linked view on Recognition or Pulse with Today filter; add a daily template button.
- Add a “Celebrations” gallery filtered to Recognition entries tagged “Celebration” or “Shoutout.”

## Embeds for charts (if Notion Charts unavailable)
- Datawrapper/Looker Studio/Sheets embed blocks on section dashboards for: hires/month, time-in-stage, onboarding completion %, review completion %, eNPS, attrition reasons.

## Copy blocks quickly
- Use the “Duplicate” button on the provided “Setup Views (5–10 min)” page to stamp layouts across teams.
