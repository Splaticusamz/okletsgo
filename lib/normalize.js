function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeDate(value) {
  if (!value) return null;
  const raw = clean(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeTime(value) {
  if (!value) return null;
  const raw = clean(value).toUpperCase();
  if (!raw) return null;
  const twentyFour = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    return `${String(Number(twentyFour[1])).padStart(2, '0')}:${twentyFour[2]}`;
  }
  const meridiem = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/);
  if (!meridiem) return null;
  let hour = Number(meridiem[1]);
  const mins = meridiem[2] ?? '00';
  if (meridiem[3] === 'PM' && hour < 12) hour += 12;
  if (meridiem[3] === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${mins}`;
}

function normalizeCity(value) {
  const city = clean(value);
  return city || 'Kelowna';
}

function normalizeMode(value, fallbackText = '') {
  const raw = clean(value).toLowerCase();
  if (['day', 'night', 'family', 'grownup'].includes(raw)) return raw;
  const inferred = clean(fallbackText).toLowerCase();
  if (/(night|late|after dark|party|club|evening|pm|cocktail|brew|wine|dj|comedy)/.test(inferred)) return 'night';
  return 'day';
}

export function normalizeEvent(source, raw = {}, index = 0) {
  const title = clean(raw.title || raw.name || raw.summary || raw.venue || 'Untitled event');
  const description = clean(raw.description || raw.summary || '');
  const date = normalizeDate(raw.date || raw.startDate || raw.start || raw.when) || new Date().toISOString().slice(0, 10);
  const venue = clean(raw.venue || raw.locationName || raw.location || raw.place || raw.address || title);
  const city = normalizeCity(raw.city);
  const sourceId = raw.sourceId || source?.id || 'unknown';
  const sourceTag = raw.source || (sourceId === 'manual' || sourceId === 'seed' ? sourceId : `scraper:${sourceId}`);
  const mode = normalizeMode(raw.mode, `${title} ${description} ${raw.time || raw.startTime || ''}`);
  const startTime = normalizeTime(raw.startTime || raw.time || raw.start_text || raw.start);
  const endTime = normalizeTime(raw.endTime || raw.end_text || raw.end);
  const baseId = slug(title) || `event-${index}`;

  return {
    id: raw.id || `${sourceId}-${date}-${baseId}-${index}`,
    title,
    date,
    startTime,
    endTime,
    venue,
    venueId: slug(venue) || null,
    city,
    description,
    mode,
    sourceId,
    source: sourceTag,
    sourceUrl: raw.sourceUrl || raw.url || raw.link || source?.url || null,
    externalId: raw.externalId || raw.externalID || null,
    status: raw.status || 'candidate',
    fetchedAt: raw.fetchedAt || new Date().toISOString(),
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
    raw,
  };
}

export function normalizeEvents(events = [], source) {
  return events
    .map((event, index) => normalizeEvent(source, event, index))
    .filter((event) => Boolean(event.title && event.date && event.venue));
}

export function makeDedupeKey(event) {
  return [slug(event.title), event.date, slug(event.venue), normalizeTime(event.startTime) || 'na']
    .filter(Boolean)
    .join('::');
}

function minutesFromTime(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function areLikelyDuplicates(a, b) {
  if (!a || !b) return false;
  if (slug(a.title) !== slug(b.title)) return false;
  if (slug(a.venue) !== slug(b.venue)) return false;
  if (a.date !== b.date) return false;

  const aMinutes = minutesFromTime(a.startTime);
  const bMinutes = minutesFromTime(b.startTime);
  if (aMinutes == null || bMinutes == null) return true;
  return Math.abs(aMinutes - bMinutes) <= 120;
}

export function dedupeEvents(events = []) {
  const deduped = [];
  const duplicates = [];

  for (const event of events) {
    const match = deduped.find((existing) => areLikelyDuplicates(existing, event) || makeDedupeKey(existing) === makeDedupeKey(event));
    if (match) {
      duplicates.push({ keptId: match.id, duplicateId: event.id, event });
      continue;
    }
    deduped.push({ ...event, dedupeKey: makeDedupeKey(event) });
  }

  return { deduped, duplicates };
}
