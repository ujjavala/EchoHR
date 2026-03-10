# EchoHR Views & Dashboards (copy-paste playbook)

Apply these view settings in Notion after provisioning. Estimated time: 10–15 minutes for all hubs. Use cover images + emojis on each hub page for polish.

Tip: For galleries, set Card preview = Page cover (drop a small image in Recognition/Achievements if none exists).

---

## Hiring
**Candidates (db: Candidates)**
- View: Board, Group by `Stage`, Sort by `Last Update Sent` (descending)
- Properties to show: `Stage Owner`, `Last Update Sent`, `Personalized Next Step`, `Sentiment`, `Candidate Portal Link`
- Filter: `Last Update Sent` is before 2 days ago (call this “Needs Update”)

**Applications**
- View: Board, Group by `Pipeline Stage`
- Secondary view: Timeline by `Applied Date`

**Interviews**
- View: Calendar by `Scheduled For`
- Secondary: Table, Sort by `Status` then `Scheduled For`

**Offers**
- View: Calendar by `Response Due`
- Secondary: Board grouped by `Offer Status`
- Show: `Base Salary`, `Start Date Proposed`, `Approval Owner`

---

## Onboarding
**Onboarding Journeys**
- View: Timeline by `Start Date`
- Secondary: Board grouped by `Journey Status`
- Show: `Health Status`, `Intro Message`, `New Hire Portal`

**Tasks (filter Task Type = Onboarding)**
- View: Board grouped by `Status`, Card badge = `Priority`

**Check-ins**
- View: Calendar by `Scheduled Date`
- Secondary: Board grouped by `Status`, show `Mood Score`

---

## Growth (Goals / Reviews / Achievements)
**Goals**
- View: Board grouped by `Status`
- Secondary: Table sorted by `Due Date`
- Show: `Progress %`, `Manager Notes`, `Employee Update`

**Performance Reviews**
- View: Board grouped by `Review Status`
- Secondary: Gallery; card fields `Rating`, `Promotion Recommendation`
- Timeline: `Review Due Date`

**Achievements**
- View: Gallery; group by `Impact`; card preview = Page cover/first image

---

## Compensation
**Compensation Events**
- View: Board grouped by `Approval Status`
- Table: show `Change %`, `Proposed Level`, `Proposed Salary`, filter to `Draft`/`Manager Approved` for review meetings

---

## Culture & Engagement
**Recognition**
- View: Gallery grouped by `Category`; show `From`, `To`, `Message`, `Date`

**Pulse Surveys**
- Table sorted by `Submitted At`
- Board grouped by `Survey Type`
- Add Formula badge “Mood” = average of `Energy Score`, `Clarity Score`, `Support Score`

**Mood of the Day**
- Linked view of Pulse Surveys, filter `Submitted At is today`, sort desc; add a callout on top

---

## Offboarding
**Offboarding Cases**
- View: Board grouped by `Status`; show `Reason Category`, `Last Working Day`, `Knowledge Transfer`

**Knowledge Transfers**
- View: Table sorted by `Status`; show `Open Risks`, `Successor`

---

## Dashboards (one per hub, built from linked views)
**Hiring Command Center**
- Candidates board (Stage)
- Offers calendar (Response Due)
- Interviews calendar
- KPI callouts (manual): count of Active Candidates, Offers in Sent/Negotiation, overdue updates

**Onboarding Hub**
- Journeys timeline
- Tasks board (filter Task Type = Onboarding)
- Check-ins calendar

**Growth & Reviews**
- Goals board (Status)
- Performance Reviews board (Status)
- Achievements gallery

**Culture & Engagement**
- Recognition gallery
- Pulse board
- Mood of the Day linked view

**Offboarding & Alumni**
- Offboarding board (Status)
- Knowledge Transfer table

---

## Charts (quick options)
1) Notion Charts (if available): add bar/line charts on dashboards using the filtered views (stage counts, offer acceptance, task completion, pulse scores over time).
2) External embed:
   - Export or sync a view to Sheets via Make/Zapier.
   - Build the chart in Sheets/Datawrapper; copy the share URL.
   - Embed in Notion dashboard with an “Embed” block.

Suggested charts:
- Hiring: candidates by stage, average days-in-stage, offer acceptance rate.
- Onboarding: journey status distribution, task completion %, upcoming check-ins.
- Growth: goal status distribution, review rating histogram, achievements per category.
- Engagement: pulse scores over time, recognition counts per category.

---

## Taste & badges
- Keep 4–6 select colors total for status pills.
- Add template buttons for quick actions: “New Candidate w/ SLA”, “Trigger Check-in Set”, “Submit Recognition”.
- Use callouts on pages for SLA reminders (“No ghosting: update within 2 business days”).

---

## MCP/agent upkeep tips
- Use MCP to batch-update badges: `Progress %`, `Mood Score`, `Offer Status`, `Journey Status`.
- Zero-ghosting sweep via MCP: ensure every active candidate has `Last Update Sent`, `Next Update Due` (if you add that column), `Stage Owner`, and `Personalized Next Step`.
- MCP can keep dashboards “alive” by refreshing the fields that drive colors/badges; views stay attractive without manual data wrangling.
