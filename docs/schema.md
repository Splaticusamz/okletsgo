# OK LET'S GO — Data Schema

This document describes the full data model for the OK LET'S GO platform.
All entities are described as logical records; physical storage (SQL, JSON, key-value) is TBD.

---

## sources

Tracks where events come from — scrapers, manual entry, feeds.

| Field        | Type                  | Description                              |
|--------------|-----------------------|------------------------------------------|
| id           | string (UUID)         | Unique source identifier                 |
| name         | string                | Human-readable label (e.g. "Tourism Kelowna RSS") |
| type         | enum: `scraper\|manual` | How events are ingested                |
| url          | string (URL)          | Source endpoint or base URL              |
| lastFetched  | ISO 8601 datetime     | Timestamp of most recent successful fetch |

---

## raw_events

Raw, unprocessed event data as fetched from a source. Immutable once stored.

| Field      | Type              | Description                                  |
|------------|-------------------|----------------------------------------------|
| id         | string (UUID)     | Unique raw event identifier                  |
| sourceId   | string (UUID)     | Reference to `sources.id`                   |
| rawData    | object (JSON)     | Original payload as received from the source |
| fetchedAt  | ISO 8601 datetime | When this record was fetched                 |

---

## events

Normalized, enriched event records — the core entity of the system.

| Field       | Type                                                              | Description                                         |
|-------------|-------------------------------------------------------------------|-----------------------------------------------------|
| id          | string (UUID)                                                     | Unique event identifier                             |
| title       | string                                                            | Display title                                       |
| date        | ISO 8601 date (YYYY-MM-DD)                                        | Event date                                          |
| startTime   | string (HH:MM, 24h)                                               | Start time, nullable                                |
| endTime     | string (HH:MM, 24h)                                               | End time, nullable                                  |
| venueId     | string (UUID)                                                     | Reference to `venues.id`                           |
| description | string                                                            | Event description, nullable                         |
| tags        | string[]                                                          | e.g. `["family", "free", "outdoor", "night"]`      |
| sourceId    | string (UUID)                                                     | Reference to `sources.id`                          |
| source      | string: `manual\|scraper:<name>`                                  | Provenance label (e.g. `scraper:tourism-kelowna`)  |
| status      | enum: `candidate\|approved\|rejected\|deferred\|published`        | Lifecycle state (see state machine below)           |
| createdAt   | ISO 8601 datetime                                                 | Record creation time                                |
| updatedAt   | ISO 8601 datetime                                                 | Last modification time                              |

### Event status state machine

```
candidate → approved → published
          ↓           ↑
        rejected    (re-approved after edit)
          ↓
        deferred → candidate (re-queued)
```

---

## venues

Location entities referenced by events.

| Field   | Type              | Description                       |
|---------|-------------------|-----------------------------------|
| id      | string (UUID)     | Unique venue identifier           |
| name    | string            | Venue display name                |
| address | string            | Street address, nullable          |
| city    | string            | City name                         |
| lat     | number (float)    | Latitude, nullable                |
| lng     | number (float)    | Longitude, nullable               |

---

## image_candidates

Candidate images gathered for an event before asset creation.

| Field       | Type            | Description                                          |
|-------------|-----------------|------------------------------------------------------|
| id          | string (UUID)   | Unique image candidate identifier                    |
| eventId     | string (UUID)   | Reference to `events.id`                            |
| url         | string (URL)    | Remote URL or local path to the image                |
| provenance  | string          | Where the image came from (e.g. `google`, `manual`, `venue-site`) |
| selected    | boolean         | Whether this image was chosen for asset generation   |

---

## assets

Generated animation/still assets for a specific event.

| Field              | Type                               | Description                                    |
|--------------------|------------------------------------|------------------------------------------------|
| id                 | string (UUID)                      | Unique asset identifier                        |
| eventId            | string (UUID)                      | Reference to `events.id`                      |
| imageCandidateId   | string (UUID)                      | Reference to `image_candidates.id`, nullable  |
| animationPath      | string (file path or URL)          | Path to the generated animation (mp4/webm)    |
| stillPath          | string (file path or URL)          | Path to the fallback still image (jpg/png)    |
| status             | enum: `pending\|ready\|failed`     | Pipeline output status                         |
| generatedAt        | ISO 8601 datetime                  | When asset generation completed, nullable      |

---

## reviews

Audit trail of every review action taken on an event.

| Field       | Type                                                       | Description                                          |
|-------------|------------------------------------------------------------|------------------------------------------------------|
| id          | string (UUID)                                              | Unique review record identifier                      |
| eventId     | string (UUID)                                              | Reference to `events.id`                            |
| stage       | number: `1\|2`                                             | Review stage (1 = before asset creation, 2 = before publish) |
| action      | enum: `approve\|reject\|defer\|reassign\|hold`             | Action taken                                         |
| reviewedBy  | string                                                     | Identifier of the reviewer (user id or name)         |
| reviewedAt  | ISO 8601 datetime                                          | When the review action was recorded                  |
| notes       | string                                                     | Optional reviewer notes, nullable                    |

---

## publish_batches

A weekly batch of approved, asset-ready events that gets published to the public site.

| Field       | Type                                           | Description                                       |
|-------------|------------------------------------------------|---------------------------------------------------|
| id          | string (UUID)                                  | Unique batch identifier                           |
| weekLabel   | string (YYYY-MM-DD)                            | The week this batch covers (Monday's date)       |
| eventIds    | string[] (UUIDs)                               | Ordered list of event IDs included in the batch  |
| publishedAt | ISO 8601 datetime                              | When the batch was published, nullable            |
| publishedBy | string                                         | Identifier of who triggered the publish           |
| status      | enum: `draft\|published\|rolled_back`          | Batch lifecycle state                             |

### Batch status transitions

```
draft → published → rolled_back
      ↑ (can be re-published after rollback)
```

---

## Notes

- All `id` fields are UUIDs (v4).
- Timestamps are UTC ISO 8601 strings.
- This schema is intentionally database-agnostic. Initial implementation uses flat JSON files under `data/`; future migration to SQLite or Postgres is planned (see T-018).
- The `events.status` state machine is formalized in T-020.
