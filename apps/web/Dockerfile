# Frontend (Next.js). Build context is the repo ROOT:
#   docker build -f apps/web/Dockerfile -t aja-web .
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY apps/web ./apps/web

# NEXT_PUBLIC_* vars are inlined at build time. Leave unset to let the browser
# fall back to <current-host>:4000 (works for a single-server deploy); set it to
# your backend's public URL when using a domain / reverse proxy.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build --workspace @aja/web

# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Next.js "standalone" output bundles a minimal server + its node_modules.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
