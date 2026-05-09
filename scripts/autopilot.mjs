#!/usr/bin/env node
/**
 * OK LET'S GO Autopilot
 * Runs the full curation pipeline with minimal human involvement.
 *
 * Steps:
 * 1. Scrape active sources
 * 2. Import new candidates (deduped + scored)
 * 3. Reject stale seed candidates
 * 4. Auto-approve high-confidence candidates (score >= 55)
 * 5. Auto-promote approved_1 → approved_2
 * 6. Auto-place events on empty calendar slots (mode-aware)
 * 7. Generate assets for placed events
 * 8. Create publish batch from placed events
 * 9. Publish batch if it has >= minEvents
 * 10. Turn off demo mode
 * 11. Generate newsletter draft
 * 12. Report summary
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// Import libs
const { initDb, flushDb, getEvents, getEvent, updateEvent, importCandidateEvents, getSettings, updateSettings, createPublishBatch, updatePublishBatch, addBatchAction, createNewsletterDraft } = await import('../lib/db.js');
const { normalizeEvents, dedupeEvents } = await import('../lib/normalize.js');
const { transition, canTransition } = await import('../lib/state.js');
const { generateAssetsForEvent, ensurePendingAssetRecord } = await import('../lib/assets.js');
const { generateDraftBatch, confirmPublish, getCurrentPublishedBatch } = await import('../lib/publisher.js');
const { buildNewsletterDraft } = await import('../lib/newsletter.js');
const { getActiveSources } = await import('../lib/sources.js');
const { runSourceFetcher } = await import('../lib/fetchers/index.js');

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const MODES = ['night', 'grownup', 'family'];

function log(...args) {
  console.log('[autopilot]', ...args);
}

function slotKey(day, mode) {
  return `${day}:${mode}`;
}

function getEmptySlots(events) {
  const taken = new Set();
  for (const e of events) {
    if (e.calendarDay && e.calendarMode && e.status !== 'rejected') {
      taken.add(slotKey(e.calendarDay, e.calendarMode));
    }
  }
  const empty = [];
  for (const day of DAY_ORDER) {
    for (const mode of MODES) {
      const key = slotKey(day, mode);
      if (!taken.has(key)) empty.push({ day, mode, key });
    }
  }
  return empty;
}

function modeMatches(eventMode, slotMode) {
  const m = (eventMode || 'day').toLowerCase();
  if (m === slotMode) return true;
  if (m === 'day' && slotMode === 'grownup') return true;
  return false;
}

function assignEventToSlot(event, slot) {
  updateEvent(event.id, { calendarDay: slot.day, calendarMode: slot.mode });
  log(`Assigned "${event.title}" → ${slot.day} ${slot.mode}`);
}

function addReview(event, action, stage, notes) {
  const review = {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventId: event.id,
    stage: stage ?? null,
    action,
    reviewedBy: 'autopilot',
    reviewedAt: new Date().toISOString(),
    notes: notes ?? '',
    previousStatus: event.status,
    newStatus: transition(event, action),
  };
  const existing = event.reviews || [];
  updateEvent(event.id, { reviews: [...existing, review], status: review.newStatus });
  return review;
}

async function runScrapers() {
  log('Running scrapers...');
  const allNormalized = [];

  // 1. Browser-based scrapers via Puppeteer
  const { execSync } = await import('child_process');
  const browserSources = ['tourismkelowna', 'eventbrite', 'castanet'];
  for (const sourceId of browserSources) {
    try {
      // Run scrape.mjs --source <id> and capture JSON output
      const out = execSync(`node scripts/scrape.mjs --source ${sourceId}`, {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8',
        timeout: 60000,
        env: process.env,
      });
      // Parse event count from output, then write tmp file and read it
      // Actually scrape.mjs doesn't output JSON. Let's run it with --discord to save tmp/scraped-events.json
    } catch (err) {
      log(`  Browser scraper ${sourceId}: subprocess error — ${err.message}`);
    }
  }

  // Better: run all browser scrapers via --discord to save tmp/scraped-events.json
  try {
    execSync('node scripts/scrape.mjs --discord', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      timeout: 120000,
      env: process.env,
    });
    const scrapedPath = path.join(__dirname, '..', 'tmp', 'scraped-events.json');
    if (fs.existsSync(scrapedPath)) {
      const scrapedData = JSON.parse(fs.readFileSync(scrapedPath, 'utf-8'));
      const scrapedEvents = scrapedData.events || [];
      if (scrapedEvents.length > 0) {
        log(`  Browser scrapers: ${scrapedEvents.length} raw events`);
        for (const e of scrapedEvents) {
          const source = { id: e.source || 'scraper', name: e.source || 'scraper', url: e.url || '' };
          const normalized = normalizeEvents([e], source);
          allNormalized.push(...normalized);
        }
      }
    }
  } catch (err) {
    log(`  Browser scrapers: ${err.message}`);
  }

  // 2. Serverless-safe generic fetchers
  const sources = getActiveSources();
  for (const source of sources) {
    try {
      const result = await runSourceFetcher(source);
      const raw = result.events ?? [];
      if (raw.length > 0) {
        const normalized = normalizeEvents(raw, { id: source.id, name: source.name, url: source.url });
        log(`  ${source.name}: ${raw.length} raw → ${normalized.length} normalized`);
        allNormalized.push(...normalized);
      } else {
        log(`  ${source.name}: no events`);
      }
    } catch (err) {
      log(`  ${source.name}: ERROR — ${err.message}`);
    }
  }

  if (allNormalized.length === 0) {
    log('No new events from scrapers.');
    return { imported: 0, candidates: [] };
  }

  const { deduped } = dedupeEvents(allNormalized);
  const existingEvents = getEvents();
  const newCandidates = deduped.filter((c) => {
    return !existingEvents.some((e) =>
      e.title === c.title && e.date === c.date && e.venue === c.venue
    );
  });

  let totalImported = 0;
  if (newCandidates.length > 0) {
    // Strip heavy raw fields before import to keep DB size lean
    const lightCandidates = newCandidates.map((c) => {
      const { raw: _raw, ...rest } = c;
      return rest; // drop the full raw payload
    });
    const result = importCandidateEvents(lightCandidates);
    totalImported = result?.summary?.importedCount ?? 0;
    log(`Imported ${totalImported} new candidates (${result?.summary?.skippedCount ?? 0} duplicates skipped).`);
  } else {
    log('No new candidates after dedupe against DB.');
  }

  return { imported: totalImported, candidates: newCandidates };
}

function rejectSeedCandidates() {
  const events = getEvents();
  let count = 0;
  for (const e of events) {
    if (e.status === 'candidate' && e.sourceId === 'seed') {
      if (canTransition(e, 'reject')) {
        addReview(e, 'reject', 'autopilot', 'Rejected stale seed candidate');
        count++;
      }
    }
  }
  if (count) log(`Rejected ${count} stale seed candidates.`);
  return count;
}

function autoApprove() {
  const events = getEvents();
  let count = 0;
  for (const e of events) {
    if (e.status === 'candidate') {
      const score = e.confidenceScore ?? 0;
      if (score >= 55 && canTransition(e, 'approve')) {
        addReview(e, 'approve', 'stage_1', `Auto-approved (confidence ${score})`);
        count++;
      }
    }
  }
  if (count) log(`Auto-approved ${count} candidates to approved_1.`);
  return count;
}

function autoPromote() {
  const events = getEvents();
  let count = 0;
  for (const e of events) {
    if (e.status === 'approved_1' && canTransition(e, 'approve')) {
      addReview(e, 'approve', 'stage_2', 'Auto-promoted to approved_2');
      count++;
    }
  }
  if (count) log(`Auto-promoted ${count} events to approved_2.`);
  return count;
}

function autoPlace() {
  let placed = 0;

  // First pass: mode-aware placement
  let events = getEvents();
  let emptySlots = getEmptySlots(events);
  if (emptySlots.length === 0) {
    log('Calendar is full.');
    return 0;
  }

  let eligible = events.filter((e) =>
    ['approved_2', 'published'].includes(e.status) &&
    (!e.calendarDay || !e.calendarMode)
  );

  for (const slot of emptySlots) {
    const match = eligible.find((e) =>
      modeMatches(e.mode || e.calendarMode, slot.mode) &&
      !e.calendarDay
    );
    if (match) {
      assignEventToSlot(match, slot);
      placed++;
      // Refresh after mutation
      events = getEvents();
      eligible = events.filter((e) =>
        ['approved_2', 'published'].includes(e.status) &&
        (!e.calendarDay || !e.calendarMode)
      );
    }
  }

  // Second pass: any remaining eligible into any empty slot
  emptySlots = getEmptySlots(getEvents());
  eligible = getEvents().filter((e) =>
    ['approved_2', 'published'].includes(e.status) &&
    (!e.calendarDay || !e.calendarMode)
  );
  for (const slot of emptySlots) {
    const match = eligible.find((e) => !e.calendarDay);
    if (match) {
      assignEventToSlot(match, slot);
      placed++;
      eligible = getEvents().filter((e) =>
        ['approved_2', 'published'].includes(e.status) &&
        (!e.calendarDay || !e.calendarMode)
      );
    }
  }

  if (placed) log(`Auto-placed ${placed} events on calendar.`);
  return placed;
}

function hasSourceImage(event) {
  return Boolean(
    event?.selectedImageCandidate?.url ||
    event?.imageCandidates?.some((item) => item?.url) ||
    event?.fallbackImage
  );
}

async function autoGenerateAssets() {
  const events = getEvents();
  let count = 0;
  for (const e of events) {
    if (e.calendarDay && e.calendarMode && ['approved_1', 'approved_2', 'published'].includes(e.status)) {
      const latestAsset = e.latestAsset || e.assets?.[0];
      if (!latestAsset || latestAsset.status !== 'ready') {
        try {
          if (!hasSourceImage(e)) {
            log(`Asset generation skipped for ${e.title}: no source image selected.`);
            continue;
          }
          ensurePendingAssetRecord(e.id, { stillOnly: true });
          await generateAssetsForEvent(e.id, { stillOnly: true });
          count++;
        } catch (err) {
          log(`Asset generation failed for ${e.title}: ${err.message}`);
        }
      }
    }
  }
  if (count) log(`Generated assets for ${count} events.`);
  return count;
}

function createAndPublishBatch(minEvents = 7) {
  const events = getEvents();
  const placed = events.filter((e) =>
    e.calendarDay && e.calendarMode && ['approved_2', 'published'].includes(e.status)
  );

  if (placed.length < minEvents) {
    log(`Only ${placed.length} placed events (min ${minEvents}). Skipping publish.`);
    return null;
  }

  const assignments = {};
  for (const e of placed) {
    assignments[slotKey(e.calendarDay, e.calendarMode)] = e.id;
  }

  const batch = generateDraftBatch({ assignments });
  log(`Created draft batch ${batch.id} with ${placed.length} events.`);

  const published = confirmPublish(batch.id);
  log(`Published batch ${published.id}!`);

  return published;
}

function disableDemoMode() {
  const settings = getSettings();
  if (settings.demoMode) {
    updateSettings({ ...settings, demoMode: false });
    log('Demo mode disabled.');
    return true;
  }
  return false;
}

function generateNewsletter() {
  try {
    const draft = buildNewsletterDraft();
    const saved = createNewsletterDraft({ ...draft, status: 'draft' });
    log(`Newsletter draft created: ${saved.id}`);
    return saved;
  } catch (err) {
    log(`Newsletter draft failed: ${err.message}`);
    return null;
  }
}

// ── Main ──

async function main() {
  log('Starting OK LET\'S GO autopilot...');
  await initDb();

  const report = {
    scraped: 0,
    imported: 0,
    rejectedSeeds: 0,
    autoApproved: 0,
    autoPromoted: 0,
    autoPlaced: 0,
    assetsGenerated: 0,
    publishedBatch: null,
    demoDisabled: false,
    newsletterDraft: null,
    errors: [],
  };

  try {
    const { imported } = await runScrapers();
    report.imported = imported;
  } catch (err) {
    report.errors.push(`Scrape: ${err.message}`);
    log('Scrape failed:', err.message);
  }

  try {
    report.rejectedSeeds = rejectSeedCandidates();
  } catch (err) {
    report.errors.push(`Reject seeds: ${err.message}`);
  }

  try {
    report.autoApproved = autoApprove();
  } catch (err) {
    report.errors.push(`Auto-approve: ${err.message}`);
  }

  try {
    report.autoPromoted = autoPromote();
  } catch (err) {
    report.errors.push(`Auto-promote: ${err.message}`);
  }

  try {
    report.autoPlaced = autoPlace();
  } catch (err) {
    report.errors.push(`Auto-place: ${err.message}`);
  }

  try {
    report.assetsGenerated = await autoGenerateAssets();
  } catch (err) {
    report.errors.push(`Assets: ${err.message}`);
  }

  try {
    report.publishedBatch = createAndPublishBatch(7);
  } catch (err) {
    report.errors.push(`Publish: ${err.message}`);
  }

  try {
    report.demoDisabled = disableDemoMode();
  } catch (err) {
    report.errors.push(`Demo mode: ${err.message}`);
  }

  try {
    report.newsletterDraft = generateNewsletter();
  } catch (err) {
    report.errors.push(`Newsletter: ${err.message}`);
  }

  await flushDb();

  log('── AUTOPILOT REPORT ──');
  log(`Imported: ${report.imported}`);
  log(`Rejected seeds: ${report.rejectedSeeds}`);
  log(`Auto-approved: ${report.autoApproved}`);
  log(`Auto-promoted: ${report.autoPromoted}`);
  log(`Auto-placed: ${report.autoPlaced}`);
  log(`Assets generated: ${report.assetsGenerated}`);
  log(`Published batch: ${report.publishedBatch ? report.publishedBatch.id : 'none'}`);
  log(`Demo disabled: ${report.demoDisabled}`);
  log(`Newsletter draft: ${report.newsletterDraft ? report.newsletterDraft.id : 'none'}`);
  if (report.errors.length) log(`Errors: ${report.errors.join('; ')}`);

  const reportPath = path.join(__dirname, '..', 'tmp', 'autopilot-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`Report saved to ${reportPath}`);
}

main().catch((err) => {
  console.error('[autopilot] FATAL:', err);
  process.exit(1);
});
