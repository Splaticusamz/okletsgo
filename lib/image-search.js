/**
 * Image search module for finding venue/event images.
 * Currently returns placeholder candidates — TODO: wire up Brave Image Search API or similar.
 */

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

/**
 * Find images for an event by searching for venue/city/title.
 * @param {{ title?: string, venue?: string, city?: string, id?: string }} event
 * @returns {Promise<Array<{ id: string, url: string, source: string, width: number, height: number }>>}
 */
export async function findImagesForEvent(event) {
  const venue = event.venue || 'venue';
  const city = event.city || 'okanagan';
  const title = event.title || '';
  const eventId = event.id || `evt-${Date.now()}`;

  // TODO: Replace with real image search API (Brave Image Search, SerpAPI, etc.)
  // For now, return Unsplash placeholder images based on venue/city keywords
  const query = encodeURIComponent(`${venue} ${city} event`);
  const candidates = [
    {
      id: `${eventId}-search-1`,
      url: `https://source.unsplash.com/800x1600/?${encodeURIComponent(venue)},${encodeURIComponent(city)}`,
      source: 'unsplash-placeholder',
      width: 800,
      height: 1600,
    },
    {
      id: `${eventId}-search-2`,
      url: `https://source.unsplash.com/800x1600/?${encodeURIComponent(venue)},winery`,
      source: 'unsplash-placeholder',
      width: 800,
      height: 1600,
    },
    {
      id: `${eventId}-search-3`,
      url: `https://source.unsplash.com/800x1600/?${encodeURIComponent(city)},event`,
      source: 'unsplash-placeholder',
      width: 800,
      height: 1600,
    },
    {
      id: `${eventId}-search-4`,
      url: `https://source.unsplash.com/800x1600/?${encodeURIComponent(title || venue)},nightlife`,
      source: 'unsplash-placeholder',
      width: 800,
      height: 1600,
    },
  ];

  return candidates;
}

export default { findImagesForEvent };
