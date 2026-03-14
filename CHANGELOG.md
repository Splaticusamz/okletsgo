# Changelog

## 2026-03-14
- Added transparent confidence scoring via `lib/scoring.js`, attaching `confidenceScore` and `confidenceReasons` to normalized candidate events and surfacing them in `/admin/sources` and `/admin/candidates`
- Added venue/address enrichment via `lib/enrich.js`, threaded normalized venue records through the JSON-backed store, and reported venue enrichment summary in source-run results
- Added candidate import flow from `/admin/sources` into review stage 1 with `/api/sources/import`, duplicate guards against existing store records, and preserved `scraper:<id>` provenance for imported events
- Updated schema docs plus task bookkeeping to mark T-029, T-030, T-031, and T-032 complete
- Added admin password auth with signed cookie login/logout, protected `/admin` plus admin mutation APIs, and kept the public homepage/public GET APIs accessible
- Added `lib/normalize.js` normalization + dedupe helpers and wired `/api/sources/run` plus `/admin/sources` to report raw/normalized/deduped results
- Expanded `lib/db.js` to a dual-adapter shape with a `VercelPostgresAdapter` scaffold, and documented why T-018 remains open until a real provisioned production DB is wired
- Added `lib/db.js` adapter boundary with `FileDbAdapter`, moved app routes to storage abstraction, and documented migration path in `docs/persistence.md`
- Added first ingestion stack: `lib/sources.js`, `lib/fetchers/`, `app/api/sources/route.js`, `app/api/sources/run/route.js`, and `/admin/sources`
- Added manual candidate intake via `/admin/manual` and `app/api/events/create/route.js`
- Marked T-026, T-068, and T-069 done in `data/tasks.json`; left T-018 open while the new adapter still targets JSON storage

## 2026-03-13
- Built asset review screen (`app/admin/assets/page.js`) — grid of 21 asset cards with placeholder thumbnails, status badges (pending/ready/failed), and Approve / Regenerate / Reject actions
- Built final publish screen (`app/admin/publish/page.js`) — ready-to-publish summary, disabled publish batch button, staged items table with asset/approve status chips
- Defined full data schema (`docs/schema.md`) — sources, raw_events, events, venues, image_candidates, assets, reviews, publish_batches
- Marked T-014, T-015, T-019 as done in data/tasks.json
