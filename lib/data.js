import fs from 'fs';
import path from 'path';
import { getEvents } from './db.js';
import { isDemoMode, getSeedWeek } from './demo.js';

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function cleanText(value) {
  return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function summarize(value, max = 220) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function formatTime(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute}${suffix}`;
}

function pricingFrom(event) {
  if (event.price) return cleanText(event.price);
  const text = cleanText(`${event.description || ''} ${event.raw?.description || ''}`);
  const price = text.match(/(?:\$\s?\d+(?:\.\d{2})?(?:\s?[-–]\s?\$?\d+(?:\.\d{2})?)?|free|by donation)/i);
  return price ? price[0].replace(/\s+/g, ' ') : 'Check listing';
}

function durationFrom(event) {
  if (event.duration || event.durationLabel) return cleanText(event.duration || event.durationLabel);
  const start = formatTime(event.startTime);
  const end = formatTime(event.endTime);
  if (start && end) return `${start}–${end}`;
  if (start) return `${start} start · ~2–3 hrs`;
  return 'Check listing';
}

/**
 * Get the current week. Single source of truth: the admin publish calendar.
 * Only events with calendarDay + calendarMode set appear on the homepage.
 * All 7 days always exist. Empty slots = no event placed.
 * In demo mode, returns the original seed data instead.
 */
export function getCurrentWeek() {
  try {
    if (isDemoMode()) return getSeedWeek();
    const allEvents = getEvents();
    const dayMap = {};

    for (const event of allEvents) {
      // Only show events explicitly placed in the current published batch.
      // Approved/unreviewed/stale placements must never leak onto the homepage.
      if (!event.calendarDay || !event.calendarMode) continue;
      if (event.status !== 'published') continue;

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
          eventVenue: event.venue || '',
          address: event.address || '',
          description: summarize(event.description || event.raw?.description || ''),
          pricing: pricingFrom(event),
          duration: durationFrom(event),
          startTime: formatTime(event.startTime),
          date: event.date || null,
          imageUrl: selectedImg || asset?.portraitUrl || null,
          fallbackImage: event.fallbackImage || null,
          video: asset?.animationUrl || event.video || null,
          ticketUrl: event.ticketUrl || event.sourceUrl || null,
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
