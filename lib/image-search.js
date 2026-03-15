/**
 * Image search module — multi-source image fetching.
 * Three categories: venue, event, activity (stock/AI).
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
    if (!res.ok) return [];
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
        if (imgUrl.includes(',h_1,') || imgUrl.includes(',w_1,') || imgUrl.includes(',h_1/')) continue; // 1px images
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

/* ── Search Google for venue images (via scraping Google search results page) ── */

async function searchVenueImages(venue, city) {
  if (!venue) return [];
  const query = encodeURIComponent(`${venue} ${city || ''} venue photo`);
  try {
    // Use Bing image search (less aggressive bot blocking than Google)
    const url = `https://www.bing.com/images/search?q=${query}&first=1&count=6`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Extract image URLs from Bing results (murl parameter)
    const images = [];
    const murlPattern = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi;
    let match;
    while ((match = murlPattern.exec(html)) !== null && images.length < 6) {
      const imgUrl = match[1].replace(/&amp;/g, '&');
      if (!imgUrl.match(/\.(svg|ico|gif)(\?|$)/i)) {
        images.push(imgUrl);
      }
    }
    return images;
  } catch { return []; }
}

/* ── Generate activity images with fal.ai ── */

async function generateActivityImages(activity, mode, count = 3) {
  const falKey = process.env.FAL_KEY;
  if (!falKey) return [];

  const timeOfDay = mode === 'night' ? 'evening, warm ambient lighting, nightlife atmosphere' : 'daytime, natural sunlight, bright and inviting';
  const prompt = `Professional lifestyle photograph of people enjoying ${activity}, ${timeOfDay}, Okanagan Valley BC Canada, candid and natural, editorial quality, no text`;

  const results = [];
  for (let i = 0; i < count; i++) {
    try {
      const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt + `, variation ${i + 1}`,
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

/* ── Map event mode to activity description ── */

function modeToActivity(mode, title, venue) {
  const titleLower = (title || '').toLowerCase();
  if (titleLower.includes('comedy') || titleLower.includes('laugh')) return 'a comedy show at a lounge';
  if (titleLower.includes('music') || titleLower.includes('live') || titleLower.includes('concert') || titleLower.includes('trio')) return 'live music at a venue';
  if (titleLower.includes('wine') || titleLower.includes('winery') || titleLower.includes('tasting')) return 'wine tasting at a winery';
  if (titleLower.includes('culinary') || titleLower.includes('cook') || titleLower.includes('food')) return 'a culinary class or food event';
  if (titleLower.includes('art') || titleLower.includes('gallery') || titleLower.includes('exhibit')) return 'an art gallery exhibition';
  if (titleLower.includes('firework')) return 'a fireworks show at a ski resort';
  if (titleLower.includes('diy') || titleLower.includes('craft') || titleLower.includes('workshop')) return 'a creative workshop';
  if (titleLower.includes('sourdough') || titleLower.includes('bread') || titleLower.includes('baking')) return 'a bread baking class';
  if (mode === 'night') return 'nightlife entertainment';
  if (mode === 'family') return 'a family-friendly outdoor activity';
  return 'a social event at a venue';
}

/* ══════════════════════════════════════
   PUBLIC API
   ══════════════════════════════════════ */

/**
 * Fetch images in 3 categories for an event.
 * Returns { venue: [], event: [], activity: [] } with up to 3 each.
 */
export async function fetchCategorizedImages(event) {
  const eventId = event.id || `evt-${Date.now()}`;

  // Run all three categories in parallel
  const [venueImages, eventImages, activityImages] = await Promise.all([
    // 1. Venue images — search for the business
    searchVenueImages(event.venue, event.city).then(async (urls) => {
      const validated = [];
      for (const url of urls.slice(0, 5)) {
        if (await validateImage(url)) {
          validated.push({ id: `${eventId}-venue-${validated.length}`, url, source: 'venue-search', category: 'venue' });
          if (validated.length >= 3) break;
        }
      }
      return validated;
    }),

    // 2. Event images — scrape from source URL
    (event.sourceUrl ? scrapeImagesFromUrl(event.sourceUrl) : Promise.resolve([])).then(async (urls) => {
      const validated = [];
      for (const url of urls.slice(0, 5)) {
        if (await validateImage(url)) {
          validated.push({ id: `${eventId}-event-${validated.length}`, url, source: 'event-page', category: 'event' });
          if (validated.length >= 3) break;
        }
      }
      return validated;
    }),

    // 3. Activity images — AI generated
    generateActivityImages(
      modeToActivity(event.mode, event.title, event.venue),
      event.mode,
      3
    ).then(urls => urls.map((url, i) => ({ id: `${eventId}-activity-${i}`, url, source: 'ai-generated', category: 'activity' }))),
  ]);

  return { venue: venueImages, event: eventImages, activity: activityImages };
}

/**
 * Legacy findImagesForEvent — now wraps fetchCategorizedImages.
 */
export async function findImagesForEvent(event, options = {}) {
  const { venue, event: eventImgs, activity } = await fetchCategorizedImages(event);
  return [...venue, ...eventImgs, ...activity];
}

export default { findImagesForEvent, fetchCategorizedImages };
