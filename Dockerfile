FROM oven/bun:1.4-slim AS base
WORKDIR /app

# ── Install production dependencies only ──────────────────────────────────────
FROM base AS deps
COPY package.json bun.lockb* ./
# Bun reads workspaces — we only want the server package deps
COPY server/package.json ./server/
RUN bun install --cwd server --frozen-lockfile --production

# ── Final image ───────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app/server

# Copy installed node_modules from deps stage
COPY --from=deps /app/server/node_modules ./node_modules

# Copy server source
COPY server/src ./src
COPY server/tsconfig.json ./tsconfig.json
COPY server/package.json ./package.json

# Create data dir — Render/Fly will mount a persistent disk here
RUN mkdir -p /app/server/data

# SQLite DB lives on the persistent volume
VOLUME ["/app/server/data"]

EXPOSE 8787

# Health check — Render uses this to know the service is up
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8787/api/waitlist/count || exit 1

ENV NODE_ENV=production
ENV FREEPORT_DB_PATH=/app/server/data/freeport.db

CMD ["bun", "run", "src/index.ts"]
