# OK LET'S GO Architecture

## Public app
- Next.js app router
- Homepage reads the latest published batch first
- Falls back to seed week data only when no published batch exists
- Generated media is served from `public/assets/<eventId>/`

## Admin app
Protected by signed-cookie auth.
Routes:
- `/admin` dashboard
- `/admin/candidates`
- `/admin/assets`
- `/admin/sources`
- `/admin/manual`
- `/admin/publish`
- `/admin/newsletter`
- `/admin/archives`

## Ingestion pipeline
1. Source fetchers pull raw source data
2. Normalize into common event shape
3. Score confidence
4. Dedupe against existing candidates/events
5. Enrich venue/address/tags/image candidates
6. Import into candidate review queue

## Review pipeline
- Stage 1 review -> `approved_1`
- Asset generation pipeline
- Stage 2 review -> `approved_2`
- Publish batch generation -> publish / rollback
- Newsletter draft generation from same approved/published batch

## Persistence
- App talks through `lib/db.js`
- Current default adapter is file-backed JSON
- Real production DB remains open work pending a provisioned durable backend

## Archives
- Published weeks are snapshotted
- Internal archive browser supports inspect/compare/reuse
- Archives remain admin-only
