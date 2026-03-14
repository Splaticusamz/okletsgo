/**
 * Castanet Kelowna fetcher — browser-based.
 * Events are rendered client-side behind Cloudflare.
 */
import { scrapeEvents, closeBrowser } from '../browser.js';
import { normalizeCandidateEvent } from './utils.js';

export const metadata = {
  id: 'castanet-kelowna',
  name: 'Castanet Kelowna',
  parser: 'browser',
};

const URL = 'https://www.castanet.net/events/Kelowna/upcoming';

function extractEventsFromPage() {
  const events = [];
  const cards = document.querySelectorAll('.event_item, .event_row, [class*="event-list"] > div, [class*="eventlist"] > div, tr[onclick], a[href*="/events/"]');

  for (const card of cards) {
    const titleEl = card.querySelector('.event_title, .event-title, h3, h2, strong, a');
    if (!titleEl) continue;

    const title = titleEl.textContent?.trim();
    if (!title || title.length < 3 || title.length > 200) continue;

    const dateEl = card.querySelector('.event_date, .event-date, time, [class*="date"]');
    const venueEl = card.querySelector('.event_venue, .event-venue, [class*="venue"], [class*="location"]');
    const linkEl = card.querySelector('a[href*="/events/"]') || titleEl.closest?.('a');

    events.push({
      title,
      date: dateEl?.getAttribute?.('datetime') || dateEl?.textContent?.trim() || null,
      venue: venueEl?.textContent?.trim() || null,
      link: linkEl?.href || null,
    });
  }

  return events;
}

export async function fetchSource(source) {
  const run = {
    sourceId: source.id,
    sourceName: source.name,
    fetchedAt: new Date().toISOString(),
    ok: true,
    events: [],
    errors: [],
    usedFallback: false,
  };

  try {
    const rawEvents = await scrapeEvents(URL, extractEventsFromPage, {
      waitForSelector: '[class*="event"], .event_item',
      waitMs: 3000,
    });

    if (rawEvents.length === 0) {
      run.errors.push('No events found on Castanet. Page may have changed or Cloudflare blocked the request.');
      run.ok = false;
      return run;
    }

    run.events = rawEvents.map((raw, index) =>
      normalizeCandidateEvent(source, {
        title: raw.title,
        date: raw.date,
        venue: raw.venue,
        city: 'Kelowna',
        url: raw.link,
      }, index)
    );

    return run;
  } catch (error) {
    run.ok = false;
    run.errors.push(`Castanet scrape failed: ${error.message}`);
    return run;
  } finally {
    await closeBrowser().catch(() => {});
  }
}

export default { metadata, fetchSource };
