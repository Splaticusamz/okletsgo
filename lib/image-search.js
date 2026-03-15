/**
 * Image search module — scrapes real images from event source URLs.
 */

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

/**
 * Fetch a page and extract image URLs from it.
 */
async function scrapeImagesFromUrl(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    const images = [];
    // Match img src, og:image, and background-image URLs
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
        // Filter out tiny icons, tracking pixels, SVGs
        if (imgUrl.match(/\.(svg|ico|gif)(\?|$)/i)) continue;
        if (imgUrl.includes('1x1') || imgUrl.includes('pixel') || imgUrl.includes('tracking')) continue;
        if (imgUrl.includes('logo') || imgUrl.includes('favicon')) continue;
        images.push(imgUrl);
      }
    }

    return images;
  } catch {
    return [];
  }
}

/**
 * Validate that an image URL actually loads and is reasonably sized.
 */
async function validateImage(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return false;
    const length = parseInt(res.headers.get('content-length') || '0', 10);
    // Skip images smaller than 5KB (likely icons/placeholders)
    if (length > 0 && length < 5000) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Find images for an event by scraping its source URL.
 * @param {{ title?: string, venue?: string, city?: string, id?: string, sourceUrl?: string }} event
 * @param {{ offset?: number, limit?: number }} options
 * @returns {Promise<Array<{ id: string, url: string, source: string }>>}
 */
export async function findImagesForEvent(event, options = {}) {
  const eventId = event.id || `evt-${Date.now()}`;
  const sourceUrl = event.sourceUrl;
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 5;

  if (!sourceUrl) {
    return [];
  }

  const imageUrls = await scrapeImagesFromUrl(sourceUrl);
  if (imageUrls.length === 0) return [];

  // Paginate: skip already-loaded images, validate next batch
  const toCheck = imageUrls.slice(offset, offset + limit + 3); // fetch a few extra in case some fail validation
  const results = await Promise.all(
    toCheck.map(async (url, i) => {
      const valid = await validateImage(url);
      return valid ? { id: `${eventId}-src-${offset + i}`, url, source: 'source-page' } : null;
    })
  );

  return results.filter(Boolean).slice(0, limit);
}

export default { findImagesForEvent };
