import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'events.db.json');
const SEED_PATH = path.join(process.cwd(), 'data', 'current-week.json');

function ensureDbShape(db) {
  return {
    events: Array.isArray(db?.events) ? db.events : [],
  };
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function normalizeSeedEvent(day, mode, entry) {
  const now = new Date().toISOString();
  return {
    id: `${day.day.toLowerCase()}-${mode}`,
    title: entry.venue,
    date: day.day,
    startTime: null,
    endTime: null,
    mode,
    venue: entry.venue ?? null,
    venueId: entry.venue?.toLowerCase().replace(/\s+/g, '-') ?? null,
    description: `${entry.venue} in ${entry.city}`,
    city: entry.city,
    fallbackImage: entry.fallbackImage ?? null,
    video: entry.video ?? null,
    sourceId: 'seed',
    source: 'seed',
    status: 'candidate',
    reviews: [],
    createdAt: now,
    updatedAt: now,
  };
}

class BaseDbAdapter {
  read() {
    throw new Error('Adapter read() not implemented');
  }

  write(db) {
    throw new Error('Adapter write() not implemented');
  }

  seedFromCurrentWeek() {
    const db = this.read();
    if (db.events.length > 0) return db.events;

    const weekData = readJson(SEED_PATH, null);
    if (!weekData?.days) return [];

    const events = [];
    for (const day of weekData.days ?? []) {
      for (const [mode, entry] of Object.entries(day.entries ?? {})) {
        events.push(normalizeSeedEvent(day, mode, entry));
      }
    }

    this.write({ events });
    return events;
  }

  getEvents() {
    const db = this.read();
    if (db.events.length === 0) return this.seedFromCurrentWeek();
    return db.events;
  }

  getEvent(id) {
    return this.getEvents().find((event) => event.id === id) ?? null;
  }

  createEvent(input) {
    const db = this.read();
    const now = new Date().toISOString();
    const titlePart = String(input.title ?? 'event')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'event';

    const event = {
      id: input.id ?? `evt-${Date.now()}-${titlePart}`,
      title: input.title,
      date: input.date,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      venue: input.venue ?? null,
      venueId: input.venueId ?? (input.venue ? String(input.venue).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : null),
      city: input.city ?? null,
      description: input.description ?? '',
      mode: input.mode ?? 'day',
      sourceId: input.sourceId ?? 'manual',
      source: input.source ?? 'manual',
      status: input.status ?? 'candidate',
      sourceUrl: input.sourceUrl ?? null,
      externalId: input.externalId ?? null,
      fetchedAt: input.fetchedAt ?? null,
      reviews: Array.isArray(input.reviews) ? input.reviews : [],
      createdAt: now,
      updatedAt: now,
    };

    db.events.unshift(event);
    this.write(db);
    return event;
  }

  createEvents(events = []) {
    return events.map((event) => this.createEvent(event));
  }

  updateEvent(id, patch) {
    const db = this.read();
    const idx = db.events.findIndex((event) => event.id === id);
    if (idx === -1) return null;

    db.events[idx] = {
      ...db.events[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    this.write(db);
    return db.events[idx];
  }

  addReview(eventId, review) {
    const db = this.read();
    const idx = db.events.findIndex((event) => event.id === eventId);
    if (idx === -1) return null;

    const reviews = Array.isArray(db.events[idx].reviews) ? db.events[idx].reviews : [];
    reviews.push({
      ...review,
      reviewedAt: review.reviewedAt ?? new Date().toISOString(),
    });

    db.events[idx] = {
      ...db.events[idx],
      reviews,
      updatedAt: new Date().toISOString(),
    };

    this.write(db);
    return db.events[idx];
  }
}

export class FileDbAdapter extends BaseDbAdapter {
  constructor(options = {}) {
    super();
    this.dbPath = options.dbPath ?? DB_PATH;
  }

  read() {
    return ensureDbShape(readJson(this.dbPath, { events: [] }));
  }

  write(db) {
    writeJson(this.dbPath, ensureDbShape(db));
  }
}

export class VercelPostgresAdapter extends BaseDbAdapter {
  constructor() {
    super();
    this.blocker = 'T-018 remains open: a deploy-safe production database adapter was scaffolded, but this repo/session does not have a provisioned Vercel Postgres database or runtime client wired in. Vercel serverless file/SQLite storage is not durable across invocations, so file-backed JSON cannot be treated as real production persistence.';
  }

  read() {
    throw new Error(this.blocker);
  }

  write() {
    throw new Error(this.blocker);
  }
}

function createConfiguredAdapter(options = {}) {
  const provider = options.provider ?? process.env.DB_PROVIDER ?? 'file';
  if (provider === 'vercel-postgres') return new VercelPostgresAdapter(options);
  return new FileDbAdapter(options);
}

export function createDb(options = {}) {
  const adapter = options.adapter ?? createConfiguredAdapter(options);
  return {
    adapter,
    read: () => adapter.read(),
    write: (db) => adapter.write(db),
    seedFromCurrentWeek: () => adapter.seedFromCurrentWeek(),
    getEvents: () => adapter.getEvents(),
    getEvent: (id) => adapter.getEvent(id),
    createEvent: (input) => adapter.createEvent(input),
    createEvents: (events) => adapter.createEvents(events),
    updateEvent: (id, patch) => adapter.updateEvent(id, patch),
    addReview: (eventId, review) => adapter.addReview(eventId, review),
  };
}

export const db = createDb();

export const seedFromCurrentWeek = () => db.seedFromCurrentWeek();
export const getEvents = () => db.getEvents();
export const getEvent = (id) => db.getEvent(id);
export const createEvent = (input) => db.createEvent(input);
export const createEvents = (events) => db.createEvents(events);
export const updateEvent = (id, patch) => db.updateEvent(id, patch);
export const addReview = (eventId, review) => db.addReview(eventId, review);

export default db;
