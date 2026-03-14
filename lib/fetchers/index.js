import tourismkelowna from './tourismkelowna.js';
import eventbriteKelowna from './eventbrite-kelowna.js';
import castanet from './castanet.js';
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
  [castanet.metadata.id]: castanet,
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
