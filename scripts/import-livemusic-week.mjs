#!/usr/bin/env node
import { getSQL } from '../lib/pg.js';

function htmlDecode(value = '') {
  return String(value ?? '')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function currentWeekRange(now = new Date()) {
  const day = now.getUTCDay();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return [monday.toISOString().slice(0,10), sunday.toISOString().slice(0,10)];
}

function sourceMonthUrls(weekStart, weekEnd) {
  const months = new Set([weekStart.slice(0, 7), weekEnd.slice(0, 7)]);
  return [...months].map((month) => `https://livemusickelowna.ca/events/month/${month}/`);
}

function getImageUrl(image) {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return getImageUrl(image[0]);
  return image.url || image.contentUrl || image.thumbnailUrl || null;
}

function extractJsonLd(html) {
  const docs = [];
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      docs.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {}
  }
  return docs.flatMap((doc) => doc['@graph'] ? doc['@graph'] : [doc]);
}

function priceFromOffer(offers) {
  const offer = Array.isArray(offers) ? offers[0] : offers;
  if (!offer) return null;
  const price = offer.price;
  if (price === 0 || price === '0') return 'Free';
  if (price) return `$${price}`;
  return null;
}

function eventId(title, date, externalId) {
  const slug = String(title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 52);
  const eid = String(externalId || '').split('/').filter(Boolean).at(-1)?.replace(/[^a-z0-9-]+/gi, '') || slug;
  return `livemusic-kelowna-${date}-${slug}-${eid}`;
}

function normalizeEvent(item) {
  const start = item.startDate ? new Date(item.startDate) : null;
  if (!start || Number.isNaN(start.getTime())) return null;
  const localDate = String(item.startDate).slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(localDate) ? localDate : start.toISOString().slice(0, 10);
  const title = htmlDecode(item.name);
  const location = item.location || {};
  const address = location.address || {};
  const imageUrl = getImageUrl(item.image);
  const sourceUrl = item.url || item['@id'] || 'https://livemusickelowna.ca/events/';
  const id = eventId(title, date, item['@id'] || sourceUrl);
  const description = htmlDecode(item.description || `${title} at ${location.name || 'a local venue'} — live music in Kelowna.`);

  return {
    event: {
      id,
      title,
      date,
      startTime: item.startDate ? item.startDate.slice(11, 16) : null,
      endTime: item.endDate ? item.endDate.slice(11, 16) : null,
      venue: htmlDecode(location.name || ''),
      venueId: htmlDecode(location.name || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      city: htmlDecode(address.addressLocality || 'Kelowna'),
      address: htmlDecode([address.streetAddress, address.addressLocality, address.addressRegion].filter(Boolean).join(', ')),
      description,
      mode: 'night',
      sourceId: 'livemusic-kelowna',
      source: 'scraper:livemusic-kelowna',
      sourceUrl,
      ticketUrl: sourceUrl,
      externalId: item['@id'] || sourceUrl,
      price: priceFromOffer(item.offers),
      status: 'approved_2',
      fetchedAt: new Date().toISOString(),
      reviews: [],
      tags: ['music'],
      confidenceScore: 92,
      confidenceReasons: ['Live Music Kelowna JSON-LD', imageUrl ? 'Event image present' : 'No image'],
      raw: null,
    },
    image: imageUrl ? {
      id: `${id}-img-0`,
      eventId: id,
      url: imageUrl,
      sourceUrl,
      provenance: 'livemusic-kelowna',
      extractorId: 'livemusic-jsonld',
      capturedAt: new Date().toISOString(),
      rank: 1,
      selected: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } : null,
  };
}

async function main() {
  const [weekStart, weekEnd] = currentWeekRange();
  const sql = getSQL();
  const rows = await sql`SELECT value FROM kv WHERE key = 'db'`;
  const db = rows[0].value;
  db.events ||= [];
  db.imageCandidates ||= [];

  const staleIds = new Set(db.events
    .filter((event) => event.sourceId === 'livemusic-kelowna' && event.date >= weekStart && event.date <= weekEnd)
    .map((event) => event.id));
  if (staleIds.size) {
    db.events = db.events.filter((event) => !staleIds.has(event.id));
    db.imageCandidates = db.imageCandidates.filter((candidate) => !staleIds.has(candidate.eventId));
  }

  let seen = 0, upserted = 0, images = 0;
  for (const url of sourceMonthUrls(weekStart, weekEnd)) {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; OKLetsGoBot/1.0; +https://okletsgo.ca)' } });
    if (!res.ok) throw new Error(`Live Music Kelowna fetch failed ${res.status}: ${url}`);
    const html = await res.text();
    for (const item of extractJsonLd(html).filter((node) => String(node['@type'] || '').toLowerCase().includes('event'))) {
      const normalized = normalizeEvent(item);
      if (!normalized) continue;
      const { event, image } = normalized;
      if (event.date < weekStart || event.date > weekEnd) continue;
      seen++;
      const existing = db.events.find((candidate) =>
        candidate.sourceId === event.sourceId &&
        (candidate.externalId === event.externalId || (candidate.title === event.title && candidate.date === event.date && candidate.venue === event.venue))
      );
      if (existing) {
        Object.assign(existing, { ...event, id: existing.id, status: existing.status === 'published' ? 'published' : 'approved_2', updatedAt: new Date().toISOString() });
        event.id = existing.id;
      } else {
        event.createdAt = new Date().toISOString();
        event.updatedAt = event.createdAt;
        db.events.unshift(event);
      }
      upserted++;
      if (image) {
        image.eventId = event.id;
        image.id = `${event.id}-img-0`;
        if (!db.imageCandidates.some((candidate) => candidate.eventId === event.id && candidate.url === image.url)) {
          db.imageCandidates.unshift(image);
          images++;
        }
      }
    }
  }

  await sql`
    INSERT INTO kv (key, value, updated_at) VALUES ('db', ${JSON.stringify(db)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(db)}::jsonb, updated_at = now()
  `;
  console.log(JSON.stringify({ weekStart, weekEnd, seen, upserted, images }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
