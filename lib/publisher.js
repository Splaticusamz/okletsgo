/**
 * lib/publisher.js — Batch generation and publish lifecycle
 *
 * Collects approved_2 events into a weekly publish batch,
 * supports publish confirmation and rollback with audit trail.
 */

import {
  getEvents,
  getEvent,
  getCurrentPublishedBatch,
  getLatestPublishBatch,
  getPublishBatches,
  createPublishBatch,
  updatePublishBatch,
  addBatchAction,
  getBatchActions,
  updateEvent,
} from './db.js';
import { createWeekSnapshot } from './archive.js';

function currentWeekLabel() {
  const now = new Date();
  const day = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

/**
 * Generate a new draft batch from all approved_2 events.
 * Returns the batch record.
 */
export function generateDraftBatch(options = {}) {
  const events = getEvents();
  const assignments = options.assignments ?? null;

  let eventIds;
  if (assignments && typeof assignments === 'object') {
    // Use the calendar assignments (day:mode → eventId)
    eventIds = [...new Set(Object.values(assignments))];
    // Update each event's date/mode based on assignment
    for (const [slot, eventId] of Object.entries(assignments)) {
      const [day, mode] = slot.split(':');
      const evt = events.find(e => e.id === eventId);
      if (evt) {
        updateEvent(eventId, { date: day, mode });
      }
    }
  } else {
    const eligible = events.filter((e) => e.status === 'approved_2');
    if (eligible.length === 0) {
      throw new Error('No approved_2 events available for a batch');
    }
    eventIds = eligible.map((e) => e.id);
  }

  if (eventIds.length === 0) {
    throw new Error('No events to publish');
  }

  const batch = createPublishBatch({
    weekLabel: currentWeekLabel(),
    eventIds,
    assignments: assignments ?? undefined,
    status: 'draft',
  });

  addBatchAction({
    batchId: batch.id,
    action: 'generate_draft',
    detail: `Generated draft batch with ${eligible.length} event(s)`,
    by: 'admin',
  });

  return batch;
}

/**
 * Confirm-publish a draft batch.
 * Sets any previous published batch to 'superseded',
 * marks events as 'published', and sets batch status to 'published'.
 */
export function confirmPublish(batchId) {
  const batch = getLatestPublishBatch();
  if (!batch || batch.id !== batchId) {
    throw new Error(`Batch not found: ${batchId}`);
  }
  if (batch.status !== 'draft') {
    throw new Error(`Batch ${batchId} is not in draft status (current: ${batch.status})`);
  }

  // Supersede any currently-published batch
  const currentPublished = getCurrentPublishedBatch();
  if (currentPublished && currentPublished.id !== batchId) {
    updatePublishBatch(currentPublished.id, { status: 'superseded' });
    addBatchAction({
      batchId: currentPublished.id,
      action: 'superseded',
      detail: `Superseded by batch ${batchId}`,
      by: 'system',
    });
  }

  // Publish the batch
  const now = new Date().toISOString();
  const published = updatePublishBatch(batchId, { status: 'published', publishedAt: now });

  // Mark events as published
  for (const eventId of batch.eventIds) {
    const event = getEvent(eventId);
    if (event && event.status === 'approved_2') {
      updateEvent(eventId, { status: 'published' });
    }
  }

  addBatchAction({
    batchId,
    action: 'publish',
    detail: `Published batch with ${batch.eventIds.length} event(s)`,
    by: 'admin',
  });

  // Archive the week snapshot
  try {
    createWeekSnapshot(published);
  } catch (err) {
    console.error('[archive] Failed to create week snapshot:', err.message);
  }

  return published;
}

/**
 * Rollback the current published batch.
 * Sets it to 'rolled_back' and restores the most recent 'superseded' batch.
 */
export function rollbackBatch(batchId) {
  const batches = getPublishBatches();
  const batch = batches.find((b) => b.id === batchId);
  if (!batch) throw new Error(`Batch not found: ${batchId}`);
  if (batch.status !== 'published') {
    throw new Error(`Batch ${batchId} is not published (current: ${batch.status})`);
  }

  // Revert events back to approved_2
  for (const eventId of batch.eventIds) {
    const event = getEvent(eventId);
    if (event && event.status === 'published') {
      updateEvent(eventId, { status: 'approved_2' });
    }
  }

  const now = new Date().toISOString();
  updatePublishBatch(batchId, { status: 'rolled_back', rolledBackAt: now });

  addBatchAction({
    batchId,
    action: 'rollback',
    detail: `Rolled back batch ${batchId}`,
    by: 'admin',
  });

  // Restore previous superseded batch if one exists
  const previousSuperseded = batches.find((b) => b.status === 'superseded');
  if (previousSuperseded) {
    updatePublishBatch(previousSuperseded.id, { status: 'published', publishedAt: now });
    // Re-publish those events
    for (const eventId of previousSuperseded.eventIds) {
      const event = getEvent(eventId);
      if (event && event.status === 'approved_2') {
        updateEvent(eventId, { status: 'published' });
      }
    }
    addBatchAction({
      batchId: previousSuperseded.id,
      action: 'restored',
      detail: `Restored after rollback of ${batchId}`,
      by: 'system',
    });
  }

  return { rolledBack: batch, restored: previousSuperseded ?? null };
}

/**
 * Get the events for a batch (hydrated).
 */
export function getBatchEvents(batchId) {
  const batches = getPublishBatches();
  const batch = batches.find((b) => b.id === batchId);
  if (!batch) return [];
  return batch.eventIds.map((id) => getEvent(id)).filter(Boolean);
}

/**
 * Get published events for public display.
 * Returns null if no published batch (caller should fall back to seed data).
 */
export function getPublishedEvents() {
  const batch = getCurrentPublishedBatch();
  if (!batch) return null;
  return batch.eventIds.map((id) => getEvent(id)).filter(Boolean);
}

/**
 * Get batch audit trail.
 */
export function getBatchAuditTrail(batchId) {
  return getBatchActions().filter((a) => a.batchId === batchId);
}

export default {
  generateDraftBatch,
  confirmPublish,
  rollbackBatch,
  getBatchEvents,
  getPublishedEvents,
  getBatchAuditTrail,
};
