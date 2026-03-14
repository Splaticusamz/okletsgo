#!/usr/bin/env node
/**
 * Event scraper for OK LET'S GO.
 * Uses Puppeteer to intercept real API calls from event sites.
 * 
 * Usage:
 *   node scripts/scrape.mjs                    # scrape all, print results
 *   node scripts/scrape.mjs --source tourismkelowna  # single source
 *   node scripts/scrape.mjs --discord           # scrape and post to Discord #candidates
 *   node scripts/scrape.mjs --import            # scrape and push to Neon DB
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

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
const shouldDiscord = args.includes('--discord');

async function launchBrowser() {
  return puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
}

// ── Tourism Kelowna — intercept the Simpleview REST API ──

async function scrapeTourismKelowna() {
  console.log('🔍 Tourism Kelowna...');
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  let eventData = null;

  // Intercept the events API response
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('plugins_events_events_by_date/find') && res.status() === 200) {
      try {
        const json = await res.json();
        if (json?.docs?.docs?.length > 0) {
          eventData = json.docs.docs;
        }
      } catch {}
    }
  });

  await page.goto('https://www.tourismkelowna.com/events/calendar/', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();

  if (!eventData || eventData.length === 0) {
    console.log('  ⚠ No events intercepted from API');
    return [];
  }

  console.log(`  ✓ ${eventData.length} events from API`);

  return eventData.map(e => ({
    title: e.title || 'Untitled',
    date: e.date ? e.date.slice(0, 10) : null,
    startDate: e.startDate ? e.startDate.slice(0, 10) : null,
    endDate: e.endDate ? e.endDate.slice(0, 10) : null,
    venue: e.location || null,
    city: 'Kelowna',
    description: e.description?.replace(/<[^>]+>/g, '').trim().slice(0, 500) || null,
    url: e.url ? `https://www.tourismkelowna.com${e.url}` : null,
    image: e.media_raw?.[0]?.mediaurl || null,
    lat: e.latitude || null,
    lng: e.longitude || null,
    source: 'tourismkelowna',
    raw: e,
  }));
}

// ── Eventbrite — intercept search API ──

async function scrapeEventbrite() {
  console.log('🔍 Eventbrite Kelowna...');
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  let eventData = null;

  page.on('response', async (res) => {
    const url = res.url();
    if ((url.includes('api/v3/destination/events') || url.includes('search') || url.includes('events')) 
        && res.status() === 200 
        && (res.headers()['content-type'] || '').includes('json')
        && !url.includes('google') && !url.includes('facebook')) {
      try {
        const json = await res.json();
        const events = json?.events || json?.results || json?.data?.events;
        if (events?.length > 0 && !eventData) {
          eventData = events;
        }
      } catch {}
    }
  });

  await page.goto('https://www.eventbrite.ca/d/canada--kelowna/events/', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 6000));
  
  // Also try extracting from __NEXT_DATA__ or page scripts
  if (!eventData) {
    eventData = await page.evaluate(() => {
      // Eventbrite sometimes embeds data in __NEXT_DATA__
      const nd = document.getElementById('__NEXT_DATA__');
      if (nd) {
        try {
          const d = JSON.parse(nd.textContent);
          const events = d?.props?.pageProps?.search_data?.events?.results;
          if (events?.length) return events;
        } catch {}
      }
      // Try window.__SERVER_DATA__
      if (window.__SERVER_DATA__?.search_data?.events?.results) {
        return window.__SERVER_DATA__.search_data.events.results;
      }
      return null;
    });
  }

  await browser.close();

  if (!eventData || eventData.length === 0) {
    console.log('  ⚠ No events found');
    return [];
  }

  console.log(`  ✓ ${eventData.length} events`);

  return eventData.map(e => ({
    title: e.name || e.title || 'Untitled',
    date: (e.start_date || e.start?.local || '').slice(0, 10) || null,
    venue: e.primary_venue?.name || e.venue?.name || null,
    city: e.primary_venue?.address?.city || 'Kelowna',
    description: (e.summary || e.description?.text || '').slice(0, 500) || null,
    url: e.url || null,
    image: e.image?.original?.url || e.image?.url || e.logo?.original?.url || null,
    source: 'eventbrite',
  }));
}

// ── Castanet — intercept or parse ──

async function scrapeCastanet() {
  console.log('🔍 Castanet Kelowna...');
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  await page.goto('https://www.castanet.net/events/Kelowna/upcoming', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 4000));

  const events = await page.evaluate(() => {
    const results = [];
    // Parse the rendered event listing
    const rows = document.querySelectorAll('.event_content, .event_row, tr.event');
    for (const row of rows) {
      const titleEl = row.querySelector('.event_title a, a, strong');
      if (!titleEl) continue;
      const title = titleEl.textContent?.trim();
      if (!title || title.length < 3) continue;

      const link = titleEl.href || titleEl.closest('a')?.href || '';
      const dateEl = row.querySelector('.event_date, time, [class*=date]');
      const venueEl = row.querySelector('.event_venue, [class*=venue], [class*=location]');
      
      results.push({
        title,
        date: dateEl?.textContent?.trim() || null,
        venue: venueEl?.textContent?.trim() || null,
        link,
      });
    }

    // Fallback: try the bigger container
    if (results.length === 0) {
      const links = document.querySelectorAll('a[href*="/events/event/"]');
      for (const a of links) {
        const title = a.textContent?.trim();
        if (title && title.length > 5 && title.length < 200) {
          results.push({ title, link: a.href });
        }
      }
    }

    return results;
  });

  await browser.close();

  if (events.length === 0) {
    console.log('  ⚠ No events found');
    return [];
  }

  console.log(`  ✓ ${events.length} events`);

  return events.map(e => ({
    title: e.title,
    date: e.date,
    venue: e.venue || null,
    city: 'Kelowna',
    url: e.link || null,
    source: 'castanet',
  }));
}

// ── Main ──

const SCRAPERS = {
  tourismkelowna: scrapeTourismKelowna,
  eventbrite: scrapeEventbrite,
  castanet: scrapeCastanet,
};

const sourcesToRun = sourceFilter ? [sourceFilter] : Object.keys(SCRAPERS);
let allEvents = [];

for (const id of sourcesToRun) {
  const scraper = SCRAPERS[id];
  if (!scraper) { console.log(`⚠ Unknown source: ${id}`); continue; }
  try {
    const events = await scraper();
    allEvents.push(...events);
  } catch (err) {
    console.error(`  ✗ ${id}: ${err.message}`);
  }
}

// Dedupe by title similarity
const seen = new Set();
allEvents = allEvents.filter(e => {
  const key = e.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log(`\n📊 Total: ${allEvents.length} unique events`);

if (allEvents.length === 0) {
  process.exit(0);
}

// Print summary
for (const e of allEvents.slice(0, 10)) {
  console.log(`  ${e.source} | ${e.date || '?'} | ${e.title?.slice(0, 60)} | ${e.venue || '?'}`);
}
if (allEvents.length > 10) console.log(`  ... and ${allEvents.length - 10} more`);

// ── Output modes ──

if (shouldDiscord) {
  // Write events to a JSON file that the Discord bot can read
  const outPath = path.join(__dirname, '..', 'tmp', 'scraped-events.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ scrapedAt: new Date().toISOString(), events: allEvents }, null, 2));
  console.log(`\n📄 Saved to ${outPath} for Discord posting`);
}

if (shouldImport) {
  console.log('\n📥 Importing to Neon DB...');
  const { neon } = await import('@neondatabase/serverless');
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }
  const sql = neon(dbUrl);

  const rows = await sql`SELECT value FROM kv WHERE key = 'db'`;
  const db = rows.length > 0 ? rows[0].value : { events: [], venues: [] };
  if (!db.events) db.events = [];

  const existing = new Set(db.events.map(e => e.title?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)));
  let imported = 0;

  for (const e of allEvents) {
    const key = e.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (existing.has(key)) continue;

    db.events.push({
      id: `${e.source}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: e.title,
      date: e.date,
      startTime: null,
      venue: e.venue,
      city: e.city || 'Kelowna',
      description: e.description || `${e.title} in ${e.city || 'Kelowna'}`,
      mode: inferMode(e),
      source: `scraper:${e.source}`,
      sourceUrl: e.url,
      status: 'candidate',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reviews: [],
      imageCandidates: e.image ? [{ url: e.image, source: e.source }] : [],
    });
    existing.add(key);
    imported++;
  }

  await sql`UPDATE kv SET value = ${JSON.stringify(db)}::jsonb, updated_at = now() WHERE key = 'db'`;
  console.log(`✓ Imported ${imported} new events (${allEvents.length - imported} duplicates skipped)`);
}

function inferMode(event) {
  const text = `${event.title} ${event.description || ''} ${event.venue || ''}`.toLowerCase();
  if (/(night|late|after dark|party|club|evening|cocktail|brew|wine|dj|comedy|bar|pub|happy hour|live music)/i.test(text)) return 'night';
  if (/(kids|children|family|storytime|playground|youth)/i.test(text)) return 'family';
  return 'day';
}
