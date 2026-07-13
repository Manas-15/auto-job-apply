# Auto Job Apply — AI Career Assistant

An AI-assisted job application engine: it finds jobs, analyzes the job
description, scores your resume against it (ATS), tailors resumes, drafts
cover letters, and — where allowed — helps fill and submit applications,
keeping you in control with an approval gate.

> Designed to run **for free** to start (Gemini free tier or a local Ollama
> model, Postgres + Redis via Docker), with paid APIs (OpenAI/Claude) as a
> drop-in upgrade.

## Status

Foundation + first vertical slice is working:

- ✅ Monorepo (npm workspaces), Docker Compose (Postgres + Redis)
- ✅ Prisma schema for the full domain (users, resumes, jobs, applications, ATS, cover letters, interviews, preferences…)
- ✅ Express + TypeScript API with validation, logging, typed errors
- ✅ **Swappable AI provider** abstraction — `gemini` / `ollama` / `openai` / `anthropic`
- ✅ **Module 2 — AI Job Analyzer**: JD → structured skills/keywords/responsibilities
- ✅ **Module 4 — ATS Score**: deterministic keyword match, resume vs JD (no AI cost)
- ✅ **Next.js dashboard**: overview, jobs list + add-job, job detail (analyze + ATS score), standalone ATS tool

See [the roadmap](#roadmap) for what's next.

## Architecture

```
apps/
  api/            Node + Express + TypeScript backend
    prisma/       schema, migrations, seed
    src/
      ai/         provider-agnostic LLM layer (gemini/ollama/openai/anthropic)
      modules/    analyzer (JD→structured), ats (scoring)
      routes/     HTTP endpoints
      lib/        prisma, logger, errors
      config/     validated env
  web/            Next.js dashboard (App Router, Tailwind v4)
    app/          overview, jobs, jobs/[id], tools/ats
    components/   nav, status bar, UI kit
    lib/          typed API client
packages/         (planned) shared types
docker-compose.yml  Postgres + Redis
```

## Prerequisites

- Node.js 20+
- Docker (for Postgres + Redis)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure env (defaults work out of the box for local dev)
cp .env.example .env
#    Optional: set GEMINI_API_KEY (free at https://aistudio.google.com/apikey)
#    to enable the AI Job Analyzer. ATS scoring works without any AI key.

# 3. Start Postgres + Redis
npm run db:up

# 4. Create the schema and generate the client
npm run db:migrate      # first run will prompt for a migration name, e.g. "init"
npm run db:generate

# 5. Seed a demo user, master resume, and sample job
npm run db:seed --workspace @aja/api

# 6. Run everything (API on :4000, dashboard on :3000)
npm run dev
#    …or run them separately:
#    npm run dev:api    # backend  → http://localhost:4000
#    npm run dev:web    # dashboard → http://localhost:3000
```

Then open **http://localhost:3000** for the dashboard. (The API root at
`:4000` just returns a JSON index — the UI lives on `:3000`.)

## Try it

```bash
# Health check
curl localhost:4000/health

# ATS score: paste resume text + JD keywords, get a match score (no AI needed)
curl -s -X POST localhost:4000/api/ats/preview -H 'Content-Type: application/json' -d '{
  "resumeText":"5+ years React, Next.js, TypeScript, Redux Toolkit, REST APIs, Jest, React Query",
  "required":["React","Next.js","TypeScript","REST APIs","Jest","React Query"],
  "niceToHave":["GraphQL","Webpack","CI/CD"]
}'
# → { "score": 75, "matchedKeywords": [...], "missingKeywords": ["GraphQL","Webpack","CI/CD"] }

# With a GEMINI_API_KEY set, analyze a stored job's description into structured data:
curl -X POST localhost:4000/api/jobs/seed-sample-job/analyze

# Then score the seeded master resume against the analyzed job:
curl -X POST localhost:4000/api/ats/score -H 'Content-Type: application/json' \
  -d '{"resumeId":"seed-master-resume","jobId":"seed-sample-job"}'
```

## AI providers

Set `AI_PROVIDER` in `.env` to switch the model backend. All four implement
the same interface, so the rest of the app is unchanged:

| Provider    | Cost            | Notes                                             |
|-------------|-----------------|---------------------------------------------------|
| `gemini`    | Free tier       | `GEMINI_API_KEY` — https://aistudio.google.com/apikey |
| `ollama`    | Free (local)    | Install Ollama, `ollama pull llama3.1`            |
| `openai`    | Paid            | `OPENAI_API_KEY`                                  |
| `anthropic` | Paid            | `ANTHROPIC_API_KEY`                               |

## API endpoints (so far)

| Method | Path                       | Description                                  |
|--------|----------------------------|----------------------------------------------|
| GET    | `/health`                  | Service + DB + AI-provider status            |
| POST   | `/api/jobs`                | Create a job (manual now; scraper feeds later) |
| GET    | `/api/jobs`                | List recent jobs                             |
| GET    | `/api/jobs/:id`            | Job detail (with analysis + scores)          |
| POST   | `/api/jobs/:id/analyze`    | Run AI Job Analyzer (Module 2)               |
| POST   | `/api/ats/score`           | Score a stored resume vs an analyzed job     |
| POST   | `/api/ats/preview`         | Ad-hoc ATS score from pasted text            |

## Roadmap

Mapped to the module plan:

- [x] **M2** AI Job Analyzer — JD → structured extraction
- [x] **M4** ATS Score — resume vs JD keyword match
- [x] **M9** Dashboard (basic) — overview, jobs, job detail, ATS tool
- [ ] **M1** Job Finder — scheduled scraping (LinkedIn/Naukri/Indeed/…) + filters
- [ ] **M3** Resume Optimizer — AI-tailored, ATS-optimized resume variants
- [ ] **M5** Cover Letter Generator
- [ ] **M6** Application Engine — Playwright form fill + approval gate
- [ ] **M7** Email Detection — apply-by-email flow
- [ ] **M8** LinkedIn Easy Apply (policy-permitting)
- [ ] **M9** Analytics dashboard — charts, funnel (found→applied→interview→offer)
- [ ] Auth (JWT + Google), storage (local/S3), Telegram notifications
- [ ] BullMQ queues + scheduler, match-score gate (auto ≥95 / approve 80–94 / skip <80)

### A note on automation & compliance

Sites like LinkedIn and Naukri may change their pages, add CAPTCHAs, or
restrict automation in their terms. The design automates everything up to
final submit, then pauses for your one-click approval (`AUTO_SUBMIT=false`
by default), and only auto-submits where permitted. Credentials are never
stored in code; use `.env`/secure storage and browser sessions/OAuth.
