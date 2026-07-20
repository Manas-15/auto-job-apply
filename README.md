# AI Resume Builder & ATS Optimizer

Upload/paste your résumé and a job description; the app extracts the ATS
keywords, scores how well your résumé matches, shows the keyword gap, and can
rewrite your résumé to fit the job **honestly** — surfacing only experience you
already have and reporting the rest as gaps rather than inventing skills.

This is the **Phase 1 MVP** of the [Scope of Work](#roadmap).

## Stack

- **Next.js 15** (App Router) — UI **and** API routes in one app
- **TypeScript**, **Tailwind CSS v4**
- **PostgreSQL** + **Prisma**
- **Email/password auth** (bcrypt + JWT in an httpOnly cookie)
- **AI**: Google **Gemini** (free tier, default); **OpenAI** optional

## Features (MVP)

- User authentication (register / login / logout)
- Résumé management — save and reuse multiple versions
- Job-description input
- ATS analysis — 0–100 match score
- Keyword gap — matched vs. missing keywords
- AI résumé rewriter — honest, no fabricated experience, with before/after ATS lift
- Analysis history
- Dashboard

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#   → set GEMINI_API_KEY (https://aistudio.google.com/apikey)
#   → set a strong JWT_SECRET

# 3. Start Postgres (local) and run migrations
npm run db:up          # docker compose: postgres on :5432
npm run db:migrate     # creates the schema

# 4. Run the app
npm run dev            # http://localhost:3000
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server on :3000 |
| `npm run build` | `prisma generate` + `next build` |
| `npm run start` | Start the production server |
| `npm run typecheck` | Type-check without emitting |
| `npm run db:up` | Start local Postgres via Docker |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:studio` | Open Prisma Studio |

## Deployment (Vercel + Supabase)

1. Create a Supabase project and copy its Postgres connection string.
2. In Vercel, set `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `AI_PROVIDER=gemini`.
3. Run `npm run db:deploy` against the Supabase database once (or via a deploy hook).
4. Deploy — the build runs `prisma generate && next build`.

## Roadmap

- **Phase 1 (this MVP)** — auth, résumé/JD input, ATS score, keyword gap, AI rewrite, dashboard, history.
- **Phase 2** — file parsing (pdf-parse, mammoth), PDF/DOCX export (@react-pdf/renderer), recruiter & hiring-manager review.
- **Phase 3** — cover letters, interview prep, templates, subscriptions.

## Project structure

```
app/
  (auth)/login, (auth)/register   # standalone auth pages
  (app)/dashboard|analyze|resumes|history   # authed shell + pages
  api/                            # route handlers (auth, resumes, analyze, rewrite, analyses)
components/                       # Nav, AuthForm, AnalysisResult, ui primitives
lib/                              # auth, prisma, ai (gemini/openai), ats, analyzer, rewrite
prisma/schema.prisma              # User, Resume, Analysis
```
