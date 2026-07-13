# Commands Cheat-Sheet

Everything you need to start/stop/operate the app. Run all commands from the
repo root: `~/Manas/Auto Job Apply/auto-job-apply`.

There are **two ways to run** the app — pick one at a time (they share ports
3000/4000/5432/6379, so don't run both):

- **Live (Docker)** — production-mode, everything containerized. Best for
  "always on".
- **Local dev** — hot-reload for development.

---

## 🚀 Live stack (Docker) — recommended

Runs web + API + Postgres + Redis as containers.

| Command | Use case |
|---|---|
| `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build` | **Start** the whole stack (build images first run) |
| `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d` | Start without rebuilding (after an env change) |
| `docker compose -f docker-compose.prod.yml --env-file .env.prod down` | **Stop** everything (keeps the database volume) |
| `docker compose -f docker-compose.prod.yml --env-file .env.prod down -v` | Stop **and wipe the database** (fresh start) |
| `docker compose -f docker-compose.prod.yml --env-file .env.prod ps` | Show container status |
| `docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f` | Tail all logs (Ctrl+C to stop watching) |
| `docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api` | Tail just the API logs |
| `docker compose -f docker-compose.prod.yml --env-file .env.prod restart api` | Restart the API only |
| `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d api` | Recreate the API (picks up `.env.prod` changes, e.g. a new API key) |
| `git pull && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build` | **Update** to the latest code |

**URLs when live:** dashboard → `http://localhost:3000` (or `http://<your-ip>:3000`), API → `http://localhost:4000/health`.

> 💡 Tip: make an alias so you don't retype the long prefix:
> ```bash
> alias aja='docker compose -f docker-compose.prod.yml --env-file .env.prod'
> # then: aja up -d --build   |   aja down   |   aja logs -f api
> ```

---

## 🛠️ Local dev (hot-reload)

| Command | Use case |
|---|---|
| `npm install` | Install dependencies (first time / after pulling dep changes) |
| `npm run db:up` | Start **only** Postgres + Redis (dev DB) |
| `npm run db:down` | Stop the dev Postgres + Redis |
| `npm run db:migrate` | Create/apply DB schema migrations |
| `npm run db:generate` | Regenerate the Prisma client (after schema changes) |
| `npm run db:seed --workspace @aja/api` | Load demo user + sample job |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run dev` | Start **both** API (:4000) + dashboard (:3000) with hot-reload |
| `npm run dev:api` | Start only the API |
| `npm run dev:web` | Start only the dashboard |
| `npm run typecheck` | Type-check both apps |
| `npm run build` | Production build of both apps |

**Typical dev session:** `npm run db:up` → `npm run dev` → open `http://localhost:3000`.

---

## 🔎 Naukri scraping (local desktop only)

Requires a visible browser + your login — **can't run in Docker/cloud** (Naukri
blocks headless). Run these on your own machine.

| Command | Use case |
|---|---|
| `npm run naukri:login` | **One-time**: opens a browser, you sign in, session saved locally |
| Dashboard → **Jobs → Scrape Naukri** | Scrape using the query box + your session |
| `curl -X POST localhost:4000/api/jobs/scrape/naukri -H 'Content-Type: application/json' -d '{"query":"react developer","limit":25}'` | Scrape via API |

Re-run `npm run naukri:login` if it says the session expired.

> To land locally-scraped Naukri jobs in your **live** database, point your
> local `.env` `DATABASE_URL` at the live Postgres before scraping.

---

## 🌐 Job discovery (free sources — works everywhere)

| Command | Use case |
|---|---|
| Dashboard → **Jobs → Search sources** | Pull jobs from Remotive/RemoteOK/Arbeitnow/Jobicy/WeWorkRemotely |
| `curl -X POST localhost:4000/api/jobs/discover -H 'Content-Type: application/json' -d '{"query":"react developer","limit":25}'` | Discover via API |
| `curl localhost:4000/api/jobs/sources` | List available sources |

---

## 🤖 Enable AI analysis

AI is used for JD analysis + (soon) resume tailoring. Free with Gemini.

1. Get a free key: https://aistudio.google.com/apikey
2. Add it to your env file:
   - Live: edit `.env.prod` → `GEMINI_API_KEY=...`
   - Dev: edit `.env` → `GEMINI_API_KEY=...`
3. Apply it:
   - Live: `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d api`
   - Dev: restart `npm run dev`

Switch providers with `AI_PROVIDER=gemini|ollama|openai|anthropic` (+ that
provider's key). See [.env.example](.env.example).

---

## 🧰 Troubleshooting

| Problem | Fix |
|---|---|
| `EADDRINUSE` / port already in use | Something's already on 3000/4000. Stop the other mode (live vs dev). Find it: `ss -ltnp \| grep -E ':3000\|:4000'` then `kill <pid>`, or `docker compose -f docker-compose.prod.yml down`. |
| `naukri:login: command not found` | Use `npm run naukri:login` (it's an npm script, not a shell command). |
| Dashboard shows "API unreachable" | The API isn't running, or you opened the wrong port. Dashboard is `:3000`, API is `:4000`. Check `curl localhost:4000/health`. |
| "Analyze with AI" says not configured | Add a `GEMINI_API_KEY` (see AI section above). |
| Naukri scrape returns 0 jobs | Session expired or blocked — re-run `npm run naukri:login`; check `browser-sessions/naukri-debug.png`. |
| Opened `http://<ip>` (no port) → nothing | Add the port: `http://<ip>:3000`. |

---

## 📚 Related docs

- [README.md](README.md) — overview, features, API endpoints
- [DEPLOYMENT.md](DEPLOYMENT.md) — deploy to Vercel/Railway or self-host with Docker
- [.env.example](.env.example) / [.env.prod.example](.env.prod.example) — all config options
