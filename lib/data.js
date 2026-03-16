import fs from 'fs';
import path from 'path';
import { getEvents } from './db.js';

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

/**
 * Build the week from DB events (non-rejected).
 * The DB is the single source of truth. If a day/mode slot has no event, it's empty.
 * Days always exist (all 7), but entries may have no content.
 */
function buildWeekFromEvents(events) {
  const dayMap = {};

  for (const event of events) {
    if (event.status === 'rejected') continue;

    const dayKey = DAY_ORDER.includes(event.date) ? event.date : dayOfWeekFromDate(event.date);
    const mode = mapModeToSlot(event.mode);
    if (!dayKey || !mode) continue;

    if (!dayMap[dayKey]) dayMap[dayKey] = {};
    if (!dayMap[dayKey][mode]) {
      const selectedImg = event.selectedImageCandidate?.url
        || event.imageCandidates?.find(c => c.selected)?.url
        || event.imageCandidates?.[0]?.url;
      const asset = event.latestAsset ?? event.assets?.[0] ?? null;

      dayMap[dayKey][mode] = {
        venue: event.title || event.venue || '',
        city: event.city || '',
        imageUrl: selectedImg || asset?.portraitUrl || null,
        fallbackImage: event.fallbackImage || null,
        video: asset?.animationUrl || event.video || null,
        sourceUrl: event.sourceUrl || null,
        status: event.status,
      };
    }
  }

  // Always produce all 7 days — empty slots get null entries
  const days = DAY_ORDER.map((dayKey) => {
    const entries = {};
    for (const mode of ['night', 'grownup', 'family']) {
      entries[mode] = dayMap[dayKey]?.[mode] || null;
    }
    return { day: dayKey, entries };
  });

  return {
    weekKey: currentISOWeek(),
    updatedAt: new Date().toISOString(),
    days,
  };
}

function currentISOWeek() {
  const now = new Date();
  const day = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function dayOfWeekFromDate(dateStr) {
  try {
    const d = new Date(dateStr + 'T12:00:00Z');
    return ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][d.getUTCDay()] || null;
  } catch {
    return null;
  }
}

function mapModeToSlot(mode) {
  if (mode === 'night') return 'night';
  if (mode === 'family') return 'family';
  if (mode === 'day' || mode === 'grownup') return 'grownup';
  return 'grownup';
}

/**
 * Get the current week data. DB is the single source of truth.
 * All 7 days always exist. Empty slots = no event placed.
 */
export function getCurrentWeek() {
  try {
    const allEvents = getEvents();
    return buildWeekFromEvents(allEvents);
  } catch {
    // DB not loaded — return empty week
    return {
      weekKey: currentISOWeek(),
      updatedAt: new Date().toISOString(),
      days: DAY_ORDER.map(day => ({
        day,
        entries: { night: null, grownup: null, family: null },
      })),
    };
  }
}

export function getTasks() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'tasks.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return { updatedAt: null, sections: [], changelog: [] };
  }
}
