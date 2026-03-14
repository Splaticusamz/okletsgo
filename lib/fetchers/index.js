import tourismkelowna from './tourismkelowna.js';
import eventbriteKelowna from './eventbrite-kelowna.js';

const FETCHERS = {
  [tourismkelowna.metadata.id]: tourismkelowna,
  [eventbriteKelowna.metadata.id]: eventbriteKelowna,
};

export function getFetcher(sourceId) {
  return FETCHERS[sourceId] ?? null;
}

export function getFetcherIds() {
  return Object.keys(FETCHERS);
}

export async function runSourceFetcher(source) {
  const fetcher = getFetcher(source.id);
  if (!fetcher) {
    return {
      sourceId: source.id,
      sourceName: source.name,
      fetchedAt: new Date().toISOString(),
      ok: false,
      events: [],
      errors: [`No fetcher implemented for source: ${source.id}`],
      usedFallback: false,
    };
  }

  return await fetcher.fetchSource(source);
}

export default { getFetcher, getFetcherIds, runSourceFetcher };
