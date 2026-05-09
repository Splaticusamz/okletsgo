import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectEventsForWeek, isFunEvent } from '../lib/weekly-curation.mjs';

const DAY_ORDER = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];

function event(id, sourceId, date, title, extra = {}) {
  return {
    id,
    sourceId,
    source: `scraper:${sourceId}`,
    title,
    date,
    venue: extra.venue || `${title} Venue`,
    sourceUrl: extra.sourceUrl || `https://example.com/${id}`,
    description: extra.description || `${title} is a fun night with live music, wine, comedy, art, food, and local culture for people looking for things to do.`,
    startTime: extra.startTime || '19:00',
    confidenceScore: extra.confidenceScore ?? 70,
    price: extra.price || '$25',
  };
}

function image(eventId, url = 'https://example.com/event-photo.jpg') {
  return { eventId, url };
}

test('isFunEvent rejects service/support listings and accepts leisure listings', () => {
  assert.equal(isFunEvent(event('bad', 'castanet', '2026-04-27', 'Divorce Care', {
    description: 'A divorce support group and caregiver information session.',
  })), false);
  assert.equal(isFunEvent(event('good', 'tourismkelowna', '2026-04-27', 'Drag Bingo with Honey Graham')), true);
});

test('selectEventsForWeek does not let Castanet monopolize when complete fun events from other sources exist', () => {
  const dates = ['2026-04-27','2026-04-28','2026-04-29','2026-04-30','2026-05-01','2026-05-02','2026-05-03'];
  const castanet = dates.flatMap((date, dayIndex) => [0,1,2].map((slot) =>
    event(`castanet-${dayIndex}-${slot}`, 'castanet', date, `Castanet ${DAY_ORDER[new Date(`${date}T12:00:00Z`).getUTCDay()]} ${slot}`, {
      confidenceScore: 90,
      sourceUrl: `https://www.castanet.net/events/example/${dayIndex}${slot}`,
    })
  ));
  const tourism = dates.slice(2, 6).map((date, index) =>
    event(`tourism-${index}`, 'tourismkelowna', date, `Tourism Kelowna Featured ${index}`, {
      confidenceScore: 75,
      sourceUrl: `https://www.tourismkelowna.com/event/featured-${index}/`,
    })
  );
  const events = [...castanet, ...tourism];
  const imageCandidates = events.map((e) => image(e.id, e.sourceId === 'castanet'
    ? 'https://www.castanet.net/events/photos/example.jpg'
    : 'https://assets.simpleviewinc.com/simpleview/image/upload/example.jpg'));

  const selected = selectEventsForWeek(events, imageCandidates, {
    weekStart: '2026-04-27',
    weekEnd: '2026-05-03',
    maxSlots: 21,
    minNonDominant: 3,
    dominantSourceId: 'castanet',
  });

  assert.equal(selected.length, 21);
  const nonCastanet = selected.filter((e) => e.sourceId !== 'castanet');
  assert.ok(nonCastanet.length >= 3, `expected at least 3 non-Castanet events, got ${nonCastanet.length}`);
  assert.ok(selected.every((e) => e.calendarDay && e.calendarMode), 'all selected events are placed');
});
