function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const CITY_MATCH = /(Kelowna|West Kelowna|Lake Country|Penticton|Vernon|Peachland|Osoyoos|Oliver)\b/i;

export function normalizeAddress(value = '', fallbackCity = '') {
  const raw = clean(value);
  if (!raw) {
    return {
      addressText: null,
      streetAddress: null,
      city: clean(fallbackCity) || null,
      normalizedAddress: null,
      parts: [],
    };
  }

  const parts = raw.split(',').map(part => clean(part)).filter(Boolean);
  const cityPart = parts.find(part => CITY_MATCH.test(part)) || clean(fallbackCity) || null;
  const streetAddress = parts.find(part => part !== cityPart) || parts[0] || null;
  const normalizedAddress = [streetAddress, cityPart].filter(Boolean).join(', ') || raw;

  return {
    addressText: raw,
    streetAddress,
    city: cityPart,
    normalizedAddress,
    parts,
  };
}

export function normalizeVenueRecord(input = {}) {
  const venueName = clean(input.venue || input.name || input.locationName || input.place || '');
  const address = normalizeAddress(input.address || input.location || '', input.city);
  const city = clean(input.city || address.city || 'Kelowna') || 'Kelowna';
  const name = venueName || address.streetAddress || city;
  const id = slug(`${name}-${city}`) || slug(name) || null;

  return {
    id,
    name,
    city,
    address: address.normalizedAddress,
    streetAddress: address.streetAddress,
    addressText: address.addressText,
    normalizedAddress: address.normalizedAddress,
  };
}

export function enrichEventLocation(event = {}) {
  const venueRecord = normalizeVenueRecord({
    venue: event.venue,
    city: event.city,
    address: event.address || event.location || event.raw?.address || event.raw?.location,
    locationName: event.raw?.locationName,
    place: event.raw?.place,
  });

  const reasons = [];
  if (venueRecord.name) reasons.push('venue normalized');
  if (venueRecord.city) reasons.push('city normalized');
  if (venueRecord.address) reasons.push('address parsed');

  return {
    ...event,
    venue: venueRecord.name || event.venue || null,
    venueId: venueRecord.id || event.venueId || null,
    city: venueRecord.city || event.city || null,
    address: venueRecord.address,
    location: venueRecord.address,
    venueRecord,
    enrichment: {
      venueNormalized: Boolean(venueRecord.name),
      addressParsed: Boolean(venueRecord.address),
      reasons,
    },
  };
}

export function summarizeVenueEnrichment(events = []) {
  const summary = {
    normalizedVenues: 0,
    addressParsed: 0,
    uniqueVenues: 0,
  };

  const venueIds = new Set();
  for (const event of events) {
    if (event?.enrichment?.venueNormalized) summary.normalizedVenues += 1;
    if (event?.enrichment?.addressParsed) summary.addressParsed += 1;
    if (event?.venueId) venueIds.add(event.venueId);
  }

  summary.uniqueVenues = venueIds.size;
  return summary;
}

export default { normalizeAddress, normalizeVenueRecord, enrichEventLocation, summarizeVenueEnrichment };
