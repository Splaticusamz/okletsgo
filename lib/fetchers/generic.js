/**
 * Generic HTML/JSON-LD event fetcher.
 * Works for sites that embed structured data or have parseable HTML event listings.
 * Falls back gracefully with clear error messages.
 */
import { fetchHtml, normalizeCandidateEvent, safeJsonLd } from './utils.js';

/**
 * Try to extract events from JSON-LD structured data
 */
function extractJsonLdEvents(html) {
  return safeJsonLd(html)
    .flatMap((item) => (item['@graph'] ? item['@graph'] : [item]))
    .filter((item) => {
      const type = String(item['@type'] || '').toLowerCase();
      return type.includes('event');
    });
}

/**
 * Try to extract events from common HTML patterns
 */
function extractHtmlEvents(html) {
  const events = [];

  // Pattern: <a> tags with event-like hrefs + nearby date/venue text
  // Look for common event listing patterns
  const patterns = [
    // h-event microformat
    /class="[^"]*h-event[^"]*"([\s\S]*?)(?=class="[^"]*h-event|$)/gi,
    // schema.org Event itemtype
    /itemtype="[^"]*Event[^"]*"([\s\S]*?)(?=itemtype="[^"]*Event|$)/gi,
    // Common event card patterns
    /class="[^"]*event[-_]?card[^"]*"([\s\S]*?)(?=class="[^"]*event[-_]?card|$)/gi,
    /class="[^"]*event[-_]?item[^"]*"([\s\S]*?)(?=class="[^"]*event[-_]?item|$)/gi,
    /class="[^"]*event[-_]?listing[^"]*"([\s\S]*?)(?=class="[^"]*event[-_]?listing|$)/gi,
  ];

  for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern)];
    for (const match of matches) {
      const block = match[0];
      const title =
        block.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)/i)?.[1]?.trim() ||
        block.match(/<h[2-4][^>]*>([^<]+)/i)?.[1]?.trim() ||
        block.match(/<a[^>]*>([^<]{5,80})<\/a>/i)?.[1]?.trim();

      if (!title) continue;

      const dateMatch =
        block.match(/datetime="([^"]+)"/i) ||
        block.match(/(\d{4}-\d{2}-\d{2})/);
      const venueMatch =
        block.match(/class="[^"]*venue[^"]*"[^>]*>([^<]+)/i) ||
        block.match(/class="[^"]*location[^"]*"[^>]*>([^<]+)/i);
      const linkMatch = block.match(/href="(https?:\/\/[^"]+)"/i);
      const imgMatch = block.match(/src="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);

      events.push({
        title,
        date: dateMatch?.[1] || null,
        venue: venueMatch?.[1]?.trim() || null,
        url: linkMatch?.[1] || null,
        image: imgMatch?.[1] || null,
      });
    }

    if (events.length > 0) break; // Use first pattern that produces results
  }

  return events;
}

export async function fetchGenericSource(source) {
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
    const html = await fetchHtml(source.url);

    // 1. Try JSON-LD first (most reliable)
    const jsonLdEvents = extractJsonLdEvents(html);
    if (jsonLdEvents.length > 0) {
      run.events = jsonLdEvents.map((item, index) =>
        normalizeCandidateEvent(source, {
          title: item.name,
          description: item.description,
          date: item.startDate,
          startDate: item.startDate,
          endDate: item.endDate,
          location: item.location?.name || item.location?.address?.streetAddress || '',
          venue: item.location?.name || '',
          city: item.location?.address?.addressLocality || 'Kelowna',
          address: item.location?.address?.streetAddress || '',
          url: item.url || source.url,
          ticketUrl: item.offers?.url || item.url || source.url,
          image: item.image?.url || item.image?.contentUrl || (typeof item.image === 'string' ? item.image : null),
          externalId: item['@id'] || null,
          startTime: item.startDate,
          endTime: item.endDate,
        }, index)
      );
      return run;
    }

    // 2. Try HTML parsing
    const htmlEvents = extractHtmlEvents(html);
    if (htmlEvents.length > 0) {
      run.events = htmlEvents.map((item, index) =>
        normalizeCandidateEvent(source, item, index)
      );
      return run;
    }

    // 3. Nothing found
    run.ok = false;
    run.errors.push(`No events found on ${source.name}. The page may use client-side rendering or have changed its structure.`);
    return run;
  } catch (error) {
    run.ok = false;
    run.errors.push(`${source.name}: ${error.message}`);
    return run;
  }
}
