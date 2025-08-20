# Deployment Guide - Club Reservation Service

This guide covers deploying the Club Reservation Service to Fly.io with database migrations.

## Prerequisites

1. [Fly.io CLI](https://fly.io/docs/getting-started/installing-flyctl/) installed
2. Authenticated with Fly.io: `flyctl auth login`
3. App created: `flyctl apps create club-reservation-service`

## Deployment Process

### Step 1: Deploy Application

Run the deployment script:

```bash
./scripts/deployment/deploy.sh
```

This will:
- Check prerequisites
- Create/use persistent volume for database
- Set environment variables
- Deploy the application

### Step 2: Run Database Migration

After successful deployment, run migrations on the production database:

```bash
flyctl ssh console -C "cd /app && npm run db:migrate-prod"
```

This will:
- Connect to the production database (`/data/sqlite.db`)
- Apply any pending migrations
- Track applied migrations to prevent duplicates

## Migration Details

### Current Migration: `0001_fix_poker_games_schema`

This migration fixes the schema mismatch that was causing the SQLite error:

- **Adds**: `blind_level` column to `poker_games` table
- **Removes**: `max_players`, `current_players`, `end_time` columns
- **Preserves**: All existing data

### Migration Files

- `drizzle/0001_fix_poker_games_schema.sql` - SQL migration script
- `scripts/database/migrate-production.js` - Migration runner for production
- `drizzle/meta/_journal.json` - Migration tracking metadata

## Troubleshooting

### Common Issues

1. **Migration already applied**: Safe to re-run, will be skipped
2. **Database locked**: Ensure no other processes are accessing the database
3. **Foreign key constraints**: The migration handles this automatically

### Rollback (if needed)

If you need to rollback:

```bash
# SSH into production
flyctl ssh console

# Connect to database
sqlite3 /data/sqlite.db

# Check current schema
.schema poker_games

# Manual rollback if needed (backup recommended)
```

### Verification

After migration, verify the fix:

```bash
# Check app logs
flyctl logs

# Test the reservation page
# Visit your app and try to access poker reservations
```

## Monitoring

- **App Status**: `flyctl status`
- **Logs**: `flyctl logs`
- **Database**: `flyctl ssh console` then `sqlite3 /data/sqlite.db`

## Backup

Before major migrations, create volume snapshots:

```bash
# List volumes
flyctl volumes list

# Create snapshot
flyctl volumes snapshots create <volume-id>

# List snapshots
flyctl volumes snapshots list <volume-id>
```

## Next Steps

1. Deploy the application
2. Run the migration
3. Test the poker reservation functionality
4. Monitor for any issues
5. Create a backup snapshot

The SQLite error should be resolved once the migration is applied.
