/**
 * Tourism Kelowna fetcher — browser-based.
 * The site uses Simpleview CMS which renders events via JavaScript.
 * We use Puppeteer to render the page and extract event data from the DOM.
 */
import { scrapeEvents, closeBrowser } from '../browser.js';
import { normalizeCandidateEvent } from './utils.js';

export const metadata = {
  id: 'tourismkelowna',
  name: 'Tourism Kelowna',
  parser: 'browser',
};

const CALENDAR_URL = 'https://www.tourismkelowna.com/events/calendar/';

/**
 * This function runs INSIDE the browser page context.
 * It extracts event data from the rendered DOM.
 */
function extractEventsFromPage() {
  const events = [];

  // Tourism Kelowna renders event cards in a collection widget
  // Look for common Simpleview event card patterns
  const cards = document.querySelectorAll(
    '.slide, [data-type="event"], .event-card, .event-item, .event-listing, [class*="event"]'
  );

  for (const card of cards) {
    const titleEl = card.querySelector('.slide-title a, .slide-title, h3 a, h2 a, .event-title');
    if (!titleEl) continue;

    const title = titleEl.textContent?.trim();
    if (!title || title.length < 3) continue;

    // Extract date from mini-date-section or datetime attributes
    const monthEl = card.querySelector('.date-month, .month');
    const dayEl = card.querySelector('.date-day, .day');
    const dateTimeEl = card.querySelector('[datetime]');

    let date = null;
    if (dateTimeEl) {
      date = dateTimeEl.getAttribute('datetime');
    } else if (monthEl && dayEl) {
      const month = monthEl.textContent?.trim();
      const day = dayEl.textContent?.trim();
      if (month && day) {
        // Convert "MAR" + "15" to ISO date
        const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const m = months[month.toLowerCase().slice(0, 3)];
        if (m) {
          const year = new Date().getFullYear();
          date = `${year}-${m}-${day.padStart(2, '0')}`;
        }
      }
    }

    // Extract details
    const detailEls = card.querySelectorAll('.details .info-item, .info-item, li');
    let location = '';
    let time = '';
    for (const d of detailEls) {
      const icon = d.querySelector('.icon i, i');
      const text = d.textContent?.trim();
      if (icon?.classList?.contains('fa-clock') || icon?.classList?.contains('fa-calendar') || text?.match(/\d{1,2}:\d{2}/)) {
        time = text;
      } else if (icon?.classList?.contains('fa-map') || icon?.classList?.contains('fa-location')) {
        location = text;
      } else if (!location && text && text.length > 3 && text.length < 100) {
        location = text;
      }
    }

    const link = titleEl.href || titleEl.closest('a')?.href || '';
    const imgEl = card.querySelector('img.slide-img, img[src]');
    const image = imgEl?.src || null;
    const descEl = card.querySelector('.slide-desc, .description, p');
    const description = descEl?.textContent?.trim() || '';

    events.push({ title, date, time, location, link, image, description });
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
    const rawEvents = await scrapeEvents(CALENDAR_URL, extractEventsFromPage, {
      waitForSelector: '.slide-title, [class*="event"]',
      waitMs: 3000,
    });

    if (rawEvents.length === 0) {
      run.errors.push('No events found on Tourism Kelowna calendar page. The DOM structure may have changed.');
      run.ok = false;
      return run;
    }

    run.events = rawEvents.map((raw, index) =>
      normalizeCandidateEvent(source, {
        title: raw.title,
        description: raw.description,
        date: raw.date,
        startTime: raw.time?.match(/\d{1,2}:\d{2}/)?.[0] || null,
        venue: raw.location,
        city: 'Kelowna',
        url: raw.link,
        image: raw.image,
        externalId: raw.link || null,
      }, index)
    );

    return run;
  } catch (error) {
    run.ok = false;
    run.errors.push(`Tourism Kelowna scrape failed: ${error.message}`);
    return run;
  } finally {
    await closeBrowser().catch(() => {});
  }
}

export default { metadata, fetchSource };
