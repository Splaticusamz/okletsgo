import { fetchHtml, normalizeCandidateEvent, safeJsonLd } from './utils.js';

export const metadata = {
  id: 'tourismkelowna',
  name: 'Tourism Kelowna',
  url: 'https://www.tourismkelowna.com/events/',
  parser: 'jsonld+html',
};

const fallbackItems = [
  {
    title: 'Tourism Kelowna fallback: Waterfront live music',
    date: new Date(Date.now() + 86400000).toISOString(),
    time: '7:00 PM',
    venue: 'Kelowna Waterfront',
    city: 'Kelowna',
    description: 'Fallback candidate used when Tourism Kelowna markup changes or blocks parsing.',
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
    const jsonLd = safeJsonLd(html)
      .flatMap(item => item['@graph'] ? item['@graph'] : [item])
      .filter(item => String(item['@type'] || '').toLowerCase().includes('event'));

    const structured = jsonLd.map((item, index) => normalizeCandidateEvent(source, {
      title: item.name,
      description: item.description,
      date: item.startDate,
      startDate: item.startDate,
      location: item.location?.name || item.location?.address?.streetAddress || '',
      venue: item.location?.name || '',
      city: item.location?.address?.addressLocality || 'Kelowna',
      url: item.url || source.url,
      ticketUrl: item.offers?.url || item.url || source.url,
      image: item.image,
      offers: item.offers,
      externalId: item['@id'] || null,
    }, index));

    if (structured.length > 0) {
      run.events = structured;
      return run;
    }

    run.usedFallback = true;
    run.errors.push('No parsable Tourism Kelowna JSON-LD events found; using fallback candidate.');
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
