# ---------- base ----------
FROM node:20-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---------- deps ----------
FROM base AS deps
COPY package*.json ./
# keep devDeps so drizzle-kit is available at runtime for migrations
RUN npm ci --legacy-peer-deps

# ---------- builder ----------
FROM base AS builder
# build deps for better-sqlite3
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# ensure node-gyp uses python3 on alpine
ENV PYTHON=/usr/bin/python3
RUN npm rebuild better-sqlite3
RUN npm run build

# ---------- runner ----------
FROM base AS runner
RUN apk add --no-cache libc6-compat su-exec sqlite
# runtime libs needed by better-sqlite3 on alpine + su-exec to drop privs
RUN apk add --no-cache libc6-compat su-exec
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# default DB path (also set this in fly.toml)
ENV DATABASE_URL="file:/data/sqlite.db"

# non-root user that will run the app
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs

# public assets + next standalone output
COPY --from=builder /app/public ./public
RUN mkdir -p .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# drizzle + config + any runtime db helpers used by drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db ./src/lib/db

# bring node_modules from builder so drizzle-kit + native modules exist at runtime
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# create the mount point (ownership of the actual volume is fixed at runtime)
RUN mkdir -p /data

# entrypoint that fixes /data ownership, runs migrations, then drops to nextjs
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# IMPORTANT: run entrypoint as root so it can chown the mounted volume
ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 3000
# server.js comes from .next/standalone
CMD ["node", "server.js"]
