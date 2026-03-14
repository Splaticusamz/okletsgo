# Persistence layer

## Current adapter

The app now reads and writes events through `lib/db.js`.

- `FileDbAdapter` is the current production adapter.
- It owns all access to `data/events.db.json`.
- `createDb()` exposes a stable interface for the app layer:
  - `getEvents()`
  - `getEvent(id)`
  - `createEvent(input)`
  - `createEvents(events)`
  - `updateEvent(id, patch)`
  - `addReview(eventId, review)`
  - `seedFromCurrentWeek()`

`lib/store.js` remains only as a compatibility shim so older imports do not break while routes/pages migrate.

## Why this counts as T-018 progress

Before this change, app routes imported flat-file helpers directly and implicitly depended on JSON storage details.
Now the app depends on a storage boundary instead of the file format itself.

That means the next storage move is adapter work, not app-wide rewrites.

## Next migration path

### SQLite

Recommended first database upgrade:

1. Add `SqliteDbAdapter` in `lib/db.js` or `lib/db/sqlite.js`
2. Implement the same adapter surface as `FileDbAdapter`
3. Add a small migration/import script from `data/events.db.json`
4. Switch the exported `db` instance by environment variable

### Postgres

After SQLite stabilizes:

1. Keep the same adapter interface
2. Move to a pooled connection model
3. Split `events`, `reviews`, `sources`, and future `assets` into normalized tables
4. Keep API/routes unchanged by swapping only the adapter

## Notes

- Current storage is still file-backed, but it is no longer ad hoc from the app's point of view.
- Manual event intake and review writes already go through the adapter boundary.
- Source fetcher runs currently return normalized candidates without persisting them automatically.
