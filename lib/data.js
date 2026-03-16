import fs from 'fs';
import path from 'path';
import { getEvents } from './db.js';

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

/**
 * Get the current week. Single source of truth: the admin publish calendar.
 * Only events with calendarDay + calendarMode set appear on the homepage.
 * All 7 days always exist. Empty slots = no event placed.
 */
export function getCurrentWeek() {
  try {
    const allEvents = getEvents();
    const dayMap = {};

    for (const event of allEvents) {
      // Only show events explicitly placed on the calendar
      if (!event.calendarDay || !event.calendarMode) continue;
      if (event.status === 'rejected') continue;

      const dayKey = event.calendarDay;
      const mode = mapModeToSlot(event.calendarMode);
      if (!DAY_ORDER.includes(dayKey) || !mode) continue;

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
  } catch {
    return emptyWeek();
  }
}

function mapModeToSlot(mode) {
  if (mode === 'night') return 'night';
  if (mode === 'family') return 'family';
  if (mode === 'day' || mode === 'grownup') return 'grownup';
  return 'grownup';
}

function currentISOWeek() {
  const now = new Date();
  const day = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function emptyWeek() {
  return {
    weekKey: currentISOWeek(),
    updatedAt: new Date().toISOString(),
    days: DAY_ORDER.map(day => ({
      day,
      entries: { night: null, grownup: null, family: null },
    })),
  };
}

export function getTasks() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'tasks.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return { updatedAt: null, sections: [], changelog: [] };
  }
}
