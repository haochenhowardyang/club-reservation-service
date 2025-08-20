#!/bin/sh
set -e

# Ensure mounted volume is writable by app user (build-time chown doesn't affect volumes)
chown -R nextjs:nodejs /data 2>/dev/null || true

# Run Drizzle migrations (creates /data/sqlite.db on first boot)
echo "[init] Running Drizzle migrations..."
npx drizzle-kit push:sqlite
echo "[init] Migrations complete."

# Drop privileges and start the server
exec su-exec nextjs:nodejs "$@"
