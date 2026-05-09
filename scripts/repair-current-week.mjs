#!/usr/bin/env node
import { getSQL } from '../lib/pg.js';
import { modeFor, selectEventsForWeek } from '../lib/weekly-curation.mjs';

function currentWeekRange(now = new Date()) {
  const day = now.getUTCDay();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return [monday.toISOString().slice(0,10), sunday.toISOString().slice(0,10)];
}

function htmlDecode(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function enrichCastanet(event, db) {
  if (!event.sourceUrl || !event.sourceUrl.includes('castanet.net/events/')) return false;
  const res = await fetch(event.sourceUrl, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) return false;
  const html = await res.text();
  const match = html.match(/<script type=['"]application\/ld\+json['"]>\s*([\s\S]*?)\s*<\/script>/i);
  if (!match) return false;
  let data;
  try { data = JSON.parse(match[1]); } catch { return false; }
  const start = data.startDate ? new Date(data.startDate) : null;
  const imageUrl = Array.isArray(data.image) ? data.image[0] : data.image;
  const existingDate = /^\d{4}-\d{2}-\d{2}$/.test(event.date || '') ? event.date : null;
  event.title = htmlDecode(data.name || event.title);
  if (start && !Number.isNaN(start.getTime())) {
    // Preserve the date captured from a Castanet dated listing page. Recurring
    // event detail pages can expose the next occurrence in JSON-LD, which was
    // shifting Monday listings to Tuesday and leaving Monday empty.
    event.date = existingDate || start.toISOString().slice(0,10);
    if (!event.startTime) event.startTime = start.toISOString().slice(11,16);
  }
  event.venue = htmlDecode(data.location?.name || event.venue || event.title);
  event.city = htmlDecode(data.location?.address?.addressLocality || event.city || 'Kelowna');
  event.address = htmlDecode(data.location?.address?.streetAddress || event.address || '');
  event.description = htmlDecode(data.description || event.description || '');
  event.mode = modeFor(event);
  event.updatedAt = new Date().toISOString();
  if (imageUrl && !db.imageCandidates.some((candidate) => candidate.eventId === event.id && candidate.url === imageUrl)) {
    db.imageCandidates.unshift({
      id: `${event.id}-castanet-img-0`,
      eventId: event.id,
      url: imageUrl,
      sourceUrl: event.sourceUrl,
      provenance: 'castanet',
      extractorId: 'castanet-jsonld',
      capturedAt: new Date().toISOString(),
      rank: 1,
      selected: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return true;
}

async function main() {
  const sql = getSQL();
  const rows = await sql`SELECT value FROM kv WHERE key = 'db'`;
  const db = rows[0].value;
  db.events ||= [];
  db.imageCandidates ||= [];
  db.publishBatches ||= [];
  db.batchActions ||= [];

  let enriched = 0;
  for (const event of db.events) {
    if ((event.sourceId === 'castanet' || event.source === 'castanet' || event.source === 'scraper:castanet') && event.sourceUrl) {
      try { if (await enrichCastanet(event, db)) enriched++; } catch (err) { console.warn('Castanet enrich failed', event.title, err.message); }
    }
  }

  const [weekStart, weekEnd] = currentWeekRange();

  // Clear every existing placement. Homepage should reflect only this corrected batch.
  for (const event of db.events) {
    event.calendarDay = null;
    event.calendarMode = null;
    if (event.status === 'published') event.status = 'approved_2';
  }

  const selected = selectEventsForWeek(db.events, db.imageCandidates, {
    weekStart,
    weekEnd,
    maxSlots: 21,
    minNonDominant: 6,
    dominantSourceId: 'castanet',
    minSourceCounts: {
      'livemusic-kelowna': 3,
      tourismkelowna: 2,
    },
  });

  for (const event of selected) {
    event.status = 'published';
  }

  const assignments = Object.fromEntries(
    selected.map((event) => [`${event.calendarDay}:${event.calendarMode}`, event.id])
  );

  if (selected.length < 7) {
    console.warn(`Only selected ${selected.length} complete current-week events.`);
  }

  const now = new Date().toISOString();
  for (const batch of db.publishBatches) {
    if (batch.status === 'published') batch.status = 'superseded';
  }
  const batch = {
    id: `batch-${Date.now()}-corrected-week`,
    weekLabel: weekStart,
    eventIds: selected.map((event) => event.id),
    assignments,
    createdAt: now,
    updatedAt: now,
    status: 'published',
    publishedAt: now,
    rolledBackAt: null,
  };
  db.publishBatches.unshift(batch);
  db.batchActions.unshift({
    id: `ba-${Date.now()}-repair`,
    batchId: batch.id,
    action: 'repair_publish',
    detail: `Corrected current-week batch: ${selected.length} complete events, ${enriched} Castanet pages enriched`,
    by: 'autopilot-repair',
    timestamp: now,
  });

  await sql`
    INSERT INTO kv (key, value, updated_at) VALUES ('db', ${JSON.stringify(db)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(db)}::jsonb, updated_at = now()
  `;

  console.log(JSON.stringify({
    weekStart,
    weekEnd,
    enriched,
    selected: selected.map((event) => ({ title: event.title, date: event.date, day: event.calendarDay, mode: event.calendarMode, venue: event.venue })),
    batchId: batch.id,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
