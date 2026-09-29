# DealFlow AI

A portfolio-grade sales execution app inspired by the work of high-volume B2B development teams. Track accounts, prospects, activities, opportunities, and follow-ups in one place. A deterministic coaching panel highlights stale opportunities and next actions; an optional AI endpoint can later add model-generated suggestions without blocking the workflow.

## Current release (v0.1)

- React + TypeScript dashboard with prospect search, pipeline board, activity logging, and follow-up queue
- FastAPI REST API with validation, SQLite local storage, and PostgreSQL support via `DATABASE_URL`
- Workspace-scoped data with a demo workspace; no real customer data is bundled
- Seeded sample records, API tests, Docker Compose, and CI checks
- Transparent rule-based recommendations. No external AI calls or fabricated model output

This is an early portfolio release, not a deployed multi-tenant CRM. Authentication, production access controls, email sync, and an LLM integration are explicitly future milestones.

## Run locally

Requirements: Node 20+, Python 3.11+.

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

In another terminal:

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173`. The API is at `http://localhost:8000/docs`. Sample data is inserted on first start. Set `DATABASE_URL=postgresql+psycopg://dealflow:dealflow@localhost:5432/dealflow` to use PostgreSQL. Alternatively run `docker compose up --build` and visit `http://localhost:5173`.

## Tests

```bash
cd api && pytest -q
cd web && npm run typecheck && npm run build
```

## Product decisions

The first version makes the workflow useful before adding a model. A rep can see which leads need action, log contact, and move opportunities through stages. Recommendations are generated from dates and activity counts, making them explainable and easy to test. The demo workspace keeps onboarding instant; production release would require login, tenant membership checks, audit logs, migrations, and rate limits.

See [PRODUCT.md](PRODUCT.md) for scope, data model, API, acceptance criteria, and roadmap.

## Suggested CV description (after you have run and reviewed it)

> Built DealFlow AI, a React/TypeScript and FastAPI sales execution platform with a searchable prospect database, pipeline management, activity tracking, follow-up prioritisation, REST API, and automated API tests. Designed its first release around outbound sales workflows observed in B2B business development.

Do not claim production deployment, AI model integration, or active users until those milestones are completed.
