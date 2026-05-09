export const DAY_ORDER = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
export const SLOT_ORDER = ['night','grownup','family'];

export function modeFor(event) {
  const text = `${event.title || ''} ${event.description || ''} ${event.venue || ''}`.toLowerCase();
  if (/(kids|children|family|storytime|youth|cubs|skating|walk|class)/.test(text)) return 'family';
  const hour = Number(String(event.startTime || '').slice(0,2));
  if (hour >= 17 || /(night|late|party|club|comedy|drag|trivia|live|music|wine|beer|bingo|pub|bar|theatre|theater|show)/.test(text)) return 'night';
  return 'grownup';
}

export function eventDay(dateValue) {
  const date = new Date(`${dateValue}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return DAY_ORDER[date.getUTCDay()];
}

export function isComplete(event, imageCandidates = []) {
  return Boolean(
    event.title &&
    event.date && /^\d{4}-\d{2}-\d{2}$/.test(event.date) &&
    event.venue &&
    event.sourceUrl &&
    event.description && event.description.length >= 40 &&
    imageCandidates.some((candidate) => candidate.eventId === event.id && candidate.url)
  );
}

export function isFunEvent(event) {
  const text = `${event.title || ''} ${event.venue || ''} ${event.description || ''}`.toLowerCase();
  const reject = /\b(plasma|blood services|donor|donation needed|divorce|grief|bereaved|dementia|caregiver|support group|information session|open house|school of education|mental health|therapy|regulation|qigong|bereavement|gospel|sermon|worship|prayer|bible study|church of god)\b/;
  if (reject.test(text)) return false;

  const fun = /\b(live music|music|concert|jazz|comedy|trivia|bingo|wine|tasting|beer|brew|pub|bar|cocktail|brunch|breakfast|lunch|dinner|food|pasta|tea|theatre|theater|actors studio|ballet|dance|drag|market|craft|pottery|workshop|art gallery|gallery|exhibition|festival|show|stage|film|garden|bike|skating|hockey|derby)\b/;
  return fun.test(text);
}

export function qualityScore(event, imageCandidates = []) {
  const images = imageCandidates.filter((candidate) => candidate.eventId === event.id && candidate.url);
  const imageUrl = images[0]?.url || '';
  const text = `${event.title || ''} ${event.venue || ''} ${event.description || ''}`.toLowerCase();
  let score = event.confidenceScore || 0;
  // Score the evidence, not the aggregator. Source diversity is handled separately.
  if (imageUrl.includes('castanet.net/events/photos/')) score += 18;
  if (/simpleview|tourismkelowna|assets.simpleviewinc.com/.test(imageUrl)) score += 12;
  if (event.startTime) score += 5;
  if (/\$\s?\d+/.test(event.price || '')) score += 8;
  if (/\b(comedy|trivia|bingo|live music|concert|jazz|wine|tasting|brunch|dinner|theatre|theater|ballet|drag|market|workshop|art gallery|gallery|pottery|craft|pasta|tea|hockey|skating|stage|film)\b/.test(text)) score += 35;
  if (/\b(class|course|series|care|services|session)\b/.test(text)) score -= 20;
  return score;
}

function titleSlug(event) {
  return String(event.title || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(blossoms?)\b/g, 'blossom')
    .replace(/\b(bites?)\b/g, 'bite')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sourceKey(event) {
  return event.sourceId || String(event.source || '').replace(/^scraper:/, '') || 'unknown';
}

function sortByQuality(a, b, imageCandidates) {
  return qualityScore(b, imageCandidates) - qualityScore(a, imageCandidates)
    || String(a.title || '').localeCompare(String(b.title || ''));
}

export function eligibleEvents(events = [], imageCandidates = [], options = {}) {
  const { weekStart, weekEnd } = options;
  return events
    .filter((event) => (!weekStart || event.date >= weekStart) && (!weekEnd || event.date <= weekEnd))
    .filter((event) => isComplete(event, imageCandidates))
    .filter((event) => isFunEvent(event));
}

export function selectEventsForWeek(events = [], imageCandidates = [], options = {}) {
  const {
    weekStart,
    weekEnd,
    maxSlots = 21,
    minNonDominant = 4,
    dominantSourceId = 'castanet',
    minSourceCounts = {},
  } = options;

  for (const event of events) {
    event.calendarDay = null;
    event.calendarMode = null;
  }

  const candidates = eligibleEvents(events, imageCandidates, { weekStart, weekEnd });
  const selected = [];
  const selectedIds = new Set();
  const selectedTitles = new Set();
  const selectedBySource = new Map();
  const slots = [];

  const days = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
  for (const day of days) {
    for (const mode of SLOT_ORDER) slots.push({ day, mode });
  }

  function canUse(event, slot) {
    if (selectedIds.has(event.id)) return false;
    if (selectedTitles.has(titleSlug(event))) return false;
    return eventDay(event.date) === slot.day;
  }

  function place(event, slot) {
    event.calendarDay = slot.day;
    event.calendarMode = slot.mode;
    selected.push(event);
    selectedIds.add(event.id);
    selectedTitles.add(titleSlug(event));
    selectedBySource.set(sourceKey(event), (selectedBySource.get(sourceKey(event)) || 0) + 1);
  }

  for (const slot of slots) {
    if (selected.length >= maxSlots) break;
    const dayCandidates = candidates
      .filter((event) => canUse(event, slot))
      .sort((a, b) => sortByQuality(a, b, imageCandidates));
    if (!dayCandidates.length) continue;

    const underTargetSource = Object.entries(minSourceCounts)
      .find(([sourceId, minimum]) => (selectedBySource.get(sourceId) || 0) < minimum && dayCandidates.some((event) => sourceKey(event) === sourceId))?.[0];
    const sourceTargetCandidate = underTargetSource
      ? dayCandidates.find((event) => sourceKey(event) === underTargetSource)
      : null;
    const nonDominantCount = selected.length - (selectedBySource.get(dominantSourceId) || 0);
    const nonDominantCandidate = dayCandidates.find((event) => sourceKey(event) !== dominantSourceId);
    const candidate = sourceTargetCandidate
      || (nonDominantCount < minNonDominant && nonDominantCandidate ? nonDominantCandidate : null)
      || dayCandidates[0];
    place(candidate, slot);
  }

  // Backfill any open slots with the best remaining events, regardless of diversity target.
  if (selected.length < maxSlots) {
    for (const event of candidates.sort((a, b) => (a.date || '').localeCompare(b.date || '') || sortByQuality(a, b, imageCandidates))) {
      if (selected.length >= maxSlots) break;
      if (selectedIds.has(event.id) || selectedTitles.has(titleSlug(event))) continue;
      const day = eventDay(event.date);
      const usedModes = new Set(selected.filter((item) => item.calendarDay === day).map((item) => item.calendarMode));
      const preferred = modeFor(event);
      const mode = [preferred, ...SLOT_ORDER.filter((item) => item !== preferred)].find((item) => !usedModes.has(item));
      if (!day || !mode) continue;
      place(event, { day, mode });
    }
  }

  return selected;
}
