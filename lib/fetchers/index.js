import { fetchGenericSource } from './generic.js';

/**
 * Fetcher registry for the API route (serverless-safe, no browser).
 * Browser-based scraping runs via scripts/scrape.mjs on the server.
 */
function makeGenericFetcher(id, name) {
  return {
    metadata: { id, name, parser: 'generic' },
    fetchSource: (source) => fetchGenericSource(source),
  };
}

const FETCHERS = {
  'tourismkelowna': makeGenericFetcher('tourismkelowna', 'Tourism Kelowna'),
  'eventbrite-kelowna': makeGenericFetcher('eventbrite-kelowna', 'Eventbrite Kelowna'),
  'castanet-kelowna': makeGenericFetcher('castanet-kelowna', 'Castanet Kelowna'),
  'eveningout': makeGenericFetcher('eveningout', 'Evening Out'),
  'city-of-kelowna': makeGenericFetcher('city-of-kelowna', 'City of Kelowna'),
  'kelownanow': makeGenericFetcher('kelownanow', 'Kelowna Now'),
  'okanagan-life': makeGenericFetcher('okanagan-life', 'Okanagan Life'),
};

export function getRegisteredFetchers() {
  return Object.keys(FETCHERS);
}

export async function runSourceFetcher(source) {
  const fetcher = FETCHERS[source.id];
  if (!fetcher) {
    return {
      sourceId: source.id,
      sourceName: source.name,
      fetchedAt: new Date().toISOString(),
      ok: false,
      events: [],
      errors: [`No fetcher registered for source: ${source.id}`],
      usedFallback: false,
    };
  }
  return fetcher.fetchSource(source);
}
