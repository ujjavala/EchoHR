# Notion MCP Playbook

EchoHR should use Notion MCP as the primary operational layer after bootstrap.

## MCP-first principle

Use Notion MCP for:

- updating candidate stages and next-step dates
- writing candidate-safe status summaries
- creating manager nudges for overdue updates
- linking goals and achievements into reviews
- drafting appraisal evidence summaries
- generating offboarding follow-ups and alumni next steps
- maintaining dashboards and status pages with current context

Use the direct Notion API seeder for:

- initial workspace creation
- deterministic database/property provisioning
- repeatable demo environment setup

## Core MCP operating prompts

### 1. Candidate no-ghosting sweep

```text
Review the Candidates database in EchoHR.
Find every candidate whose next update is due soon or overdue.
For each candidate:
1. confirm current stage, owner, and promised next step
2. draft a concise candidate-safe update
3. update the record with a new personalized next step
4. create or update a manager/recruiter follow-up note
Do not leave any active candidate without an explicit next update date.
```

### 2. Review evidence sync

```text
Review all active performance reviews.
For each review:
1. gather linked goals and achievements
2. summarize progress against goals
3. identify missing evidence or missing feedback
4. update the review summary and action recommendations
5. flag any review that should not be shared yet because the employee has not received explicit feedback
```

### 3. Appraisal readiness check

```text
Review all active compensation events.
For each appraisal or promotion case:
1. gather linked performance review, goals, and achievements
2. summarize validated evidence for the decision
3. identify gaps in manager feedback or employee clarity
4. create a next-step note so the employee is not left guessing
```

### 4. Onboarding support scan

```text
Review onboarding journeys, tasks, check-ins, and pulse surveys.
Find new hires who need support, have missing check-ins, or have low clarity/support signals.
Update their journey with a concrete next step and create a manager follow-up item.
```

### 5. Offboarding and alumni follow-through

```text
Review all offboarding cases and alumni records.
Find incomplete knowledge transfer, missing exit feedback, or alumni follow-up gaps.
Update each record with a visible owner, next action, and due date.
```

## Zero-ghosting rule by lifecycle stage

- Candidate: every active candidate must have `Last Update Sent`, `Next Update Due`, `Stage Owner`, and `Personalized Next Step`
- Onboarding: every new hire must have visible tasks, buddy, and next scheduled check-in
- Goals: every active goal must have `Progress %`, `Needs Feedback By`, and current manager feedback
- Reviews: every review must be linked to goals and achievements before it is shared
- Appraisals: every compensation event must carry evidence and a next-step communication note
- Offboarding: every exiting employee must have a visible checklist and knowledge transfer status
- Alumni: every eligible alumni record must have a next touchpoint
