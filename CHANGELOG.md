# Changelog

## 2026-03-14
- Added `lib/db.js` adapter boundary with `FileDbAdapter`, moved app routes to storage abstraction, and documented migration path in `docs/persistence.md`
- Added first ingestion stack: `lib/sources.js`, `lib/fetchers/`, `app/api/sources/route.js`, `app/api/sources/run/route.js`, and `/admin/sources`
- Added manual candidate intake via `/admin/manual` and `app/api/events/create/route.js`
- Marked T-026, T-068, and T-069 done in `data/tasks.json`; left T-018 open while the new adapter still targets JSON storage

## 2026-03-13
- Built asset review screen (`app/admin/assets/page.js`) — grid of 21 asset cards with placeholder thumbnails, status badges (pending/ready/failed), and Approve / Regenerate / Reject actions
- Built final publish screen (`app/admin/publish/page.js`) — ready-to-publish summary, disabled publish batch button, staged items table with asset/approve status chips
- Defined full data schema (`docs/schema.md`) — sources, raw_events, events, venues, image_candidates, assets, reviews, publish_batches
- Marked T-014, T-015, T-019 as done in data/tasks.json
