import tourismkelowna from './tourismkelowna.js';
import eventbriteKelowna from './eventbrite-kelowna.js';
import { fetchGenericSource } from './generic.js';

function makeGenericFetcher(id, name) {
  return {
    metadata: { id, name, parser: 'generic' },
    fetchSource: (source) => fetchGenericSource(source),
  };
}

const FETCHERS = {
  [tourismkelowna.metadata.id]: tourismkelowna,
  [eventbriteKelowna.metadata.id]: eventbriteKelowna,
  'eveningout': makeGenericFetcher('eveningout', 'Evening Out'),
  'city-of-kelowna': makeGenericFetcher('city-of-kelowna', 'City of Kelowna'),
  'kelownanow': makeGenericFetcher('kelownanow', 'Kelowna Now'),
  'castanet-kelowna': makeGenericFetcher('castanet-kelowna', 'Castanet Kelowna'),
  'okanagan-life': makeGenericFetcher('okanagan-life', 'Okanagan Life'),
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
