# Persistence layer

## Current adapter setup

The app now reads and writes events through `lib/db.js`.

- `FileDbAdapter` is the active adapter used by default.
- `VercelPostgresAdapter` now exists as the production-safe adapter scaffold.
- `createDb()` selects an adapter via `DB_PROVIDER`.
- The app layer still talks to one stable interface:
  - `getEvents()`
  - `getEvent(id)`
  - `createEvent(input)`
  - `createEvents(events)`
  - `updateEvent(id, patch)`
  - `addReview(eventId, review)`
  - `seedFromCurrentWeek()`

`lib/store.js` remains a compatibility shim for older imports.

## Why T-018 is still open

A JSON file in the repo/runtime is not real deploy-safe persistence on Vercel.
Serverless filesystem writes are not durable across invocations or deployments, so file-backed JSON and local SQLite-in-project would both be misleading as a "real DB" in production.

The blocker is concrete:

- no provisioned production database is wired into this repo/session yet
- no Vercel Postgres client/package/config has been landed and exercised end-to-end
- therefore the app cannot truthfully claim deploy-safe persistent storage beyond the current file adapter

## What is landed now

- The storage boundary is real and app routes already depend on it.
- A production adapter slot now exists via `DB_PROVIDER=vercel-postgres`.
- If that provider is selected today, the adapter throws a clear blocker message instead of silently pretending persistence is solved.

## Next step to close T-018 for real

1. Provision Vercel Postgres for the project.
2. Add the runtime client/dependency and schema migration.
3. Implement `VercelPostgresAdapter` operations against the live database.
4. Set `DB_PROVIDER=vercel-postgres` in Vercel.
5. Verify create/review/admin mutations persist across deployments.

Until then, T-018 should remain open.
