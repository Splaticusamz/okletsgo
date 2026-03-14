import { fetchHtml, normalizeCandidateEvent, safeJsonLd, cleanupText } from './utils.js';

export const metadata = {
  id: 'eventbrite-kelowna',
  name: 'Eventbrite Kelowna',
  url: 'https://www.eventbrite.ca/d/canada--kelowna/events/',
  parser: 'jsonld+cards',
};

const fallbackItems = [
  {
    title: 'Eventbrite fallback: Kelowna community social',
    date: new Date(Date.now() + 2 * 86400000).toISOString(),
    time: '6:30 PM',
    venue: 'Downtown Kelowna',
    city: 'Kelowna',
    description: 'Fallback Eventbrite candidate for when the page blocks automated parsing.',
    url: metadata.url,
  },
];

export async function fetchSource(source) {
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
    const jsonLdDocs = safeJsonLd(html).flatMap(item => item['@graph'] ? item['@graph'] : [item]);
    const eventDocs = jsonLdDocs.filter(item => String(item['@type'] || '').toLowerCase().includes('event'));

    const jsonLdEvents = eventDocs.map((item, index) => normalizeCandidateEvent(source, {
      title: item.name,
      description: item.description,
      date: item.startDate,
      location: item.location?.name || item.location?.address?.streetAddress || 'Kelowna',
      venue: item.location?.name || 'Eventbrite listing',
      city: item.location?.address?.addressLocality || 'Kelowna',
      url: item.url || source.url,
      externalId: item.identifier || item['@id'] || null,
      startTime: item.startDate,
    }, index));

    if (jsonLdEvents.length > 0) {
      run.events = jsonLdEvents;
      return run;
    }

    const cardMatches = [...html.matchAll(/event-card__formatted-name[^>]*>([\s\S]*?)<\/[^>]+>/gi)]
      .map((match, index) => {
        const title = cleanupText(match[1].replace(/<[^>]+>/g, ''));
        if (!title) return null;
        return normalizeCandidateEvent(source, {
          title,
          date: new Date(Date.now() + (index + 1) * 86400000).toISOString(),
          venue: 'Eventbrite Kelowna',
          city: 'Kelowna',
          description: 'Parsed from Eventbrite search result card.',
          url: source.url,
        }, index);
      })
      .filter(Boolean)
      .slice(0, 8);

    if (cardMatches.length > 0) {
      run.events = cardMatches;
      return run;
    }

    run.usedFallback = true;
    run.errors.push('No parsable Eventbrite events found; using fallback candidate.');
    run.events = fallbackItems.map((item, index) => normalizeCandidateEvent(source, item, index));
    return run;
  } catch (error) {
    run.ok = false;
    run.usedFallback = true;
    run.errors.push(error.message);
    run.events = fallbackItems.map((item, index) => normalizeCandidateEvent(source, item, index));
    return run;
  }
}

export default { metadata, fetchSource };
