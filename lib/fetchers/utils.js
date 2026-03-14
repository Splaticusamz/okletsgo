import { buildImageCandidates } from '../images.js';
import { inferEventTags } from '../tags.js';

function cleanupText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function inferMode(text) {
  const normalized = cleanupText(text).toLowerCase();
  if (!normalized) return 'day';
  if (/(night|late|after dark|party|club|evening|pm|cocktail|brew|wine|dj|comedy)/.test(normalized)) return 'night';
  return 'day';
}

function extractCity(text) {
  const normalized = cleanupText(text);
  const match = normalized.match(/(Kelowna|West Kelowna|Lake Country|Penticton|Vernon|Peachland|Osoyoos|Oliver)/i);
  return match ? match[1] : 'Kelowna';
}

function isoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function clockTime(value) {
  if (!value) return null;
  const raw = cleanupText(value).toUpperCase();
  const m = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/);
  if (!m) return null;
  let hour = Number(m[1]);
  const mins = m[2] ?? '00';
  const meridiem = m[3];
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour == 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${mins}`;
}

function safeJsonLd(html) {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const docs = [];
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) docs.push(...parsed);
      else docs.push(parsed);
    } catch {}
  }
  return docs;
}

function eventId(prefix, title, date, index = 0) {
  const slug = cleanupText(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'event';
  const datePart = date ?? 'undated';
  return `${prefix}-${datePart}-${slug}-${index}`;
}

export function normalizeCandidateEvent(source, raw, index = 0) {
  const title = cleanupText(raw.title || raw.name || raw.summary || 'Untitled event');
  const date = isoDate(raw.date || raw.startDate || raw.start || raw.when) || new Date().toISOString().slice(0, 10);
  const locationText = cleanupText(raw.location || raw.venue || raw.place || raw.address || '');
  const description = cleanupText(raw.description || raw.summary || '');
  const startTime = clockTime(raw.startTime || raw.time || raw.start_text);
  const endTime = clockTime(raw.endTime || raw.end_text);
  const city = cleanupText(raw.city || extractCity(locationText || description || title));
  const venue = cleanupText(raw.venue || raw.locationName || locationText.split(',')[0] || title);
  const mode = raw.mode || inferMode(`${title} ${description} ${raw.time || ''}`);
  const id = eventId(source.id, title, date, index);
  const sourceUrl = raw.url || raw.link || source.url;
  const ticketUrl = raw.ticketUrl || raw.ticketsUrl || raw.offers?.url || raw.registrationUrl || raw.bookingUrl || null;
  const imageCandidates = buildImageCandidates(raw, source, { eventId: id, sourceUrl, extractorId: source.id });

  const candidate = {
    id,
    title,
    date,
    startTime,
    endTime,
    venue,
    venueId: venue ? venue.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : null,
    city: city || 'Kelowna',
    description,
    mode,
    sourceId: source.id,
    source: `scraper:${source.id}`,
    sourceUrl,
    ticketUrl,
    externalId: raw.externalId || raw.id || null,
    status: 'candidate',
    fetchedAt: new Date().toISOString(),
    reviews: [],
    tags: inferEventTags(raw, { title, description, venue, startTime, mode, address: raw.address || raw.location || '', city: city || 'Kelowna' }),
    imageCandidates,
    imageCandidateCount: imageCandidates.length,
    raw,
  };

  return candidate;
}

export async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; OKLetsGoBot/1.0; +https://okletsgo.ca)',
      accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Fetch failed (${response.status}) for ${url}`);
  }
  return await response.text();
}

export { cleanupText, inferMode, extractCity, isoDate, clockTime, safeJsonLd };
