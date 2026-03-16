# OK LET'S GO — Complete Project Documentation

**Version:** 1.0.0
**URL:** https://okletsgo.ca
**Admin:** https://okletsgo.ca/admin
**Last Updated:** March 16, 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [User Experience](#3-user-experience)
4. [Business Model & Strategy](#4-business-model--strategy)
5. [Content Pipeline](#5-content-pipeline)
6. [Admin Panel](#6-admin-panel)
7. [Technical Architecture](#7-technical-architecture)
8. [API Reference](#8-api-reference)
9. [Data Model](#9-data-model)
10. [Deployment & Infrastructure](#10-deployment--infrastructure)
11. [Event Scraping System](#11-event-scraping-system)
12. [Discord Integration](#12-discord-integration)
13. [AI & Media Generation](#13-ai--media-generation)
14. [Newsletter System](#14-newsletter-system)
15. [Security](#15-security)
16. [Roadmap](#16-roadmap)

---

## 1. Executive Summary

**OK LET'S GO** is a curated weekly events platform for the Okanagan Valley, BC, Canada. It answers one question: *"What should I do this week?"*

The platform presents 7 days × 3 modes (daytime, nightlife, family) = **21 event slots** per week, displayed as interactive cards on a single-page responsive web app. Events are sourced through automated scraping, Discord-based community curation, and manual entry — then reviewed, enriched with media, and published through an admin calendar.

### Key Differentiators
- **Curated, not aggregated** — Every event is reviewed before publishing
- **Three audience modes** — Toggle between daytime, nightlife, and family-friendly
- **Visual-first** — Full-bleed card imagery with hover video animations
- **Weekly cadence** — Fresh content every week, countdown timer visible

---

## 2. Product Overview

### 2.1 What It Is
A weekly event guide for the Okanagan Valley (Kelowna, Penticton, Vernon, West Kelowna, and surrounding areas). Think of it as a curated "what's on" magazine that resets every Sunday night.

### 2.2 Target Audience
| Segment | Description | Mode |
|---------|-------------|------|
| Locals (21-45) | Looking for nightlife, bars, live music | 🌙 Night |
| Locals (25-55) | Daytime activities, wine tours, dining | ☀️ Grown-up |
| Families | Kid-friendly events, parks, festivals | 👨‍👩‍👧 Family |
| Tourists | Visiting the Okanagan, want local picks | All modes |

### 2.3 Core Value Proposition
Instead of scrolling through Facebook Events, Tourism Kelowna, Castanet, and Eventbrite separately, users get **one page** with the best picks for every day of the week, tailored to their vibe.

---

## 3. User Experience

### 3.1 Homepage (okletsgo.ca)

The homepage is a single full-viewport layout with no scrolling required on desktop.

**Layout (Desktop):**
```
┌──────────────────────────────────────┐
│ OK        [Family toggle] [Day/Night]│
│ LET'S                                │
│ GO                                   │
│                                      │
│ ┌───┬───┬───┬───┬───┬───┬───┐       │
│ │MON│TUE│WED│THU│FRI│SAT│SUN│       │
│ │   │   │   │   │   │   │   │       │
│ │   │   │   │   │   │   │   │       │
│ └───┴───┴───┴───┴───┴───┴───┘       │
│                                      │
│ List resets in 42:15:30              │
└──────────────────────────────────────┘
```

**Layout (Mobile — 2-column mosaic):**
```
┌────────┬────────┐
│  MON   │  CTA   │ ← Newsletter square
│  (2x)  │ (1x)   │
├────────┤────────┤
│  WED   │  TUE   │
│  (2x)  │  (2x)  │
├────────┤────────┤
│  FRI   │  THU   │
│  (2x)  │  (2x)  │
├────────┤────────┤
│  SUN   │  SAT   │
│  (2x)  │  (2x)  │
│        ├────────┤
│        │ BRAND  │ ← Logo square
└────────┴────────┘
   List resets in…
```

### 3.2 Card Behavior

Each card represents one day of the week. Cards have **3 image layers** (one per mode) that slide vertically when the user toggles between modes.

| Mode | Content | Visual Style |
|------|---------|-------------|
| ☀️ Grown-up | Daytime/adult events (wine tours, dining, concerts) | Bright, warm tones |
| 🌙 Night | Nightlife (bars, live music, comedy) | Dark, ambient, moody |
| 👨‍👩‍👧 Family | Family-friendly (parks, festivals, kid events) | Colorful, inviting |

**Interactions:**
- **Desktop hover** — Floating tooltip shows event details (venue, weather, time)
- **Desktop hover (with video)** — Still image fades to looping video animation
- **Mobile tap** — Bottom sheet slides up (40% of screen) with full event details
- **Mode toggle** — Cards animate between image layers with staggered transitions

### 3.3 Visual Identity

| Element | Value |
|---------|-------|
| Primary accent | `#F7795F` (warm coral) |
| Dark mode bg | `#0D1023` (deep navy) |
| Light mode bg | `#FFF5F2` (warm cream) |
| Font | Inter (system fallback) |
| Card radius | 10px |
| Day name size | 42px (mobile), proportional (desktop) |

### 3.4 Countdown Timer
A live countdown to Sunday midnight UTC shows when the current week's list resets. Format: `HH:MM:SS`. Centered in the footer on mobile.

### 3.5 Empty States
When a day has no event assigned:
- Card shows dark gradient background
- Day name still displays prominently
- No venue or city text

---

## 4. Business Model & Strategy

### 4.1 Revenue Streams (Planned)
1. **Newsletter sponsorships** — Weekly email with sponsored event highlights
2. **Featured placements** — Venues pay to be featured in prime slots
3. **Affiliate partnerships** — Ticket/booking links with referral commissions
4. **Video ad slots** — Card video animations can incorporate sponsor branding

### 4.2 Growth Strategy
1. **Phase 1 (Current):** Build content pipeline, establish weekly cadence
2. **Phase 2:** Launch newsletter with subscriber growth
3. **Phase 3:** Introduce featured/sponsored placements
4. **Phase 4:** Expand to other BC regions (Victoria, Vancouver)

### 4.3 Content Sources
| Source | Type | Volume | Status |
|--------|------|--------|--------|
| Tourism Kelowna | Automated scraping | ~90 events/week | ✅ Active |
| Castanet | Automated scraping | ~40 events/week | ✅ Active |
| Eventbrite | Automated scraping | Blocked | ❌ CSRF protection |
| Manual entry | Admin panel | As needed | ✅ Active |
| Community | Discord submissions | Variable | ✅ Active |

---

## 5. Content Pipeline

The content pipeline is the core workflow from event discovery to homepage publication.

### 5.1 Pipeline Overview

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ DISCOVER  │───▶│ CANDIDATE│───▶│ APPROVED │───▶│  ASSETS  │───▶│ PUBLISH  │
│           │    │          │    │          │    │          │    │          │
│ • Scrape  │    │ • Review │    │ • Images │    │ • Card   │    │ Calendar │
│ • Discord │    │ • ✅ / ❌ │    │ • Video  │    │ • Video  │    │ • Drag   │
│ • Manual  │    │          │    │ • Crop   │    │ • Animate│    │ • Confirm│
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### 5.2 Event Statuses

| Status | Meaning | Where |
|--------|---------|-------|
| `candidate` | Newly discovered, awaiting review | Candidates page |
| `approved_1` | Passed first review | Assets page |
| `approved_2` | Asset built, ready for calendar | Publish page |
| `rejected` | Not suitable — hidden everywhere | — |
| `deferred` | Saved for later consideration | Candidates page |
| `published` | Live on homepage (legacy) | Homepage |

### 5.3 Pipeline Steps

**Step 1: Discovery**
- Automated scrapers run on the server (Tourism Kelowna, Castanet)
- Events posted to Discord #candidates with ✅/❌ buttons
- Manual entry via admin panel
- Token-authenticated ingest API for external integrations

**Step 2: Candidate Review**
- Admin reviews candidates at `/admin/candidates`
- Approve (→ `approved_1`) or Reject (→ `rejected`)
- Metadata displayed: venue, city, time, address, source

**Step 3: Asset Building**
- At `/admin/assets`, select an approved event
- **Find Images** — automated search using event metadata:
  - Venue photos (Bing image search by venue name + city)
  - Event page images (scraped from source URL)
  - AI-generated images (fal.ai Flux based on event description)
- Select best image → crop to 1:2 portrait ratio
- **Build Card** — creates the card asset
- **Animate** — sends to fal.ai Kling v2 for video generation (30-60s)

**Step 4: Publishing**
- At `/admin/publish`, drag approved events onto the weekly calendar
- 7 days × 3 modes = 21 slots
- Changes are local drafts until **Publish** is clicked with confirmation
- Published calendar is the **single source of truth** for the homepage

---

## 6. Admin Panel

**URL:** https://okletsgo.ca/admin
**Password:** Set via `ADMIN_PASSWORD` environment variable

### 6.1 Dashboard (`/admin`)

Overview page with:
- **Week Planner** — 7-day grid showing all events by day/mode
- Mode coverage indicators (☀️ 🌙 👨‍👩‍👧)
- Event count stats
- Quick links to all admin sections

### 6.2 Candidates (`/admin/candidates`)

Review incoming events from all sources.

| Action | Result |
|--------|--------|
| ✅ Approve | Moves to `approved_1`, available in Assets |
| ❌ Reject | Hidden from all views |
| 🔄 Defer | Kept for future consideration |

Each candidate displays:
- Title, venue, city
- Date, start/end time
- Mode (day/night/family)
- Source (scraper name, Discord, manual)
- Description
- Tagged metadata chips

### 6.3 Asset Studio (`/admin/assets`)

The production workspace for building card visuals.

**Left panel:** Event queue (approved events)
**Center:** Preview + Image Gallery
**Right:** Metadata editor + Action buttons

**Image Gallery features:**
- **Find Images** button triggers multi-source search:
  - 🏢 Venue photos — searched by venue name + city + venue type
  - 🎫 Event images — scraped from event source URL
  - 🤖 AI generated — fal.ai Flux Schnell with context-aware prompts
- Categorized sections with descriptions
- Click any image → **Lightbox** with full preview + source info
- **Select & Crop** → 1:2 portrait crop modal with drag positioning
- Source tags: Venue (blue), Event (purple), AI (pink), Upload (green), Scraper (orange), Discord (indigo)

**Search strategy transparency:**
After fetching, a metadata panel shows exactly what queries were used:
- Venue: `"Cedar Creek Winery" Kelowna photo`
- Event: `"Wine & Cheese Night" "Cedar Creek Winery"`
- AI: `Professional editorial photograph: wine tasting at Cedar Creek Winery in Kelowna...`

**Actions:**
- 🎨 **Build Card** — Creates asset from selected image
- 🎬 **Animate** — Generates video via fal.ai (shows progress: "Sending to fal.ai… 30-60 seconds")
- ✓ **Approve Card** — Advances to `approved_2`
- ✗ **Reject** — Removes from pipeline

### 6.4 Publish Calendar (`/admin/publish`)

Drag-and-drop weekly calendar for placing events on the homepage.

**Grid:** 7 columns (Mon–Sun) × 3 rows (Family, Grown-up, Night)

**Workflow:**
1. Drag approved events from the sidebar onto calendar slots
2. Rearrange freely — changes are local only
3. Yellow "Unpublished changes" indicator appears
4. Click **🚀 Publish Changes** → confirmation dialog
5. Confirmed → saves to DB → homepage updates immediately

**Rules:**
- Night events can only go in night slots
- Non-night events can only go in day/family slots
- Events can be dragged between slots
- Remove button (×) clears a slot
- Progress bar shows slots filled / 21 total

### 6.5 Sources (`/admin/sources`)

Manage automated event scrapers.

Available sources:
- Tourism Kelowna (Simpleview CMS REST API)
- Castanet (HTML scraping)
- Eventbrite Kelowna (blocked by CSRF — inactive)
- Generic fetcher (configurable for new sources)

### 6.6 Newsletter (`/admin/newsletter`)

Draft and manage weekly newsletter content (Beehiiv integration planned).

### 6.7 Archives (`/admin/archives`)

Historical view of past weeks and their published events.

### 6.8 Manual Entry (`/admin/manual`)

Form to manually create events with full metadata:
- Title, venue, city, address
- Date, start/end time
- Mode (day/night/family)
- Description
- Source URL

### 6.9 Guide (`/admin/guide`)

Built-in documentation with 9 sub-pages:
- Pipeline overview
- Candidates workflow
- Assets workflow
- Publishing workflow
- Sources management
- Newsletter management
- Archives
- Manual entry

---

## 7. Technical Architecture

### 7.1 Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Runtime | Node.js 22 |
| Frontend | React 18 (Client Components) |
| Styling | CSS (globals.css, component-scoped `<style>`) |
| Database | Neon Postgres (JSONB in kv table) |
| Hosting | Vercel (Hobby plan) |
| Media | Vercel Blob Storage |
| AI Images | fal.ai Flux Schnell |
| AI Video | fal.ai Kling v2 Master |
| Scraping | Puppeteer (server-side) |
| DNS/Domain | okletsgo.ca |

### 7.2 Project Structure

```
okletsgo/
├── app/
│   ├── page.js                    # Homepage (dynamic, reads from DB)
│   ├── layout.js                  # Root layout
│   ├── globals.css                # All public-facing styles
│   ├── admin/
│   │   ├── page.js                # Dashboard
│   │   ├── candidates/page.js     # Candidate review
│   │   ├── assets/page.js         # Asset studio
│   │   ├── publish/page.js        # Publish calendar
│   │   ├── sources/page.js        # Scraper management
│   │   ├── newsletter/page.js     # Newsletter editor
│   │   ├── archives/page.js       # Historical weeks
│   │   ├── manual/page.js         # Manual event entry
│   │   ├── login/page.js          # Admin login
│   │   └── guide/                 # Built-in docs (9 pages)
│   └── api/
│       ├── events/                # CRUD + review + images
│       ├── assets/                # Generate + animate
│       ├── calendar/assign/       # Publish calendar assignments
│       ├── publish/batch/         # Legacy publish batches
│       ├── sources/               # Scraper management
│       ├── newsletter/            # Newsletter drafts
│       ├── archives/              # Archive retrieval
│       └── admin/                 # Login/logout
├── components/
│   ├── HomepageClient.js          # Main homepage component
│   ├── WeekPlanner.js             # Dashboard week grid
│   ├── AdminNav.js                # Shared admin navigation
│   └── GuideLayout.js             # Guide page layout
├── lib/
│   ├── db.js                      # Database adapter (Neon/file)
│   ├── data.js                    # getCurrentWeek() — homepage data
│   ├── image-search.js            # Multi-source image fetching
│   ├── assets.js                  # Asset generation pipeline
│   ├── fal-video.js               # fal.ai video generation
│   ├── publisher.js               # Publish batch management
│   ├── newsletter.js              # Newsletter draft system
│   ├── normalize.js               # Event data normalization
│   ├── scoring.js                 # Event quality scoring
│   ├── sources.js                 # Source configuration
│   ├── admin-auth.js              # Cookie-based admin auth
│   └── fetchers/                  # Per-source scrapers
│       ├── tourismkelowna.js
│       ├── castanet.js
│       ├── eventbrite-kelowna.js
│       └── generic.js
├── scripts/
│   ├── scrape.mjs                 # CLI event scraper
│   └── post-to-discord.mjs        # Post events to Discord
├── data/
│   ├── current-week.json          # Seed data (legacy)
│   └── tasks.json                 # Task board
├── public/
│   ├── images/                    # Card images (per day/mode)
│   ├── videos/                    # Card videos
│   └── assets/                    # Generated assets
└── tmp/                           # Scraper output
```

### 7.3 Database Architecture

The database uses a **JSONB-in-kv** pattern on Neon Postgres:

```sql
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

A single row with `key = 'okletsgo_db'` holds the entire application state as a JSONB document:

```json
{
  "events": [...],
  "venues": [...],
  "assets": [...],
  "publishBatches": [...],
  "batchActions": [...],
  "newsletterDrafts": [...],
  "newsletterSettings": {},
  "reviews": [...]
}
```

**Why this pattern:**
- No schema migrations needed
- Single read/write per request
- `initDb()` loads on first access, `flushDb()` persists after writes
- File-based fallback for local development
- Atomic updates (full document replace)

### 7.4 Rendering Strategy

| Page | Strategy | Reason |
|------|----------|--------|
| Homepage (`/`) | `force-dynamic` | Must read latest DB state |
| Admin pages | Client components | Full interactivity needed |
| Guide pages | Static | Documentation doesn't change |

### 7.5 Authentication

- **Admin panel:** Cookie-based session with `ADMIN_PASSWORD` env var
- **Ingest API:** Bearer token (`INGEST_TOKEN`) for Discord pipeline
- **Middleware:** Redirects unauthenticated `/admin/*` requests to `/admin/login`

---

## 8. API Reference

### 8.1 Public Endpoints

None — the homepage is server-rendered.

### 8.2 Admin Endpoints (Cookie Auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/login` | Authenticate with password |
| POST | `/api/admin/logout` | Clear session cookie |
| GET | `/api/events?all=1` | List all events |
| POST | `/api/events/create` | Create event manually |
| GET | `/api/events/[id]` | Get single event |
| PATCH | `/api/events/[id]` | Update event metadata |
| DELETE | `/api/events/[id]` | Delete event |
| POST | `/api/events/[id]/review` | Approve/reject event |
| POST | `/api/events/[id]/find-images` | Fetch images for event |
| POST | `/api/events/[id]/select-image` | Select + crop image |
| POST | `/api/events/[id]/upload-image` | Upload custom image |
| POST | `/api/assets/generate` | Build card asset |
| POST | `/api/assets/animate` | Generate video animation |
| GET | `/api/calendar/assign` | Get current calendar assignments |
| POST | `/api/calendar/assign` | Save calendar assignments |
| GET | `/api/sources` | List configured scrapers |
| POST | `/api/sources/run` | Run a scraper |
| POST | `/api/sources/import` | Import scraped events |
| GET | `/api/newsletter` | Get newsletter drafts |
| POST | `/api/newsletter` | Create/update newsletter |

### 8.3 Ingest API (Token Auth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/events/ingest` | `Authorization: Bearer <INGEST_TOKEN>` | Push events from external sources (Discord bot) |

**Request body:**
```json
{
  "title": "Wine & Cheese Night",
  "venue": "Cedar Creek Winery",
  "city": "Kelowna",
  "date": "2026-03-20",
  "startTime": "7:00 PM",
  "mode": "night",
  "description": "...",
  "sourceUrl": "https://..."
}
```

---

## 9. Data Model

### 9.1 Event

```typescript
{
  id: string;              // e.g. "evt-1710612345678-wine-cheese"
  title: string;
  venue: string;
  city: string;
  address?: string;
  date: string;            // "MONDAY" or "2026-03-20"
  startTime?: string;
  endTime?: string;
  mode: "day" | "night" | "family" | "grownup";
  description?: string;
  status: "candidate" | "approved_1" | "approved_2" | "rejected" | "deferred" | "published";
  sourceUrl?: string;
  source?: string;         // "tourismkelowna", "castanet", "manual", "discord"
  
  // Calendar placement (set by publish page)
  calendarDay?: string;    // "MONDAY" — which day on the homepage
  calendarMode?: string;   // "night" — which mode slot
  
  // Images
  imageCandidates?: ImageCandidate[];
  selectedImageCandidate?: ImageCandidate;
  fallbackImage?: string;  // Local path in /public/images/
  
  // Assets
  latestAsset?: Asset;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  reviews?: Review[];
  raw?: object;            // Original scraped data
}
```

### 9.2 Image Candidate

```typescript
{
  id: string;
  url: string;
  source: "venue-search" | "event-page" | "event-search" | "ai-generated" | "upload" | "discord";
  category: "venue" | "event" | "activity";
  selected?: boolean;
  searchQuery?: string;    // What search query found this image
  aiPrompt?: string;       // What AI prompt generated this image
  sourceUrl?: string;      // What page it was scraped from
}
```

### 9.3 Asset

```typescript
{
  id: string;
  eventId: string;
  status: "pending" | "processing" | "ready" | "partial" | "failed";
  stillStatus: string;
  animationStatus: string;
  portraitUrl?: string;
  squareUrl?: string;
  animationUrl?: string;
  animationProvider?: string;
  sourceImageUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 10. Deployment & Infrastructure

### 10.1 Vercel

| Setting | Value |
|---------|-------|
| Project | `okletsgo` |
| Framework | Next.js |
| Build command | `next build` |
| Output | `.next` |
| Domain | `okletsgo.ca` |
| Plan | Hobby |

**Environment variables:**
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection (pooled) |
| `POSTGRES_URL` | Alias for DATABASE_URL |
| `ADMIN_PASSWORD` | Admin panel login password |
| `INGEST_TOKEN` | Bearer token for ingest API |
| `FAL_KEY` | fal.ai API key for image/video generation |

### 10.2 Neon Database

| Setting | Value |
|---------|-------|
| Region | us-east-1 |
| Database | `neondb` |
| Connection | Pooled (for Vercel serverless) |

### 10.3 Server (Ubuntu)

The scraping infrastructure runs on a separate Ubuntu server:
- Chromium browser for Puppeteer
- `scripts/scrape.mjs` CLI tool
- Direct database access via unpooled connection
- Discord bot integration for posting to #candidates

### 10.4 Deployment Workflow

```bash
cd /home/ubuntu/repos/okletsgo
npm run build          # Catch errors locally
git add -A
git commit -m "description"
git push               # Push to GitHub
npx vercel --prod --yes  # Deploy to production
```

---

## 11. Event Scraping System

### 11.1 Architecture

Scrapers use **Puppeteer API interception** rather than HTML parsing. This is because all major Okanagan event sources use client-side JavaScript rendering or Cloudflare protection.

```
Puppeteer launches Chromium
  → Navigates to event page
  → page.on('response') intercepts XHR/fetch calls
  → Captures structured JSON from the site's own API
  → Normalizes into event format
```

### 11.2 Sources

**Tourism Kelowna:**
- CMS: Simpleview
- API: `https://www.tourismkelowna.com/includes/rest_v2/plugins_events_events_by_date/find/`
- Returns structured event JSON with titles, venues, dates, descriptions, images
- ~90 events available per scrape

**Castanet:**
- Type: Local news site with events section
- Method: HTML parsing + API interception
- Returns ~40 events per scrape

### 11.3 CLI Usage

```bash
# Scrape all sources
node scripts/scrape.mjs

# Single source
node scripts/scrape.mjs --source tourismkelowna

# Scrape and post to Discord
node scripts/scrape.mjs --discord

# Scrape and import directly to DB
node scripts/scrape.mjs --import
```

### 11.4 Normalization

Raw scraped data is normalized via `lib/normalize.js`:
- Title cleaning and capitalization
- Venue name standardization
- Date parsing (various formats → ISO or day name)
- Mode detection from keywords (night/family/day)
- Deduplication by title + venue + date

---

## 12. Discord Integration

### 12.1 Channel Structure

| Channel | ID | Purpose |
|---------|-----|---------|
| #candidates | `1482488599411687515` | Event review queue |
| #webdev | `1481834452035567777` | Development discussion |

### 12.2 Discovery → Approval Flow

```
Scraper runs
  → Posts each event to #candidates as formatted message
  → Each message includes ✅ and ❌ reaction buttons
  → "Send to Web" button pushes event to ingest API
  → Event appears in admin panel as candidate
```

### 12.3 Message Format

```
📅 Wine & Cheese Night
🏢 Cedar Creek Winery
📍 Kelowna, BC
🕐 7:00 PM - 10:00 PM
🌙 Night mode

A relaxing evening of wine tasting paired with artisan cheeses...

[✅ Approve] [❌ Reject] [🌐 Send to Web]
```

---

## 13. AI & Media Generation

### 13.1 Image Generation (fal.ai Flux Schnell)

Used for the "Activity" category in image search. Generates lifestyle photos based on event metadata.

**Prompt construction:**
```
Professional editorial lifestyle photograph:
[activity from event description] at [venue] in [city].
[atmosphere from mode: evening/daytime/family].
Candid and authentic, shallow depth of field, warm tones,
no text or watermarks, high-end magazine quality
```

**Parameters:**
- Model: `fal-ai/flux/schnell`
- Size: 768 × 1344 (portrait, matches card aspect ratio)
- Inference steps: 4
- 3 variations per event

### 13.2 Video Generation (fal.ai Kling v2 Master)

Converts still card images into short looping video animations.

**Motion prompt construction:**
```
Subtle cinematic camera push-in with gentle parallax.
[event title] at [venue].
[atmosphere: evening ambiance / daytime scene].
Smooth, professional, editorial quality.
```

**Parameters:**
- Model: `fal-ai/kling-video/v2/master/image-to-video`
- Duration: 5 seconds
- Aspect ratio: 9:16 (portrait)
- Processing time: 30-60 seconds

### 13.3 Image Search Strategy

The image search uses event metadata to build targeted queries:

1. **Venue photos** — Bing image search with queries like:
   - `"Cedar Creek Winery" Kelowna photo`
   - `"Cedar Creek Winery" winery` (if description mentions wine)
   
2. **Event images** — Scrapes the event's source URL for og:image, img tags
   - Falls back to Bing search: `"Wine & Cheese Night" "Cedar Creek Winery"`

3. **AI generated** — fal.ai with full context prompt (see above)

All images are validated (HEAD request, content-type check, minimum 5KB size).

---

## 14. Newsletter System

### 14.1 Status
The newsletter system is scaffolded but not fully wired:
- Draft editor exists at `/admin/newsletter`
- Beehiiv API integration is stubbed (returns 501)
- Newsletter settings stored in DB

### 14.2 Planned Flow
1. Auto-generate draft from published week's events
2. Edit/customize in admin panel
3. Send via Beehiiv API
4. Track open/click rates

---

## 15. Security

### 15.1 Authentication
- Admin panel: Single shared password via `ADMIN_PASSWORD` env var
- Session: HTTP-only cookie with cryptographic token
- Ingest API: Bearer token authentication (`INGEST_TOKEN`)

### 15.2 Middleware
- All `/admin/*` routes (except `/admin/login`) require valid session cookie
- Invalid sessions redirect to login page with 303

### 15.3 Data Protection
- No user accounts or personal data collected
- Event data is public information (scraped from public sources)
- Admin credentials stored as Vercel environment variables
- Database connection uses SSL (`sslmode=require`)

### 15.4 Content Security
- Image URLs validated before display
- Upload size limits on image uploads
- HTML sanitization on all user inputs
- CORS headers on API responses

---

## 16. Roadmap

### Completed ✅
- [x] Full homepage with 7-day card grid
- [x] Three mode toggles (day/night/family)
- [x] Mobile responsive mosaic layout with bottom sheet
- [x] Admin panel with full pipeline (candidates → assets → publish)
- [x] Automated scraping (Tourism Kelowna, Castanet)
- [x] AI image generation (fal.ai Flux)
- [x] AI video animation (fal.ai Kling v2)
- [x] Image gallery with source labels and lightbox
- [x] Publish calendar as single source of truth
- [x] Neon Postgres database
- [x] Discord integration for event discovery
- [x] Video hover-only playback

### In Progress 🔨
- [ ] Discord "Send to Web" button handler
- [ ] Remaining Castanet events processing
- [ ] End-to-end fal.ai video testing
- [ ] Mobile layout verification

### Planned 📋
- [ ] Newsletter via Beehiiv (API integration)
- [ ] User accounts for venue owners (self-service submission)
- [ ] Ticket/booking deep links with analytics
- [ ] Featured/sponsored event placements
- [ ] Expand to Victoria, Vancouver
- [ ] PWA support (offline, push notifications)
- [ ] Google Calendar integration
- [ ] Social sharing cards (Open Graph images per day)
- [ ] A/B testing for card layouts
- [ ] Analytics dashboard (views, clicks, engagement)

---

## Appendix A: Environment Variables

```env
# Database
DATABASE_URL=postgresql://...@neon.tech/neondb?sslmode=require
POSTGRES_URL=postgresql://...@neon.tech/neondb?sslmode=require

# Auth
ADMIN_PASSWORD=<admin-login-password>
INGEST_TOKEN=<token-for-discord-pipeline>

# AI
FAL_KEY=<fal-ai-api-key>
```

## Appendix B: Key CSS Classes

| Class | Purpose |
|-------|---------|
| `.slide` | Main viewport container (`height: calc(100vh - 60px)`) |
| `.cards-grid` | CSS Grid for day cards |
| `.card` | Individual day card |
| `.card-wrapper` | Tooltip/click wrapper around card (actual grid item) |
| `.card-img-strip` | 300% height strip holding 3 mode images |
| `.card-content-strip` | 300% height strip holding 3 mode text overlays |
| `.utility-tile` | Newsletter CTA and brand tiles (mobile only) |
| `.bottom-sheet` | Mobile event detail panel (40% viewport) |
| `.tooltip` | Desktop hover tooltip (hidden on mobile) |

## Appendix C: Mobile Grid Math

```
8-row grid, 2 columns:

Column 1 (cards):          Column 2 (mixed):
  MON  → rows 1-2           CTA tile  → row 1
  WED  → rows 3-4           TUE card  → rows 2-3
  FRI  → rows 5-6           THU card  → rows 4-5
  SUN  → rows 7-8           SAT card  → rows 6-7
                             BRAND tile → row 8

Both columns = 8 rows = equal height.
Cards span 2 rows = 2× tile height.
Tiles span 1 row = square.
```

---

*Generated from the okletsgo codebase. For questions, contact the development team on Discord.*
