/**
 * Image search module — multi-source image fetching.
 * Uses full event metadata (title, venue, city, description, mode) to guide results.
 * Three categories: venue, event, activity (AI-generated).
 */

function slug(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown';
}

/* ── Scrape images from a URL ── */

async function scrapeImagesFromUrl(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok && res.status !== 410) return [];
    const html = await res.text();

    const images = [];
    const patterns = [
      /property="og:image"\s+content="([^"]+)"/gi,
      /content="([^"]+)"\s+property="og:image"/gi,
      /<img[^>]+src="(https?:\/\/[^"]+)"/gi,
      /srcset="(https?:\/\/[^"\s,]+)/gi,
    ];

    const seen = new Set();
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const imgUrl = match[1];
        if (seen.has(imgUrl)) continue;
        seen.add(imgUrl);
        if (imgUrl.match(/\.(svg|ico|gif)(\?|$)/i)) continue;
        if (imgUrl.includes('1x1') || imgUrl.includes('pixel') || imgUrl.includes('tracking')) continue;
        if (imgUrl.includes('logo') || imgUrl.includes('favicon')) continue;
        if (imgUrl.includes(',h_1,') || imgUrl.includes(',w_1,') || imgUrl.includes(',h_1/')) continue;
        if (imgUrl.match(/[,\/]h_\d{1,2}[,\/]/) || imgUrl.match(/[,\/]w_\d{1,2}[,\/]/)) continue;
        images.push(imgUrl);
      }
    }
    return images;
  } catch { return []; }
}

/* ── Validate image URL ── */

async function validateImage(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return false;
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return false;
    const length = parseInt(res.headers.get('content-length') || '0', 10);
    if (length > 0 && length < 5000) return false;
    return true;
  } catch { return false; }
}

/* ── Search images via Bing ── */

async function searchImages(query, count = 6) {
  if (!query) return [];
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1&count=${count}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    const images = [];
    const murlPattern = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi;
    let match;
    while ((match = murlPattern.exec(html)) !== null && images.length < count) {
      const imgUrl = match[1].replace(/&amp;/g, '&');
      if (!imgUrl.match(/\.(svg|ico|gif)(\?|$)/i)) {
        images.push(imgUrl);
      }
    }
    return images;
  } catch { return []; }
}

/* ── Build search queries from event metadata ── */

function buildVenueQueries(event) {
  const queries = [];
  const venue = (event.venue || '').trim();
  const city = (event.city || '').trim();

  // Primary: venue + city
  if (venue && city) queries.push(`"${venue}" ${city} photo`);
  else if (venue) queries.push(`"${venue}" Okanagan photo`);

  // Secondary: venue + type hint from description
  if (venue && event.description) {
    const desc = event.description.toLowerCase();
    if (desc.includes('winery') || desc.includes('wine')) queries.push(`"${venue}" winery`);
    else if (desc.includes('restaurant') || desc.includes('bistro') || desc.includes('dining')) queries.push(`"${venue}" restaurant interior`);
    else if (desc.includes('brewery') || desc.includes('taphouse')) queries.push(`"${venue}" brewery`);
    else if (desc.includes('park') || desc.includes('outdoor')) queries.push(`"${venue}" outdoor`);
    else if (desc.includes('theatre') || desc.includes('theater') || desc.includes('stage')) queries.push(`"${venue}" theatre stage`);
    else if (desc.includes('gallery') || desc.includes('museum')) queries.push(`"${venue}" gallery interior`);
  }

  return queries;
}

function buildEventQueries(event) {
  const queries = [];
  const title = (event.title || '').trim();
  const venue = (event.venue || '').trim();
  const city = (event.city || '').trim();

  // Primary: event title + venue
  if (title && venue) queries.push(`"${title}" "${venue}"`);
  // Fallback: just the title + city
  if (title && city) queries.push(`"${title}" ${city}`);
  // Fallback: title alone
  if (title) queries.push(`${title} event`);

  return queries;
}

/* ── Build AI prompt from full event metadata ── */

function buildAiPrompt(event) {
  const parts = [];
  const title = (event.title || '').trim();
  const venue = (event.venue || '').trim();
  const city = (event.city || '').trim();
  const description = (event.description || '').trim();
  const mode = event.mode || 'day';

  // Atmosphere from mode
  const atmosphere = mode === 'night'
    ? 'evening atmosphere, warm amber lighting, nightlife ambiance, bokeh lights'
    : mode === 'family'
      ? 'bright daytime, families enjoying themselves, sunny and warm, welcoming atmosphere'
      : 'daytime, golden hour sunlight, sophisticated casual, lifestyle vibes';

  // Activity description from event details
  let activity = '';
  if (description) {
    // Extract key activity phrases from description
    const descLower = description.toLowerCase();
    if (descLower.includes('live music') || descLower.includes('concert') || descLower.includes('band'))
      activity = `people enjoying live music performance`;
    else if (descLower.includes('wine tasting') || descLower.includes('winery'))
      activity = `wine tasting at a beautiful winery`;
    else if (descLower.includes('comedy') || descLower.includes('stand-up') || descLower.includes('laugh'))
      activity = `audience laughing at a comedy show`;
    else if (descLower.includes('art') || descLower.includes('gallery') || descLower.includes('exhibit'))
      activity = `people viewing art in a gallery`;
    else if (descLower.includes('market') || descLower.includes('vendor') || descLower.includes('craft'))
      activity = `people browsing an artisan market`;
    else if (descLower.includes('yoga') || descLower.includes('wellness') || descLower.includes('meditation'))
      activity = `outdoor yoga or wellness session`;
    else if (descLower.includes('hike') || descLower.includes('trail') || descLower.includes('nature'))
      activity = `scenic hiking trail in the mountains`;
    else if (descLower.includes('food') || descLower.includes('culinary') || descLower.includes('chef') || descLower.includes('cook'))
      activity = `culinary experience with beautifully plated food`;
    else if (descLower.includes('dance') || descLower.includes('dj') || descLower.includes('club'))
      activity = `people dancing at a stylish venue`;
    else if (descLower.includes('paddle') || descLower.includes('kayak') || descLower.includes('boat') || descLower.includes('lake'))
      activity = `water activities on a beautiful lake`;
    else if (descLower.includes('ski') || descLower.includes('snow') || descLower.includes('mountain'))
      activity = `winter mountain activities`;
    else if (descLower.includes('beer') || descLower.includes('brewery') || descLower.includes('taphouse'))
      activity = `people enjoying craft beer at a brewery`;
    else if (descLower.includes('cinema') || descLower.includes('film') || descLower.includes('movie'))
      activity = `outdoor cinema or film screening`;
    else if (descLower.includes('kids') || descLower.includes('children') || descLower.includes('family'))
      activity = `families with children enjoying a fun activity`;
    else
      activity = `people enjoying ${title || 'a social event'}`;
  } else if (title) {
    // Fall back to title keywords
    activity = `people enjoying ${title}`;
  } else {
    activity = 'people enjoying a social event';
  }

  // Location context
  const location = venue && city
    ? `at ${venue} in ${city}`
    : venue
      ? `at ${venue}`
      : city
        ? `in ${city}, Okanagan Valley`
        : 'in the Okanagan Valley, British Columbia';

  return `Professional editorial lifestyle photograph: ${activity} ${location}. ${atmosphere}. Candid and authentic, shallow depth of field, warm tones, no text or watermarks, high-end magazine quality`;
}

/* ── Generate AI images with fal.ai ── */

async function generateActivityImages(event, count = 3) {
  const falKey = process.env.FAL_KEY;
  if (!falKey) return [];

  const prompt = buildAiPrompt(event);

  const results = [];
  for (let i = 0; i < count; i++) {
    try {
      const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt + `, angle variation ${i + 1}`,
          image_size: { width: 768, height: 1344 },
          num_inference_steps: 4,
          seed: Date.now() + i,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.images?.[0]?.url) {
        results.push(data.images[0].url);
      }
    } catch { /* skip failed generations */ }
  }
  return results;
}

/* ══════════════════════════════════════
   PUBLIC API
   ══════════════════════════════════════ */

/**
 * Fetch images in 3 categories for an event.
 * Uses full event metadata to build targeted search queries and AI prompts.
 * Returns { venue: [], event: [], activity: [], meta: {} } with up to 4 each.
 */
export async function fetchCategorizedImages(event) {
  const eventId = event.id || `evt-${Date.now()}`;

  const venueQueries = buildVenueQueries(event);
  const eventQueries = buildEventQueries(event);
  const aiPrompt = buildAiPrompt(event);

  // Run all three categories in parallel
  const [venueImages, eventImages, activityImages] = await Promise.all([
    // 1. Venue images — search for the business using metadata-driven queries
    (async () => {
      const validated = [];
      for (const query of venueQueries) {
        if (validated.length >= 4) break;
        const urls = await searchImages(query, 6);
        for (const url of urls) {
          if (validated.length >= 4) break;
          if (validated.some(v => v.url === url)) continue;
          if (await validateImage(url)) {
            validated.push({
              id: `${eventId}-venue-${validated.length}`,
              url,
              source: 'venue-search',
              category: 'venue',
              searchQuery: query,
            });
          }
        }
      }
      return validated;
    })(),

    // 2. Event images — scrape from source URL, then search if needed
    (async () => {
      const validated = [];
      // Try source URL first
      if (event.sourceUrl) {
        const urls = await scrapeImagesFromUrl(event.sourceUrl);
        for (const url of urls.slice(0, 6)) {
          if (validated.length >= 4) break;
          if (await validateImage(url)) {
            validated.push({
              id: `${eventId}-event-${validated.length}`,
              url,
              source: 'event-page',
              category: 'event',
              sourceUrl: event.sourceUrl,
            });
          }
        }
      }
      // Supplement with search if not enough
      if (validated.length < 2) {
        for (const query of eventQueries) {
          if (validated.length >= 4) break;
          const urls = await searchImages(query, 4);
          for (const url of urls) {
            if (validated.length >= 4) break;
            if (validated.some(v => v.url === url)) continue;
            if (await validateImage(url)) {
              validated.push({
                id: `${eventId}-event-${validated.length}`,
                url,
                source: 'event-search',
                category: 'event',
                searchQuery: query,
              });
            }
          }
        }
      }
      return validated;
    })(),

    // 3. Activity images — removed (use Generate tab instead)
    Promise.resolve([]),
  ]);

  return {
    venue: venueImages,
    event: eventImages,
    activity: activityImages,
    meta: {
      venueQueries,
      eventQueries,
      aiPrompt,
      fetchedAt: new Date().toISOString(),
    },
  };
}

/**
 * Legacy findImagesForEvent — wraps fetchCategorizedImages.
 */
export async function findImagesForEvent(event, options = {}) {
  const { venue, event: eventImgs, activity } = await fetchCategorizedImages(event);
  return [...venue, ...eventImgs, ...activity];
}

export default { findImagesForEvent, fetchCategorizedImages };
