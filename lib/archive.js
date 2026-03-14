/**
 * lib/archive.js — Week snapshot archiving
 *
 * Stores full week state when a batch is published.
 * Archives are stored as data/archives/week-YYYY-MM-DD.json
 */

import fs from 'fs';
import path from 'path';
import { getEvents, getEvent, getPublishBatches, getAssets } from './db.js';

const ARCHIVES_DIR = path.join(process.cwd(), 'data', 'archives');

function ensureArchivesDir() {
  if (!fs.existsSync(ARCHIVES_DIR)) {
    fs.mkdirSync(ARCHIVES_DIR, { recursive: true });
  }
}

/**
 * Create a snapshot of the current week state when a batch is published.
 */
export function createWeekSnapshot(batch) {
  ensureArchivesDir();
  const weekLabel = batch.weekLabel || new Date().toISOString().slice(0, 10);
  const filename = `week-${weekLabel}.json`;
  const filePath = path.join(ARCHIVES_DIR, filename);

  // Hydrate events from the batch
  const events = (batch.eventIds || []).map((id) => getEvent(id)).filter(Boolean);

  // Get assets for these events
  const allAssets = getAssets();
  const batchAssets = allAssets.filter((a) => batch.eventIds.includes(a.eventId));

  const snapshot = {
    id: `archive-${weekLabel}`,
    weekLabel,
    batchId: batch.id,
    publishedAt: batch.publishedAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    eventCount: events.length,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      venue: e.venue,
      city: e.city,
      address: e.address,
      description: e.description,
      mode: e.mode,
      source: e.source,
      sourceUrl: e.sourceUrl,
      ticketUrl: e.ticketUrl,
      tags: e.tags,
      status: e.status,
      confidenceScore: e.confidenceScore,
      latestAsset: e.latestAsset || null,
    })),
    assets: batchAssets.map((a) => ({
      id: a.id,
      eventId: a.eventId,
      portraitUrl: a.portraitUrl,
      squareUrl: a.squareUrl,
      animationUrl: a.animationUrl,
      status: a.status,
    })),
    batch: {
      id: batch.id,
      weekLabel: batch.weekLabel,
      status: batch.status,
      publishedAt: batch.publishedAt,
      createdAt: batch.createdAt,
      eventIds: batch.eventIds,
    },
  };

  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  return snapshot;
}

/**
 * List all archived weeks.
 */
export function listArchives() {
  ensureArchivesDir();
  const files = fs.readdirSync(ARCHIVES_DIR).filter((f) => f.startsWith('week-') && f.endsWith('.json'));
  return files
    .map((f) => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(ARCHIVES_DIR, f), 'utf-8'));
        return {
          id: data.id,
          weekLabel: data.weekLabel,
          publishedAt: data.publishedAt,
          eventCount: data.eventCount,
          batchId: data.batchId,
          filename: f,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.weekLabel.localeCompare(a.weekLabel));
}

/**
 * Get a specific archive by weekLabel (e.g. "2026-03-09").
 */
export function getArchive(weekLabel) {
  ensureArchivesDir();
  const filePath = path.join(ARCHIVES_DIR, `week-${weekLabel}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Compare two archived weeks. Returns added, removed, kept events.
 */
export function compareArchives(weekLabelA, weekLabelB) {
  const archiveA = getArchive(weekLabelA);
  const archiveB = getArchive(weekLabelB);
  if (!archiveA || !archiveB) return null;

  const idsA = new Set(archiveA.events.map((e) => e.id));
  const idsB = new Set(archiveB.events.map((e) => e.id));

  const added = archiveB.events.filter((e) => !idsA.has(e.id));
  const removed = archiveA.events.filter((e) => !idsB.has(e.id));
  const kept = archiveB.events.filter((e) => idsA.has(e.id));

  return {
    weekA: weekLabelA,
    weekB: weekLabelB,
    added,
    removed,
    kept,
    summary: {
      addedCount: added.length,
      removedCount: removed.length,
      keptCount: kept.length,
    },
  };
}

export default { createWeekSnapshot, listArchives, getArchive, compareArchives };
