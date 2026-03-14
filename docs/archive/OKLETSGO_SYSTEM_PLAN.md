# OK LET'S GO — System Plan

Last updated: 2026-03-13
Status: Active build plan
Scope: Public site + internal ops pipeline + approval workflow + archives

---

## 1. Core decision

Everything should live under the `okletsgo.ca` domain.

### Public experience
- Primary public site:
  - `https://okletsgo.ca/`
- This homepage is the live, current-week event calendar.
- The visible event cards on the site should be **dynamic**, driven by the approved curation pipeline rather than hardcoded static content.

### Internal operations app
Use a path prefix on the same domain, not a separate subdomain.

Preferred path:
- `https://okletsgo.ca/admin`

Reasoning:
- keeps the brand/domain unified
- easier to manage under one deployment surface
- simpler for internal use on desktop and mobile
- easier to later wrap in a mobile webview/PWA if desired
- avoids splitting product logic across multiple domains/subdomains too early

Potential internal route structure:
- `/admin` — dashboard
- `/admin/runs` — weekly runs
- `/admin/candidates` — scraped event candidates
- `/admin/review-1` — first approval queue
- `/admin/assets` — asset creation/review queue
- `/admin/calendar` — final weekly calendar builder
- `/admin/review-2` — final approval queue
- `/admin/archive` — internal archive browser
- `/admin/settings` — source, pipeline, and publishing settings

---

## 2. Product architecture

The product has 3 connected surfaces:

### A. Public calendar site
Purpose:
- show the currently approved week
- drive newsletter signups
- later show sponsors

Behavior:
- homepage reflects the latest approved publish batch
- event cards are generated from approved pipeline data
- card media should use optimized local assets
- mode/day filtering should respond to event categorization data
- event content should be editable/overridable from admin

### B. Internal ops/admin app
Purpose:
- approve candidates
- review assets
- curate final weekly lineup
- publish site/newsletter
- inspect previous runs

### C. Background pipeline
Purpose:
- scrape sources
- normalize and dedupe events
- enrich venues and locations
- gather image candidates
- create cropped/optimized/animated assets
- assemble site/newsletter outputs

---

## 3. Double approval system

Automation should be aggressive, but publishing should remain human-supervised through **double approval**.

### Approval 1 — Candidate approval
Happens **before asset creation**.

Approvers:
- Sam
- Adrian

Purpose:
- verify that candidate events are worth including
- reject junk before spending time/tokens on assets
- select the right source and image direction early

At this stage, reviewers should be able to:
- approve candidate
- reject candidate
- defer candidate
- change date assignment
- change family/day/night/grown-up flags
- resolve duplicates
- choose the preferred image candidate
- mark event as “manual attention needed”

Resulting status transitions:
- `needs_review_1 -> approved_for_assets`
- `needs_review_1 -> rejected`
- `needs_review_1 -> deferred`

### Approval 2 — Final publish approval
Happens **after copy, cards, and assets are assembled**.

Purpose:
- verify that the exact content going live is correct
- approve the site output and newsletter output

At this stage, reviewers should be able to:
- approve final card
- reject/regenerate asset
- edit headline/summary/details
- reorder featured events
- swap event placements
- hold events for another week
- approve final weekly publish batch

Resulting status transitions:
- `needs_review_2 -> approved_for_publish`
- `needs_review_2 -> rejected_for_rework`
- `needs_review_2 -> held`

---

## 4. Public site requirements

## Homepage
The root homepage should always show the current live week.

Requirements:
- event cards pulled dynamically from the current approved publish batch
- no hardcoded weekly content once pipeline integration is complete
- card visuals reflect current approved assets
- filters/toggles should be driven by event metadata
- signup CTA remains prominent
- future sponsor slots can be injected from admin

## Dynamic event card behavior
Each card should be built from structured data:
- event title
- event type
- date
- mode (`day`, `night`, `family`, `grownup`)
- city
- venue
- summary
- pricing
- start/end times
- ticket link / source link
- weather sensitivity
- fallback still image
- optimized animated asset

## Media rules
- fallback still always available
- optimized animated asset loads on top
- local optimized assets preferred over remote provider URLs
- lazy loading on mobile
- lightweight loading spinner during playback startup
- spinner disappears only after playback actually advances

## Archives
There must be a concept of weekly version history.

Public behavior for now:
- archives remain internal only

Later optional public routes:
- `/archive`
- `/archive/2026-03-09`
- `/archive/week-of-2026-03-09`

For now, archive visibility should be internal in admin only.

---

## 5. Weekly archives/version history

This is a required system feature.

### What to archive
Every weekly publish batch should be stored permanently with:
- selected events
- full event metadata
- approved copy
- approved assets
- placement/order
- publish time
- approver(s)
- source provenance

### Why this matters
- lets us inspect prior weeks
- gives rollback capability
- enables future public archive pages
- enables analytics and retrospectives
- preserves historical site versions without relying on Git alone

### Archive model
Every publish run creates a durable `publish_batch` snapshot.

Recommended identifiers:
- `week_start_date`
- `week_end_date`
- `batch_id`
- `published_at`
- `approved_by`
- `status` (`draft`, `approved`, `published`, `archived`)

### Internal archive view should allow:
- browse by week
- compare weeks
- reopen previous week
- duplicate a previous event/card into current week
- audit source and asset history

---

## 6. Data model

Use a real database from the start.

Initial recommendation:
- SQLite for first implementation if speed matters most
- Postgres if we want fewer migrations later

Preferred entity model:

### Sources
Tracks event sources.
- id
- name
- type
- base_url
- enabled
- fetch_frequency
- scraper_key

### Raw events
Unprocessed source records.
- id
- source_id
- external_id
- raw_payload
- fetched_at
- source_url

### Events
Canonical normalized event.
- id
- title
- slug
- description_raw
- description_summary
- category
- city
- venue_id
- source_confidence
- overall_confidence
- status

### Event occurrences
For date/time instances.
- id
- event_id
- start_at
- end_at
- timezone
- week_key

### Venues
- id
- name
- address
- city
- latitude
- longitude
- website
- social_links
- venue_type

### Image candidates
- id
- event_id / venue_id
- original_url
- source_url
- provenance_type
- width
- height
- score
- selected
- local_path

### Assets
- id
- event_id
- image_candidate_id
- asset_type (`still`, `optimized_mp4`, `optimized_webm`, `newsletter`, `thumb`)
- local_path
- source_generation_method
- prompt
- status
- created_at

### Reviews
- id
- target_type
- target_id
- review_stage (`approval_1`, `approval_2`)
- reviewer
- action
- notes
- created_at

### Publish batches
- id
- week_key
- status
- approved_at
- published_at
- approved_by
- payload_snapshot_json

### Publish batch items
- id
- publish_batch_id
- event_id
- day_index
- slot_index
- mode
- chosen_asset_id
- chosen_copy

---

## 7. State machine

Every event should move through a defined state machine.

Suggested lifecycle:
- `scraped`
- `normalized`
- `deduped`
- `needs_review_1`
- `approved_for_assets`
- `asset_processing`
- `asset_ready`
- `needs_review_2`
- `approved_for_publish`
- `published`
- `held`
- `rejected`

Benefits:
- easier ops debugging
- easier UI filtering
- easier retries/recovery
- clearer approval boundaries

---

## 8. Source ingestion plan

Initial target sources should cover the Okanagan broadly with manageable complexity.

Suggested first-source set:
- Tourism Kelowna
- Castanet events
- KelownaNow events
- Eventbrite Okanagan queries
- winery calendars
- brewery/restaurant event pages
- municipal/community calendars
- major venue calendars

Later additions:
- Facebook event discovery layer
- more city-specific calendars
- tourism boards outside Kelowna
- chambers and associations

### Source pipeline steps
1. fetch raw events
2. parse fields
3. normalize date/time/location
4. dedupe similar events
5. confidence-score
6. queue for review 1

---

## 9. Enrichment requirements

For each approved candidate or high-confidence candidate:
- resolve venue/location identity
- find official website
- find map/address data
- find ticket URL
- find business metadata
- gather real photos of venue/location/event context
- categorize event into:
  - day / night
  - family / grownup
  - free / paid
  - indoor / outdoor
  - tourism / local

### Image sourcing rules
Priority order:
1. real venue/event/location photo
2. official business/location imagery
3. social/business public photos
4. generated enhancement only when needed

Every chosen image must retain provenance.

---

## 10. Asset pipeline rules

Assets should be standardized for card use.

### Asset stages
1. choose source still
2. crop to card-safe framing
3. standardize dimensions
4. generate animated version
5. optimize for web delivery
6. store both fallback still and animated output locally

### Standards
- crop to card viewport ratio
- center-biased framing unless manual override
- local optimized MP4/WebM preferred
- small poster/still fallback retained
- animated asset should be lightweight enough for mobile

### Review capability needed
For each asset:
- view source still
- view crop
- view animation
- regenerate animation
- swap image source
- mark as use still only

---

## 11. Admin app requirements

Build as a responsive web app under `/admin`.

### Minimum required screens

#### Dashboard
- run health
- queue counts by state
- failures
- upcoming publish deadline

#### Candidates screen
- list of events needing approval 1
- grouped by date/status
- search/filter/sort
- bulk approve/reject

#### Candidate detail screen
- event summary
- all source links
- duplicate candidates
- venue/location info
- image candidates
- approval controls

#### Assets screen
- currently generating
- failed jobs
- ready assets
- preview and regenerate actions

#### Calendar builder
- current week layout
- drag/drop ordering
- day assignment
- mode assignment
- “featured” control

#### Final review screen
- exact public output preview
- newsletter block preview
- publish/hold/rework actions

#### Archive screen
- browse previous weeks
- inspect what went live
- restore/reference older items

---

## 12. UX requirements for approval

The approval flow must be very low friction.

### Desktop UX
- keyboard shortcuts
- fast triage actions
- split-pane preview
- bulk actions

### Mobile UX
- touch-friendly review cards
- swipe or one-tap approval controls
- fast preview loading
- minimal form fields

### Desired shortcuts/actions
- approve
- reject
- defer
- assign to day
- assign mode
- choose photo
- regenerate asset
- mark for manual review

The UI should feel like triage, not data entry.

---

## 13. Publish system

Publishing should create a deterministic weekly output.

### Site publishing
The system should generate the current live week from the approved `publish_batch`.

Public site should read from:
- latest approved/published weekly batch

### Newsletter publishing
Later, the same approved weekly batch should feed Beehiiv draft generation.

That means the site and newsletter should be siblings derived from the same curated batch, not separate manual processes.

---

## 14. Recommended implementation structure

Preferred long-term structure:
- one app for public site
- one internal admin surface under same domain/app routing
- background workers for scraping/assets/publish

Practical implementation options:

### Option A — Single Next.js app
- `/` public site
- `/admin/*` internal app
- API routes/server actions included

Pros:
- one deploy target
- simpler shared types/components
- ideal for domain/path-based approach

This is the preferred direction for now.

---

## 15. Build sequence

We should build this in vertical slices so it becomes usable early.

### Phase 1 — Foundation
- establish app structure under `okletsgo.ca`
- set up DB
- define schema
- define state machine
- create admin shell under `/admin`

### Phase 2 — Intake and Review 1
- implement first source ingestion
- normalize/dedupe
- candidate list UI
- candidate approval UI

### Phase 3 — Enrichment and images
- venue lookup
- image candidate gathering
- image scoring/provenance
- source image selection UI

### Phase 4 — Asset pipeline
- crop/standardization pipeline
- animation pipeline
- optimization pipeline
- asset review UI

### Phase 5 — Calendar assembly and Review 2
- current week builder
- final review UI
- publish batch creation
- public homepage driven from published batch

### Phase 6 — Archives
- archive storage
- internal archive browser
- previous week detail pages

### Phase 7 — Newsletter integration
- Beehiiv draft creation
- final approval/send flow
- analytics hooks

---

## 16. Non-negotiable rules

These rules should be respected as the system is built.

1. **Public homepage must be dynamic**
   - event cards come from approved batch data

2. **Everything stays under `okletsgo.ca`**
   - internal app uses path prefix, not separate domain for now

3. **Double approval is required**
   - before assets
   - before publish

4. **Archives are first-class**
   - every published week must be snapshot-stored

5. **Provenance must be preserved**
   - source event links
   - image source links
   - asset generation metadata

6. **Automation exists to reduce workload, not remove judgment**
   - curation stays human
   - repetitive work becomes automated

7. **The system must be mobile-usable**
   - web-first, mobile-friendly from day one

8. **The admin experience must be fast**
   - low-friction review, not cumbersome forms

---

## 17. Immediate next step

The next implementation milestone should be:

### Milestone: Admin foundation + dynamic data model
Deliverables:
- app structure decision finalized
- database initialized
- event/source/review/publish schema created
- `/admin` shell created
- public site prepared to read from published batch data instead of hardcoded cards

This is the base that everything else should attach to.

---

## 18. Working principle

The goal is not just to build a site.
The goal is to build a **repeatable local media operating system**.

That system should:
- discover
- enrich
- visualize
- queue
- approve
- publish
- archive

With minimal manual work outside of taste, curation, and final approval.

---

## 19. Change management note

This file is the canonical build reference for the OK LET'S GO system.
Any major product or architecture change should update this file so the implementation stays aligned with the intended workflow.
