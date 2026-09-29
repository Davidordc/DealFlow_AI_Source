# Product specification — v0.1

## Problem and user

An outbound B2B rep makes many calls and sends many emails each day. Prospect notes, follow-ups, and pipeline status can become fragmented. DealFlow gives one place to answer: **Who should I contact next, what happened last time, and what is moving toward a signed agreement?**

## Goals and acceptance criteria

1. A rep can create a prospect with name, business, email, phone, source, and follow-up date. Invalid email and missing required fields are rejected.
2. A rep can search prospects and filter by pipeline stage.
3. A rep can record a call, email, meeting, or note. The prospect's activity count and last-contact date update.
4. A rep can move a prospect through New → Contacted → Qualified → Meeting → Proposal → Won/Lost.
5. The dashboard shows counts by stage, overdue follow-ups, activities this week, and conversion to won.
6. The coaching queue explains why an item needs attention using reproducible rules.
7. Refreshing the page preserves changes in the database.

## Non-goals in v0.1

No sending email, telephony integration, customer data import, team accounts, live updates, or LLM call. The “AI” brand marks the intended product direction; the current insights are rule based and labelled as such in the UI.

## Data model

- `Workspace(id, name)` owns prospects.
- `Prospect(id, workspace_id, name, company, email, phone, source, stage, value, follow_up_at, created_at, updated_at)`.
- `Activity(id, prospect_id, kind, outcome, note, created_at)`.
- Workspace is fixed to the seeded demo workspace in v0.1. Production authentication must derive it from membership, never from an untrusted client field.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/dashboard` | Stage counts, KPIs, and attention queue |
| GET | `/api/prospects?search=&stage=` | Search and filter |
| POST | `/api/prospects` | Create prospect |
| PATCH | `/api/prospects/{id}` | Change fields or stage |
| GET | `/api/prospects/{id}/activities` | Activity history |
| POST | `/api/prospects/{id}/activities` | Record an activity |
| GET | `/health` | Health check |

## Next milestones

1. Authentication, workspace membership, permissions, audit logs, database migrations, and pagination.
2. CSV import with duplicate detection and a reversible preview.
3. Optional AI follow-up drafting with human approval, input redaction, prompt/version tracking, and evaluation cases.
4. Calendar/email integration, background jobs, observability, and deployed demo.

## Portfolio narrative

Explain the workflow trade-off: prioritisation rules shipped before AI so recommendations are explainable. Discuss indexed search, data validation, the activity-to-dashboard path, and how you would add tenant isolation and async jobs for production.
