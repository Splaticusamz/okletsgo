#!/usr/bin/env node
import { getSQL } from '../lib/pg.js';

function currentWeekDates(now = new Date()) {
  const day = now.getUTCDay();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function clean(value = '') {
  return String(value).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function slug(value = '') {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function modeFor(event) {
  const text = `${event.title || ''} ${event.description || ''} ${event.venue || ''}`.toLowerCase();
  if (/(kids|children|family|storytime|youth|cubs|skating|walk|trail|camp|dance class)/.test(text)) return 'family';
  const hour = Number(String(event.startTime || '').slice(0, 2));
  if (hour >= 17 || /(night|late|party|club|comedy|drag|trivia|live|music|jazz|wine|beer|bingo|pub|bar|theatre|theater|show|concert)/.test(text)) return 'night';
  return 'grownup';
}

async function linksForDate(date) {
  const url = `https://www.castanet.net/events/${date}`;
  const html = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
  const links = [];
  const lineRe = /<div class='event_line'>([\s\S]*?)<div style="clear:both"><\/div>\s*<\/div>/g;
  let match;
  while ((match = lineRe.exec(html))) {
    const block = match[1];
    const titleMatch = block.match(/<a href=['"](\/events\/[^'"#]+\/\d+)['"] class=['"]event_title['"]>([\s\S]*?)<\/a>/);
    if (!titleMatch) continue;
    const timeText = clean(block.match(/<p class='event_time'>([\s\S]*?)<\/p>/)?.[1] || '');
    const listedDescription = clean(block.match(/<p class='event_descr'>([\s\S]*?)<\/p>/)?.[1] || '');
    const venue = clean(timeText.replace(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+\s+\d{1,2}:\d{2}\s*(?:AM|PM)?/i, ''));
    const listedTime = timeText.match(/(\d{1,2}:\d{2})\s*(AM|PM)?/i);
    const img = block.match(/<img[^>]+src=['"]([^'"]+)['"]/i)?.[1];
    links.push({
      title: clean(titleMatch[2]),
      url: `https://www.castanet.net${titleMatch[1]}`,
      listedDate: date,
      listedTime: listedTime ? `${listedTime[1]} ${listedTime[2] || ''}`.trim() : null,
      listedVenue: venue || null,
      listedDescription,
      listedImage: img ? (img.startsWith('http') ? img : `https://www.castanet.net${img}`) : null,
    });
  }
  return links;
}

function normalizeListedTime(value) {
  if (!value) return null;
  const m = String(value).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  if ((m[3] || '').toUpperCase() === 'PM' && h < 12) h += 12;
  if ((m[3] || '').toUpperCase() === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

function priceFromText(value = '') {
  const text = clean(value);
  const paid = text.match(/\$\s?\d+(?:\.\d{2})?(?:\s?[-–]\s?\$?\d+(?:\.\d{2})?)?/i);
  if (paid) return paid[0].replace(/\s+/g, ' ');
  const free = text.match(/(?:free|by donation)/i);
  return free ? free[0].replace(/\s+/g, ' ') : null;
}

async function eventFromDetail(link) {
  const url = link.url;
  const html = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
  const match = html.match(/<script type=['"]application\/ld\+json['"]>\s*([\s\S]*?)\s*<\/script>/i);
  if (!match) return null;
  let data;
  try { data = JSON.parse(match[1]); } catch { return null; }
  const start = data.startDate ? new Date(data.startDate) : null;
  if (!start || Number.isNaN(start.getTime())) return null;
  const image = Array.isArray(data.image) ? data.image[0] : data.image;
  const event = {
    id: `castanet-${start.toISOString().slice(0,10)}-${slug(data.name)}-${url.split('/').pop()}`,
    title: clean(data.name),
    // Castanet recurring events can expose the next occurrence in JSON-LD even
    // when the dated listing page is for an earlier occurrence. Trust the date
    // page we crawled and use JSON-LD for the detail payload.
    date: link.listedDate || start.toISOString().slice(0,10),
    startTime: normalizeListedTime(link.listedTime) || start.toISOString().slice(11,16),
    endTime: null,
    venue: clean(data.location?.name || link.listedVenue || ''),
    venueId: slug(data.location?.name || link.listedVenue || ''),
    city: clean(data.location?.address?.addressLocality || 'Kelowna'),
    address: clean(data.location?.address?.streetAddress || ''),
    description: clean(`${data.description || ''} ${link.listedDescription || ''}`).slice(0, 700),
    sourceId: 'castanet',
    source: 'scraper:castanet',
    sourceUrl: url,
    ticketUrl: url,
    price: priceFromText(`${data.description || ''} ${link.listedDescription || ''} ${html}`),
    externalId: url.split('/').pop(),
    status: 'approved_2',
    reviews: [],
    confidenceScore: image ? 95 : 82,
    confidenceReasons: ['Castanet detail JSON-LD', image ? 'Event image present' : 'No image'],
    tags: [],
    mode: 'grownup',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  event.mode = modeFor(event);
  return { event, image: image || link.listedImage };
}

async function main() {
  const dates = currentWeekDates();
  const sql = getSQL();
  const [{ value: db }] = await sql`SELECT value FROM kv WHERE key='db'`;
  db.events ||= []; db.imageCandidates ||= [];
  let imported = 0, updated = 0, images = 0;
  for (const date of dates) {
    const links = await linksForDate(date);
    console.log(date, links.length, 'Castanet listings');
    for (const link of links.slice(0, 18)) {
      const detail = await eventFromDetail(link).catch(() => null);
      if (!detail || !detail.event.title || !detail.event.venue) continue;
      const event = detail.event;
      const existing = db.events.find((e) => e.externalId === event.externalId && e.date === event.date && (e.sourceId === 'castanet' || e.source === 'scraper:castanet'))
        || db.events.find((e) => slug(e.title) === slug(event.title) && e.date === event.date);
      if (existing) {
        Object.assign(existing, { ...event, id: existing.id, createdAt: existing.createdAt || event.createdAt, status: existing.status === 'published' ? 'published' : event.status });
        updated++;
      } else {
        db.events.unshift(event);
        imported++;
      }
      const id = existing?.id || event.id;
      if (detail.image && !db.imageCandidates.some((c) => c.eventId === id && c.url === detail.image)) {
        db.imageCandidates.unshift({ id: `${id}-castanet-detail-img`, eventId: id, url: detail.image, sourceUrl: event.sourceUrl, provenance: 'castanet', extractorId: 'castanet-jsonld', capturedAt: new Date().toISOString(), rank: 1, selected: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        images++;
      }
    }
  }
  await sql`INSERT INTO kv (key,value,updated_at) VALUES ('db', ${JSON.stringify(db)}::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value=${JSON.stringify(db)}::jsonb, updated_at=now()`;
  console.log(JSON.stringify({ imported, updated, images }, null, 2));
}
main().catch((err)=>{ console.error(err); process.exit(1); });
