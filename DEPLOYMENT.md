# Deployment & CI/CD

This app is a **split deploy** — the frontend goes to Vercel, the backend goes
to a container host, and the Naukri scraper stays on your machine. Vercel is
serverless, so it can host the Next.js frontend but **not** the Express API,
background workers, or a headed browser.

```
┌─────────────────┐     HTTPS      ┌──────────────────────┐
│  Vercel          │ ─────────────▶ │  Backend host         │
│  apps/web        │  NEXT_PUBLIC_  │  apps/api (Express)   │
│  (Next.js)       │  API_URL       │  + BullMQ scheduler   │
└─────────────────┘                └───────┬──────┬────────┘
                                            │      │
                                  ┌─────────▼┐   ┌─▼──────────┐
                                  │ Postgres │   │ Redis      │
                                  │ (Neon)   │   │ (Upstash)  │
                                  └──────────┘   └────────────┘

  Naukri scraper (Playwright, headed) ── runs LOCALLY on your desktop only
  (needs a real display + your login session; Naukri blocks headless).
```

**What runs where:**

| Component | Host | Notes |
|---|---|---|
| Next.js dashboard | **Vercel** | Auto-deploys from GitHub |
| Express API + free-source discovery + AI + BullMQ | **Railway / Render / Fly.io** | Persistent Node process |
| Postgres | **Neon / Vercel Postgres / Supabase** | Free tiers available |
| Redis | **Upstash** | Free tier available |
| **Naukri / LinkedIn scraping** | **Your local machine** | Cannot run in the cloud — headed browser + your session |

---

## Prerequisites

- GitHub repo (you have one: `Manas-15/auto-job-apply`)
- Accounts: [Vercel](https://vercel.com), a backend host ([Railway](https://railway.app) recommended), [Neon](https://neon.tech), [Upstash](https://upstash.com)

---

## 1. Database (Neon) + Redis (Upstash)

1. **Neon** → create a project → copy the connection string (looks like
   `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require`). This is your
   production `DATABASE_URL`.
2. **Upstash** → create a Redis database → copy the connection URL
   (`rediss://default:pass@xxx.upstash.io:6379`). This is your `REDIS_URL`.

---

## 2. Backend → Railway (recommended)

Railway builds straight from GitHub — no Dockerfile needed.

1. **New Project → Deploy from GitHub repo** → pick `auto-job-apply`.
2. **Settings → Build:**
   - Build command:
     ```
     npm install && npm run db:generate --workspace @aja/api && npm run build --workspace @aja/api
     ```
   - Start command (runs migrations, then the server):
     ```
     npm run db:deploy --workspace @aja/api && npm run start --workspace @aja/api
     ```
3. **Variables** (see the full table below): `DATABASE_URL`, `REDIS_URL`,
   `JWT_SECRET`, `AI_PROVIDER` + its key, `CORS_ORIGINS` (your Vercel URL),
   `NODE_ENV=production`, and **`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`** (the
   cloud never scrapes, so skip the browser download).
4. Deploy → Railway gives you a URL like `https://aja-api.up.railway.app`.
   Confirm `https://<that-url>/health` returns `{"status":"ok"}`.

> **Render / Fly.io** work the same way — use the same build/start commands and
> env vars.

> **Naukri in the cloud:** `POST /api/jobs/scrape/naukri` will return a clear
> "no session / headless blocked" error on the server. That's expected — scrape
> Naukri from your local machine (see §5). Free-source discovery
> (`/api/jobs/discover`) works fine on the server.

---

## 3. Frontend → Vercel

1. **Add New → Project** → import `auto-job-apply`.
2. **Root Directory:** set to **`apps/web`** (click "Edit" next to Root
   Directory). Vercel auto-detects Next.js and installs the npm workspace from
   the repo root.
3. **Environment Variables:**
   - `NEXT_PUBLIC_API_URL` = your backend URL from §2 (e.g.
     `https://aja-api.up.railway.app`). **Required** — without it the frontend
     falls back to `localhost:4000` and can't reach the API in production.
4. **Deploy.** Vercel gives you `https://auto-job-apply.vercel.app`.
5. Back in the **backend** env, set `CORS_ORIGINS` to that Vercel URL and
   redeploy the backend so CORS allows the frontend.

---

## 4. CI/CD

**CI (GitHub Actions)** — already configured in
[.github/workflows/ci.yml](.github/workflows/ci.yml): on every push/PR to
`main` it installs, generates the Prisma client, typechecks, and builds both
workspaces. Set a repo **Actions variable** `NEXT_PUBLIC_API_URL` (Settings →
Secrets and variables → Actions → Variables) if you want the build step to
embed it.

**CD (Vercel + Railway auto-deploy):**
- **Vercel** redeploys the frontend automatically on every push to `main`
  (production) and opens a **preview deployment** for every PR — no extra
  config once the GitHub repo is connected in step 3.
- **Railway** redeploys the backend automatically on every push to `main` once
  connected in step 2.

So the full pipeline is: **push to `main` → GitHub Actions checks → Vercel
(frontend) + Railway (backend) auto-deploy.**

---

## 5. Naukri scraping stays local

The scraper needs a **visible browser + your login session**, and Naukri's
Akamai bot check blocks headless/cloud browsers. So it runs on your desktop:

```bash
# point your local scraper at the production DB (optional) or a local one
npm run naukri:login          # sign in once
npm run dev:api               # or run the scrape command
```

If you set your local `.env` `DATABASE_URL` to the **Neon** connection string,
jobs you scrape locally land directly in the production database and show up in
the deployed dashboard. Otherwise they stay in your local Postgres.

---

## Environment variables

| Variable | Frontend (Vercel) | Backend (Railway) | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ required | — | Backend base URL |
| `DATABASE_URL` | — | ✅ | Neon connection string |
| `REDIS_URL` | — | ✅ | Upstash URL |
| `JWT_SECRET` | — | ✅ | Strong random string |
| `CORS_ORIGINS` | — | ✅ | Your Vercel URL |
| `NODE_ENV` | — | ✅ `production` | Enables strict CORS allowlist |
| `AI_PROVIDER` (+ key) | — | ✅ | `gemini` / `ollama` / `openai` / `anthropic` |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | — | ✅ `1` | Cloud never scrapes |
| `JOB_FINDER_ENABLED` | — | optional | `true` to run the BullMQ scheduler |

See [.env.example](.env.example) for the complete list with defaults.
