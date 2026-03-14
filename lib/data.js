import fs from 'fs';
import path from 'path';
import currentWeekSeed from '../data/current-week.json';
import { getPublishedEvents } from './publisher.js';

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

/**
 * Transform published events into the currentWeek shape expected by HomepageClient.
 * Each day needs entries: { night, grownup, family } with venue/city/fallbackImage/video.
 */
function eventsToWeekShape(events) {
  const dayMap = {};

  for (const event of events) {
    const dayKey = DAY_ORDER.includes(event.date) ? event.date : dayOfWeekFromDate(event.date);
    const mode = mapModeToSlot(event.mode);
    if (!dayKey || !mode) continue;

    if (!dayMap[dayKey]) dayMap[dayKey] = {};
    if (!dayMap[dayKey][mode]) {
      const asset = event.latestAsset ?? event.assets?.[0] ?? null;
      dayMap[dayKey][mode] = {
        venue: event.title || event.venue || 'Coming soon',
        city: event.city || '',
        fallbackImage: asset?.portraitUrl || event.fallbackImage || pickFallbackImage(dayKey, mode),
        video: asset?.animationUrl || event.video || null,
      };
    }
  }

  const days = DAY_ORDER.map((dayKey) => {
    const entries = {};
    for (const mode of ['night', 'grownup', 'family']) {
      entries[mode] = dayMap[dayKey]?.[mode] || {
        venue: 'Coming soon',
        city: '',
        fallbackImage: pickFallbackImage(dayKey, mode),
        video: null,
      };
    }
    return { day: dayKey, entries };
  });

  return {
    ...currentWeekSeed,
    status: 'published',
    weekKey: currentWeekSeed.weekKey,
    updatedAt: new Date().toISOString(),
    days,
  };
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

function pickFallbackImage(dayKey, mode) {
  const d = dayKey.toLowerCase();
  if (mode === 'night') return `images/${d}-night.jpg`;
  if (mode === 'family') return `images/${d}-family.jpg`;
  return `images/${d}.png`;
}

function pickFallbackVideo(dayKey, mode) {
  const d = dayKey.toLowerCase();
  if (mode === 'night') return `videos/optimized/${d}-night.mp4`;
  if (mode === 'family') return `videos/optimized/${d}-family.mp4`;
  return `videos/optimized/${d}.mp4`;
}

export function getCurrentWeek() {
  try {
    const publishedEvents = getPublishedEvents();
    if (publishedEvents && publishedEvents.length > 0) {
      return eventsToWeekShape(publishedEvents);
    }
  } catch {
    // Fall through to seed data
  }
  return currentWeekSeed;
}

export function getTasks() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'tasks.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return { updatedAt: null, sections: [], changelog: [] };
  }
}
