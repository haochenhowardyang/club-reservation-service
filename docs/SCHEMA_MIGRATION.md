# Drizzle + SQLite on Fly.io — Post-Schema-Change Runbook

Use this checklist **every time you change your schema**.

## 0) Preconditions

* Your app uses `DATABASE_URL=file:/data/sqlite.db`.
* `migrations/` is committed to git.
* Your container runs migrations on start (e.g., entrypoint runs `npx drizzle-kit push:sqlite`).

---

## 1) Update schema in code

Edit your Drizzle schema (e.g., `src/lib/db/schema.ts`).

If you need a **data transform** (rename/drop/change type), plan a rebuild migration (see §5).

---

## 2) Generate a migration

```bash
# From project root
npx drizzle-kit generate
```

This creates a new SQL file under `drizzle/migrations`.

---

## 3) Review & (if needed) edit the migration

Open the generated SQL. If you’re doing anything SQLite can’t `ALTER` safely:

* Convert it to a **rebuild** migration (rename old table → create new table → `INSERT … SELECT …` → drop old).
* Wrap in a transaction.

Example skeleton:

```sql
BEGIN;
ALTER TABLE users RENAME TO users_old;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT INTO users (id, name, created_at)
SELECT id, name, datetime(created_at, 'unixepoch')
FROM users_old;

DROP TABLE users_old;
COMMIT;
```

---

## 4) Test locally

Use a local SQLite file (not your prod volume):

```bash
# Ensure local env points to a throwaway DB
export DATABASE_URL="file:./dev.sqlite"

# Apply the new migration
npx drizzle-kit push

# Optional: run your app, smoke test
npm run dev
```

If it fails, fix the SQL now—not in prod.

---

## 5) (Optional) Seed data or complex transforms

If you need seed rows or app-level transforms, either:

* Put simple `INSERT`s directly in the migration SQL, or
* Write a small TS script that runs **after** `push:sqlite` and commit it.

Example (run after push):

```bash
node scripts/seed.js
```

---

## 6) Commit

```bash
git add drizzle/migrations package*.json src/lib/db
git commit -m "feat(db): add X, transform Y -> Z"
```

---

## 7) Back up production volume (recommended)

```bash
# Find volume ID
fly volumes list
# Snapshot
fly volumes snapshots create <VOL_ID>
```

---

## 8) Deploy

Your entrypoint should run migrations automatically. If so, just:

```bash
fly deploy
```

**If you don’t migrate on boot**, do a one-off migrate on the machine that owns the volume:

```bash
fly ssh console
# inside VM:
export DATABASE_URL="file:/data/sqlite.db"
npx drizzle-kit push
exit
```

---

## 9) Verify in prod

```bash
fly logs -a <app-name> | grep -i drizzle
fly ssh console --command "ls -l /data | grep sqlite"
```

Optionally install sqlite CLI on the VM for a quick peek:

```bash
# Alpine-based image:
apk add --no-cache sqlite
sqlite3 /data/sqlite.db '.tables'
```

Run a quick app health check (hit an endpoint that touches the new schema).

---

## 10) Rollback plan (if needed)

* **Schema rollback**: create a new migration that reverses the change (don’t delete history).
* **Data rollback**: restore snapshot to a **new** volume, swap machine to attach it, or copy the file back:

  ```bash
  # If you saved a copy
  fly ssh sftp put sqlite.db /data/sqlite.db
  ```
* Redeploy.

---

## 11) Multi-machine notes

* SQLite is single-writer. Run migrations on **one** machine (the writer) before others start serving.
* If you scale out with per-machine volumes, each machine’s DB needs the migrations applied.

---

## 12) Common errors & fixes

**`attempt to write a readonly database`**

* DB path not `/data/sqlite.db` → fix `DATABASE_URL`.
* `/data` owned by `root` → `chown -R nextjs:nodejs /data` at runtime (entrypoint).

**`no such table: ...`**

* Migrations didn’t run on that volume → run `npx drizzle-kit push:sqlite` inside the VM.

**`NOT NULL constraint failed` / `UNIQUE constraint failed`**

* Your migration added constraints without default/backfill. Add `DEFAULT` or rebuild+`INSERT … SELECT …` to populate.

---

## 13) Example command sequence (happy path)

```bash
# 1) change schema.ts
# 2) generate migration
npx drizzle-kit generate:sqlite --out drizzle/migrations

# 3) review/edit migration if needed

# 4) test locally
export DATABASE_URL="file:./dev.sqlite"
npx drizzle-kit push:sqlite
npm test   # or run the app

# 5) commit
git commit -am "feat(db): orders table v2"

# 6) snapshot prod
fly volumes list
fly volumes snapshots create <VOL_ID>

# 7) deploy (entrypoint migrates on boot)
fly deploy

# 8) verify
fly logs
```

---

## 14) One-liner entrypoint (if you prefer CMD over a script)

```dockerfile
CMD ["sh", "-c", "chown -R nextjs:nodejs /data || true && npx drizzle-kit push:sqlite && node server.js"]
```

---

That’s it. Keep this runbook in your repo (e.g., `docs/db-migrations.md`) and follow it each time you change the schema.
