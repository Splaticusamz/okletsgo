/**
 * T-021/022: File-based JSON store for events
 * Reads/writes data/events.db.json
 */

import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'events.db.json');
const SEED_PATH = path.join(process.cwd(), 'data', 'current-week.json');

function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { events: [] };
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

/**
 * seedFromCurrentWeek() — populate from current-week.json if DB is empty
 */
export function seedFromCurrentWeek() {
  const db = readDB();
  if (db.events && db.events.length > 0) return db.events;

  let weekData;
  try {
    const raw = fs.readFileSync(SEED_PATH, 'utf-8');
    weekData = JSON.parse(raw);
  } catch {
    return [];
  }

  const events = [];
  for (const day of weekData.days ?? []) {
    for (const [mode, entry] of Object.entries(day.entries ?? {})) {
      events.push({
        id: `${day.day.toLowerCase()}-${mode}`,
        title: entry.venue,
        date: day.day,
        mode,
        venueId: entry.venue?.toLowerCase().replace(/\s+/g, '-') ?? null,
        description: `${entry.venue} in ${entry.city}`,
        city: entry.city,
        fallbackImage: entry.fallbackImage ?? null,
        video: entry.video ?? null,
        source: 'seed',
        status: 'candidate',
        reviews: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  writeDB({ events });
  return events;
}

/**
 * getEvents() → Event[]
 */
export function getEvents() {
  const db = readDB();
  if (!db.events || db.events.length === 0) {
    return seedFromCurrentWeek();
  }
  return db.events;
}

/**
 * getEvent(id) → Event | null
 */
export function getEvent(id) {
  const events = getEvents();
  return events.find(e => e.id === id) ?? null;
}

/**
 * updateEvent(id, patch) → updated Event | null
 */
export function updateEvent(id, patch) {
  const db = readDB();
  const idx = (db.events ?? []).findIndex(e => e.id === id);
  if (idx === -1) return null;

  db.events[idx] = {
    ...db.events[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeDB(db);
  return db.events[idx];
}

/**
 * addReview(eventId, review) → updated Event | null
 */
export function addReview(eventId, review) {
  const db = readDB();
  const idx = (db.events ?? []).findIndex(e => e.id === eventId);
  if (idx === -1) return null;

  const reviews = db.events[idx].reviews ?? [];
  reviews.push({
    ...review,
    timestamp: new Date().toISOString(),
  });

  db.events[idx] = {
    ...db.events[idx],
    reviews,
    updatedAt: new Date().toISOString(),
  };
  writeDB(db);
  return db.events[idx];
}

export default { getEvents, getEvent, updateEvent, addReview, seedFromCurrentWeek };
