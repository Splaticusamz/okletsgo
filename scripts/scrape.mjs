#!/usr/bin/env node
/**
 * Browser-based event scraper. Runs on the server (not Vercel).
 * Usage: node scripts/scrape.mjs [--source tourismkelowna] [--import]
 *
 * Without --import: prints results.
 * With --import: pushes candidates into the Neon DB.
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

const args = process.argv.slice(2);
const sourceFilter = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;
const shouldImport = args.includes('--import');

// Dynamic imports to avoid loading browser stuff in serverless
const { scrapeEvents, closeBrowser } = await import('../lib/browser.js');
const { normalizeCandidateEvent } = await import('../lib/fetchers/utils.js');

// ── Source scrapers ──

async function scrapeTourismKelowna() {
  console.log('🔍 Scraping Tourism Kelowna...');
  const events = await scrapeEvents(
    'https://www.tourismkelowna.com/events/calendar/',
    () => {
      const results = [];
      // Simpleview renders events inside .slide or collection widgets
      const slides = document.querySelectorAll('.slide');
      for (const slide of slides) {
        const titleEl = slide.querySelector('.slide-title a, .slide-title');
        if (!titleEl || !titleEl.textContent?.trim()) continue;
        const title = titleEl.textContent.trim();
        if (title.length < 5 || title === 'Events Calendar') continue;

        const monthEl = slide.querySelector('.date-month');
        const dayEl = slide.querySelector('.date-day');
        let date = null;
        if (monthEl && dayEl) {
          const months = { jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06', jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12' };
          const m = months[monthEl.textContent.trim().toLowerCase().slice(0,3)];
          if (m) date = `${new Date().getFullYear()}-${m}-${dayEl.textContent.trim().padStart(2,'0')}`;
        }

        const venue = slide.querySelector('.info-item')?.textContent?.trim() || '';
        const link = (titleEl.tagName === 'A' ? titleEl.href : titleEl.querySelector('a')?.href) || '';
        const img = slide.querySelector('img')?.src || '';
        const desc = slide.querySelector('.slide-desc')?.textContent?.trim() || '';

        results.push({ title, date, venue, link, image: img, description: desc });
      }
      return results;
    },
    { waitForSelector: '.slide-title', waitMs: 5000 }
  );
  return events.map((e, i) => normalizeCandidateEvent(
    { id: 'tourismkelowna', name: 'Tourism Kelowna', url: 'https://www.tourismkelowna.com/events/calendar/' },
    { ...e, city: 'Kelowna' }, i
  ));
}

async function scrapeCastanet() {
  console.log('🔍 Scraping Castanet...');
  const events = await scrapeEvents(
    'https://www.castanet.net/events/Kelowna/upcoming',
    () => {
      const results = [];
      const rows = document.querySelectorAll('tr[onclick], .event_row, a[href*="/events/event/"]');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const title = cells[1]?.textContent?.trim() || cells[0]?.textContent?.trim();
          const date = cells[0]?.textContent?.trim();
          if (title && title.length > 3) {
            results.push({ title, date, venue: cells[2]?.textContent?.trim() || '' });
          }
        } else {
          const title = row.textContent?.trim();
          const link = row.href || row.querySelector('a')?.href;
          if (title && title.length > 3 && title.length < 200) {
            results.push({ title, link });
          }
        }
      }
      return results;
    },
    { waitMs: 4000 }
  );
  return events.map((e, i) => normalizeCandidateEvent(
    { id: 'castanet-kelowna', name: 'Castanet Kelowna', url: 'https://www.castanet.net/events/Kelowna/upcoming' },
    { ...e, city: 'Kelowna' }, i
  ));
}

async function scrapeEventbrite() {
  console.log('🔍 Scraping Eventbrite...');
  const events = await scrapeEvents(
    'https://www.eventbrite.ca/d/canada--kelowna/events/',
    () => {
      const results = [];
      const cards = document.querySelectorAll('article, [data-testid*="event"], .search-event-card-wrapper');
      for (const card of cards) {
        const titleEl = card.querySelector('h2, h3, [data-testid*="title"]');
        if (!titleEl) continue;
        const title = titleEl.textContent?.trim();
        if (!title || title.length < 3) continue;
        const dateEl = card.querySelector('p, time, [class*="date"]');
        const venueEl = card.querySelector('[class*="location"]');
        const link = card.querySelector('a')?.href;
        const img = card.querySelector('img')?.src;
        results.push({
          title,
          date: dateEl?.textContent?.trim() || null,
          venue: venueEl?.textContent?.trim() || null,
          link, image: img,
        });
      }
      return results;
    },
    { waitForSelector: 'article, [data-testid*="event"]', waitMs: 5000 }
  );
  return events.map((e, i) => normalizeCandidateEvent(
    { id: 'eventbrite-kelowna', name: 'Eventbrite Kelowna', url: 'https://www.eventbrite.ca/d/canada--kelowna/events/' },
    { ...e, city: 'Kelowna' }, i
  ));
}

// ── Main ──

const SCRAPERS = {
  tourismkelowna: scrapeTourismKelowna,
  'castanet-kelowna': scrapeCastanet,
  'eventbrite-kelowna': scrapeEventbrite,
};

try {
  const sources = sourceFilter ? [sourceFilter] : Object.keys(SCRAPERS);
  let allEvents = [];

  for (const id of sources) {
    const scraper = SCRAPERS[id];
    if (!scraper) { console.log(`⚠ No scraper for: ${id}`); continue; }
    try {
      const events = await scraper();
      console.log(`  ✓ ${id}: ${events.length} events`);
      allEvents.push(...events);
    } catch (err) {
      console.error(`  ✗ ${id}: ${err.message}`);
    }
  }

  console.log(`\n📊 Total: ${allEvents.length} events`);

  if (allEvents.length > 0 && shouldImport) {
    console.log('📥 Importing to database...');
    const { neon } = await import('@neondatabase/serverless');
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    const sql = neon(url);

    // Read current DB
    const rows = await sql`SELECT value FROM kv WHERE key = 'db'`;
    const db = rows.length > 0 ? rows[0].value : { events: [], venues: [] };
    if (!db.events) db.events = [];

    // Dedupe by title + date
    const existing = new Set(db.events.map(e => `${e.title}|${e.date}`));
    const newEvents = allEvents.filter(e => !existing.has(`${e.title}|${e.date}`));
    
    db.events.push(...newEvents);
    await sql`UPDATE kv SET value = ${JSON.stringify(db)}::jsonb, updated_at = now() WHERE key = 'db'`;
    console.log(`✓ Imported ${newEvents.length} new events (${allEvents.length - newEvents.length} duplicates skipped)`);
  } else if (allEvents.length > 0) {
    console.log('\nRun with --import to push to database.');
    for (const e of allEvents.slice(0, 5)) {
      console.log(`  ${e.title} | ${e.date || '?'} | ${e.venue || '?'}`);
    }
    if (allEvents.length > 5) console.log(`  ... and ${allEvents.length - 5} more`);
  }
} finally {
  await closeBrowser().catch(() => {});
}
