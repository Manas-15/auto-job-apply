# Backend (Express + Prisma + BullMQ). Build context is the repo ROOT:
#   docker build -f apps/api/Dockerfile -t aja-api .
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app

# openssl so `prisma generate` detects the correct engine target (debian-openssl-3.0.x).
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Install workspace deps from the root lockfile. Skip the Playwright browser
# download — the cloud never scrapes Naukri (headed + your session only).
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# Build the API + generate the Prisma client.
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
RUN npm run db:generate --workspace @aja/api \
  && npm run build --workspace @aja/api

# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Prisma needs openssl at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Carry over installed deps (incl. generated Prisma client + CLI) and build output.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

EXPOSE 4000
# Apply migrations, then start. Reads DATABASE_URL/REDIS_URL/etc. from the
# container environment (no .env file needed).
CMD ["sh", "-c", "npm run migrate:deploy --workspace @aja/api && node apps/api/dist/index.js"]
