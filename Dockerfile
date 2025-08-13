# Use the official Node.js 20 image as a base
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
# Add build dependencies for better-sqlite3
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables and rebuild better-sqlite3 for the correct architecture
ENV PYTHON=/usr/bin/python3
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm rebuild better-sqlite3
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create user and group for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set up .next directory with correct permissions
RUN mkdir .next && chown nextjs:nodejs .next

# Copy built application and required files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts

# Make directory writable for SQLite files and set ownership
RUN chmod 755 /app && chown nextjs:nodejs /app

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
