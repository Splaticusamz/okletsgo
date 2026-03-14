import fs from 'fs';
import path from 'path';
import { areLikelyDuplicates } from './normalize.js';
import { normalizeVenueRecord } from './enrich.js';

const DB_PATH = path.join(process.cwd(), 'data', 'events.db.json');
const SEED_PATH = path.join(process.cwd(), 'data', 'current-week.json');

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureDbShape(db) {
  return {
    events: Array.isArray(db?.events) ? db.events : [],
    venues: Array.isArray(db?.venues) ? db.venues : [],
    imageCandidates: Array.isArray(db?.imageCandidates) ? db.imageCandidates : [],
    assets: Array.isArray(db?.assets) ? db.assets : [],
    publishBatches: Array.isArray(db?.publishBatches) ? db.publishBatches : [],
    batchActions: Array.isArray(db?.batchActions) ? db.batchActions : [],
  };
}

function attachRelated(db, event) {
  const imageCandidates = db.imageCandidates.filter((candidate) => candidate.eventId === event.id);
  const assets = db.assets.filter((asset) => asset.eventId === event.id);
  const selectedImageCandidate = imageCandidates.find((candidate) => candidate.selected) ?? imageCandidates[0] ?? null;
  const latestAsset = assets[0] ?? null;
  return {
    ...event,
    imageCandidates,
    imageCandidateCount: imageCandidates.length,
    selectedImageCandidate,
    assets,
    latestAsset,
    assetCount: assets.length,
    assetStatus: latestAsset?.status ?? null,
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
    address: null,
    description: `${entry.venue} in ${entry.city}`,
    city: entry.city,
    fallbackImage: entry.fallbackImage ?? null,
    video: entry.video ?? null,
    sourceId: 'seed',
    source: 'seed',
    sourceUrl: null,
    ticketUrl: null,
    tags: [],
    status: 'candidate',
    reviews: [],
    confidenceScore: null,
    confidenceReasons: [],
    createdAt: now,
    updatedAt: now,
  };
}

function sameSource(event, candidate) {
  return event.source === candidate.source || event.sourceId === candidate.sourceId;
}

function findExistingDuplicate(events, candidate) {
  return events.find((event) => {
    if (candidate.externalId && sameSource(event, candidate) && event.externalId && event.externalId === candidate.externalId) {
      return true;
    }
    return areLikelyDuplicates(event, candidate);
  }) ?? null;
}

function sortAssetsNewestFirst(assets = []) {
  return [...assets].sort((a, b) => {
    const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
    return bTime - aTime;
  });
}

function makeAssetRecord(event, input = {}, existing = null) {
  const now = new Date().toISOString();
  const assetId = existing?.id ?? input.id ?? `asset-${event.id}-${Date.now()}`;
  return {
    id: assetId,
    eventId: event.id,
    version: Number.isFinite(input.version) ? input.version : (existing?.version ?? 1),
    status: input.status ?? existing?.status ?? 'pending',
    stillStatus: input.stillStatus ?? existing?.stillStatus ?? 'pending',
    animationStatus: input.animationStatus ?? existing?.animationStatus ?? 'pending',
    stillOnly: input.stillOnly ?? existing?.stillOnly ?? false,
    sourceImageUrl: input.sourceImageUrl ?? existing?.sourceImageUrl ?? null,
    sourceImagePath: input.sourceImagePath ?? existing?.sourceImagePath ?? null,
    sourceImageCandidateId: input.sourceImageCandidateId ?? existing?.sourceImageCandidateId ?? null,
    portraitUrl: input.portraitUrl ?? existing?.portraitUrl ?? null,
    squareUrl: input.squareUrl ?? existing?.squareUrl ?? null,
    portraitAvifUrl: input.portraitAvifUrl ?? existing?.portraitAvifUrl ?? null,
    squareAvifUrl: input.squareAvifUrl ?? existing?.squareAvifUrl ?? null,
    animationUrl: input.animationUrl ?? existing?.animationUrl ?? null,
    animationPosterUrl: input.animationPosterUrl ?? existing?.animationPosterUrl ?? null,
    animationProvider: input.animationProvider ?? existing?.animationProvider ?? null,
    frame: input.frame ?? existing?.frame ?? null,
    notes: input.notes ?? existing?.notes ?? '',
    error: input.error ?? existing?.error ?? null,
    createdAt: existing?.createdAt ?? now,
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

  upsertVenue(input) {
    const db = this.read();
    const normalized = normalizeVenueRecord(input);
    if (!normalized.id) return null;

    const idx = db.venues.findIndex((venue) => venue.id === normalized.id || (venue.name === normalized.name && venue.city === normalized.city));
    const now = new Date().toISOString();
    const venue = {
      id: normalized.id,
      name: normalized.name,
      city: normalized.city,
      address: normalized.address,
      streetAddress: normalized.streetAddress,
      updatedAt: now,
      createdAt: idx >= 0 ? db.venues[idx].createdAt ?? now : now,
    };

    if (idx >= 0) db.venues[idx] = { ...db.venues[idx], ...venue };
    else db.venues.unshift(venue);

    this.write(db);
    return venue;
  }

  getVenues() {
    return this.read().venues;
  }

  getImageCandidatesByEventId(eventId) {
    return this.read().imageCandidates.filter((candidate) => candidate.eventId === eventId);
  }

  replaceImageCandidates(eventId, candidates = []) {
    const db = this.read();
    db.imageCandidates = db.imageCandidates.filter((candidate) => candidate.eventId !== eventId);
    db.imageCandidates.unshift(...candidates);
    this.write(db);
    return candidates;
  }

  getAssets() {
    const db = this.read();
    return sortAssetsNewestFirst(db.assets).map((asset) => {
      const event = db.events.find((item) => item.id === asset.eventId);
      return event ? { ...asset, event: attachRelated(db, event) } : asset;
    });
  }

  getAssetsByEventId(eventId) {
    return sortAssetsNewestFirst(this.read().assets.filter((asset) => asset.eventId === eventId));
  }

  getLatestAssetByEventId(eventId) {
    return this.getAssetsByEventId(eventId)[0] ?? null;
  }

  createOrUpdateAsset(eventId, input = {}) {
    const db = this.read();
    const event = db.events.find((item) => item.id === eventId);
    if (!event) return null;

    const latest = sortAssetsNewestFirst(db.assets.filter((asset) => asset.eventId === eventId))[0] ?? null;
    const shouldCreateNewVersion = input.forceNewVersion === true || input.createNewVersion === true;
    const existing = shouldCreateNewVersion ? null : latest;
    const nextVersion = existing?.version ?? ((latest?.version ?? 0) + 1);
    const record = makeAssetRecord(event, { ...input, version: input.version ?? nextVersion }, existing);

    db.assets = db.assets.filter((asset) => asset.id !== record.id);
    db.assets.unshift(record);
    db.assets = sortAssetsNewestFirst(db.assets);
    this.write(db);
    return record;
  }

  seedFromCurrentWeek() {
    const db = this.read();
    if (db.events.length > 0) return db.events.map((event) => attachRelated(db, event));

    const weekData = readJson(SEED_PATH, null);
    if (!weekData?.days) return [];

    const events = [];
    const venues = [];
    for (const day of weekData.days ?? []) {
      for (const [mode, entry] of Object.entries(day.entries ?? {})) {
        const event = normalizeSeedEvent(day, mode, entry);
        events.push(event);
        if (entry.venue) {
          const venue = normalizeVenueRecord({ venue: entry.venue, city: entry.city });
          if (venue.id && !venues.find((existing) => existing.id === venue.id)) {
            venues.push({
              id: venue.id,
              name: venue.name,
              city: venue.city,
              address: venue.address,
              streetAddress: venue.streetAddress,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    this.write({ events, venues, imageCandidates: [], assets: [], publishBatches: [], batchActions: [] });
    return events;
  }

  getEvents() {
    const db = this.read();
    if (db.events.length === 0) return this.seedFromCurrentWeek();
    return db.events.map((event) => attachRelated(db, event));
  }

  getEvent(id) {
    return this.getEvents().find((event) => event.id === id) ?? null;
  }

  createEvent(input) {
    const db = this.read();
    const now = new Date().toISOString();
    const titlePart = slug(String(input.title ?? 'event')).slice(0, 48) || 'event';
    const venue = input.venue ? this.upsertVenue({ venue: input.venue, city: input.city, address: input.address }) : null;
    const refreshedDb = this.read();
    const eventId = input.id ?? `evt-${Date.now()}-${titlePart}`;

    const event = {
      id: eventId,
      title: input.title,
      date: input.date,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      venue: input.venue ?? null,
      venueId: input.venueId ?? venue?.id ?? (input.venue ? slug(input.venue) : null),
      city: input.city ?? venue?.city ?? null,
      address: input.address ?? venue?.address ?? null,
      description: input.description ?? '',
      mode: input.mode ?? 'day',
      sourceId: input.sourceId ?? 'manual',
      source: input.source ?? 'manual',
      status: input.status ?? 'candidate',
      sourceUrl: input.sourceUrl ?? null,
      ticketUrl: input.ticketUrl ?? null,
      externalId: input.externalId ?? null,
      fetchedAt: input.fetchedAt ?? null,
      reviews: Array.isArray(input.reviews) ? input.reviews : [],
      confidenceScore: Number.isFinite(input.confidenceScore) ? input.confidenceScore : null,
      confidenceReasons: Array.isArray(input.confidenceReasons) ? input.confidenceReasons : [],
      enrichment: input.enrichment ?? null,
      tags: Array.isArray(input.tags) ? input.tags : [],
      raw: input.raw ?? null,
      createdAt: now,
      updatedAt: now,
    };

    refreshedDb.events.unshift(event);

    const imageCandidates = (Array.isArray(input.imageCandidates) ? input.imageCandidates : []).map((candidate, index) => ({
      id: candidate.id ?? `${eventId}-img-${index}`,
      eventId,
      url: candidate.url,
      sourceUrl: candidate.sourceUrl ?? input.sourceUrl ?? null,
      provenance: candidate.provenance ?? input.sourceId ?? 'unknown',
      extractorId: candidate.extractorId ?? input.sourceId ?? 'unknown',
      capturedAt: candidate.capturedAt ?? input.fetchedAt ?? now,
      rank: candidate.rank ?? index + 1,
      selected: candidate.selected ?? false,
      createdAt: now,
      updatedAt: now,
    })).filter((candidate) => Boolean(candidate.url));

    refreshedDb.imageCandidates = refreshedDb.imageCandidates.filter((candidate) => candidate.eventId !== eventId);
    refreshedDb.imageCandidates.unshift(...imageCandidates);

    this.write(refreshedDb);
    return attachRelated(refreshedDb, event);
  }

  createEvents(events = []) {
    return events.map((event) => this.createEvent(event));
  }

  importCandidateEvents(events = []) {
    const imported = [];
    const skipped = [];
    const venues = [];

    for (const candidate of events) {
      const existing = findExistingDuplicate(this.getEvents(), candidate);
      if (existing) {
        skipped.push({ candidateId: candidate.id, reason: 'duplicate', existingId: existing.id, title: candidate.title });
        continue;
      }

      const created = this.createEvent({
        ...candidate,
        status: 'candidate',
        source: candidate.source || `scraper:${candidate.sourceId}`,
      });
      imported.push(created);
      if (created.venueId) {
        const venue = this.getVenues().find((item) => item.id === created.venueId);
        if (venue) venues.push(venue);
      }
    }

    return {
      imported,
      skipped,
      venues,
      summary: {
        importedCount: imported.length,
        skippedCount: skipped.length,
        venueCount: new Set(venues.map((venue) => venue.id)).size,
        imageCandidateCount: imported.reduce((sum, event) => sum + (event.imageCandidateCount ?? 0), 0),
      },
    };
  }

  updateEvent(id, patch) {
    const db = this.read();
    const idx = db.events.findIndex((event) => event.id === id);
    if (idx === -1) return null;

    let venuePatch = {};
    if (patch.venue || patch.city || patch.address) {
      const venue = this.upsertVenue({
        venue: patch.venue ?? db.events[idx].venue,
        city: patch.city ?? db.events[idx].city,
        address: patch.address ?? db.events[idx].address,
      });
      venuePatch = {
        venueId: venue?.id ?? db.events[idx].venueId,
        address: patch.address ?? venue?.address ?? db.events[idx].address ?? null,
        city: patch.city ?? venue?.city ?? db.events[idx].city ?? null,
      };
    }

    const refreshedDb = this.read();
    const refreshedIdx = refreshedDb.events.findIndex((event) => event.id === id);
    const imageCandidates = patch.imageCandidates;
    const nextPatch = { ...patch };
    delete nextPatch.imageCandidates;

    refreshedDb.events[refreshedIdx] = {
      ...refreshedDb.events[refreshedIdx],
      ...nextPatch,
      ...venuePatch,
      updatedAt: new Date().toISOString(),
    };

    if (Array.isArray(imageCandidates)) {
      refreshedDb.imageCandidates = refreshedDb.imageCandidates.filter((candidate) => candidate.eventId !== id);
      refreshedDb.imageCandidates.unshift(...imageCandidates.map((candidate, index) => ({
        id: candidate.id ?? `${id}-img-${index}`,
        eventId: id,
        url: candidate.url,
        sourceUrl: candidate.sourceUrl ?? refreshedDb.events[refreshedIdx].sourceUrl ?? null,
        provenance: candidate.provenance ?? refreshedDb.events[refreshedIdx].sourceId ?? 'unknown',
        extractorId: candidate.extractorId ?? refreshedDb.events[refreshedIdx].sourceId ?? 'unknown',
        capturedAt: candidate.capturedAt ?? new Date().toISOString(),
        rank: candidate.rank ?? index + 1,
        selected: candidate.selected ?? false,
        createdAt: candidate.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })).filter((candidate) => Boolean(candidate.url)));
    }

    this.write(refreshedDb);
    return attachRelated(refreshedDb, refreshedDb.events[refreshedIdx]);
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
    return attachRelated(db, db.events[idx]);
  }

  // ── Publish Batch CRUD ──

  getPublishBatches() {
    return this.read().publishBatches;
  }

  getPublishBatch(id) {
    return this.read().publishBatches.find((b) => b.id === id) ?? null;
  }

  getLatestPublishBatch() {
    const batches = this.read().publishBatches;
    return batches.length > 0 ? batches[0] : null;
  }

  getCurrentPublishedBatch() {
    return this.read().publishBatches.find((b) => b.status === 'published') ?? null;
  }

  createPublishBatch(input) {
    const db = this.read();
    const now = new Date().toISOString();
    const batch = {
      id: input.id ?? `batch-${Date.now()}`,
      weekLabel: input.weekLabel ?? null,
      eventIds: Array.isArray(input.eventIds) ? input.eventIds : [],
      createdAt: now,
      updatedAt: now,
      status: input.status ?? 'draft',
      publishedAt: null,
      rolledBackAt: null,
    };
    db.publishBatches.unshift(batch);
    this.write(db);
    return batch;
  }

  updatePublishBatch(id, patch) {
    const db = this.read();
    const idx = db.publishBatches.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    db.publishBatches[idx] = { ...db.publishBatches[idx], ...patch, updatedAt: new Date().toISOString() };
    this.write(db);
    return db.publishBatches[idx];
  }

  getBatchActions() {
    return this.read().batchActions;
  }

  addBatchAction(action) {
    const db = this.read();
    const record = {
      id: `ba-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...action,
      timestamp: action.timestamp ?? new Date().toISOString(),
    };
    db.batchActions.unshift(record);
    this.write(db);
    return record;
  }
}

export class FileDbAdapter extends BaseDbAdapter {
  constructor(options = {}) {
    super();
    this.dbPath = options.dbPath ?? DB_PATH;
  }

  read() {
    return ensureDbShape(readJson(this.dbPath, { events: [], venues: [], imageCandidates: [], assets: [], publishBatches: [], batchActions: [] }));
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
    getVenues: () => adapter.getVenues(),
    getImageCandidatesByEventId: (eventId) => adapter.getImageCandidatesByEventId(eventId),
    replaceImageCandidates: (eventId, candidates) => adapter.replaceImageCandidates(eventId, candidates),
    getAssets: () => adapter.getAssets(),
    getAssetsByEventId: (eventId) => adapter.getAssetsByEventId(eventId),
    getLatestAssetByEventId: (eventId) => adapter.getLatestAssetByEventId(eventId),
    createOrUpdateAsset: (eventId, input) => adapter.createOrUpdateAsset(eventId, input),
    upsertVenue: (input) => adapter.upsertVenue(input),
    createEvent: (input) => adapter.createEvent(input),
    createEvents: (events) => adapter.createEvents(events),
    importCandidateEvents: (events) => adapter.importCandidateEvents(events),
    updateEvent: (id, patch) => adapter.updateEvent(id, patch),
    addReview: (eventId, review) => adapter.addReview(eventId, review),
    getPublishBatches: () => adapter.getPublishBatches(),
    getPublishBatch: (id) => adapter.getPublishBatch(id),
    getLatestPublishBatch: () => adapter.getLatestPublishBatch(),
    getCurrentPublishedBatch: () => adapter.getCurrentPublishedBatch(),
    createPublishBatch: (input) => adapter.createPublishBatch(input),
    updatePublishBatch: (id, patch) => adapter.updatePublishBatch(id, patch),
    getBatchActions: () => adapter.getBatchActions(),
    addBatchAction: (action) => adapter.addBatchAction(action),
  };
}

export const db = createDb();

export const seedFromCurrentWeek = () => db.seedFromCurrentWeek();
export const getEvents = () => db.getEvents();
export const getEvent = (id) => db.getEvent(id);
export const getVenues = () => db.getVenues();
export const getImageCandidatesByEventId = (eventId) => db.getImageCandidatesByEventId(eventId);
export const replaceImageCandidates = (eventId, candidates) => db.replaceImageCandidates(eventId, candidates);
export const getAssets = () => db.getAssets();
export const getAssetsByEventId = (eventId) => db.getAssetsByEventId(eventId);
export const getLatestAssetByEventId = (eventId) => db.getLatestAssetByEventId(eventId);
export const createOrUpdateAsset = (eventId, input) => db.createOrUpdateAsset(eventId, input);
export const upsertVenue = (input) => db.upsertVenue(input);
export const createEvent = (input) => db.createEvent(input);
export const createEvents = (events) => db.createEvents(events);
export const importCandidateEvents = (events) => db.importCandidateEvents(events);
export const updateEvent = (id, patch) => db.updateEvent(id, patch);
export const addReview = (eventId, review) => db.addReview(eventId, review);
export const getPublishBatches = () => db.getPublishBatches();
export const getPublishBatch = (id) => db.getPublishBatch(id);
export const getLatestPublishBatch = () => db.getLatestPublishBatch();
export const getCurrentPublishedBatch = () => db.getCurrentPublishedBatch();
export const createPublishBatch = (input) => db.createPublishBatch(input);
export const updatePublishBatch = (id, patch) => db.updatePublishBatch(id, patch);
export const getBatchActions = () => db.getBatchActions();
export const addBatchAction = (action) => db.addBatchAction(action);

export default db;
