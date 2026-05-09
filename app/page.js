import { getCurrentWeek } from '../lib/data';
import { initDb } from '../lib/db';
import HomepageClient from '../components/HomepageClient';

export const dynamic = 'force-dynamic';

async function getKelownaForecast() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=49.8880&longitude=-119.4960&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=America%2FVancouver&forecast_days=7', { cache: 'no-store' });
    if (!res.ok) return {};
    const data = await res.json();
    const byDate = {};
    data.daily?.time?.forEach((date, index) => {
      byDate[date] = {
        code: data.daily.weather_code?.[index],
        high: data.daily.temperature_2m_max?.[index],
        low: data.daily.temperature_2m_min?.[index],
      };
    });
    return byDate;
  } catch {
    return {};
  }
}

function buildEventLd(event, dateStr) {
  if (!event.venue && !event.eventVenue) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.venue || event.eventVenue || 'Event',
    description: event.description || `What's on in the Okanagan`,
    startDate: dateStr || undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: event.ticketUrl ? 'https://schema.org/OfflineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    location: event.address ? {
      '@type': 'Place',
      name: event.eventVenue || event.venue || '',
      address: { '@type': 'PostalAddress', addressLocality: event.city || 'Kelowna', addressRegion: 'BC', addressCountry: 'CA', streetAddress: event.address },
    } : {
      '@type': 'Place',
      name: event.eventVenue || event.venue || '',
      address: { '@type': 'PostalAddress', addressLocality: event.city || 'Kelowna', addressRegion: 'BC', addressCountry: 'CA' },
    },
    offers: event.ticketUrl ? {
      '@type': 'Offer',
      url: event.ticketUrl,
      price: event.pricing?.match(/\$\s?\d+(?:\.\d{2})?/)?.[0]?.replace('$', '').trim() || undefined,
      priceCurrency: 'CAD',
      availability: 'https://schema.org/InStock',
      validFrom: dateStr || undefined,
    } : undefined,
    image: event.imageUrl || 'https://okletsgo.ca/icon.png',
    url: event.ticketUrl || event.sourceUrl || 'https://okletsgo.ca',
  };
}

export default async function HomePage() {
  await initDb();
  const currentWeek = getCurrentWeek();
  currentWeek.weatherByDate = await getKelownaForecast();

  const weekStart = currentWeek.weekKey ? new Date(`${currentWeek.weekKey}T12:00:00`) : null;
  const dateForIndex = (index) => {
    if (!weekStart) return null;
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + index);
    return d.toISOString().slice(0, 10);
  };

  const events = [];
  currentWeek.days.forEach((day, index) => {
    const dateStr = dateForIndex(index);
    ['night', 'grownup', 'family'].forEach((mode) => {
      const entry = day.entries[mode];
      if (entry) {
        const ld = buildEventLd(entry, dateStr);
        if (ld) events.push(ld);
      }
    });
  });

  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: "OK LET'S GO",
    url: 'https://okletsgo.ca',
    logo: 'https://okletsgo.ca/icon.png',
    sameAs: [],
    areaServed: { '@type': 'City', name: 'Kelowna', containedInPlace: { '@type': 'AdministrativeArea', name: 'Okanagan' } },
  };

  const jsonLd = JSON.stringify([orgLd, ...events]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <HomepageClient currentWeek={currentWeek} />
    </>
  );
}
