import {
  getCurrentPublishedBatch,
  getLatestPublishBatch,
  getEvent,
  getLatestNewsletterDraft,
  createNewsletterDraft,
  updateNewsletterDraft,
  getNewsletterSettings,
} from './db.js';

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function pickBatch(preferPublished = true) {
  return preferPublished ? (getCurrentPublishedBatch() ?? getLatestPublishBatch()) : (getLatestPublishBatch() ?? getCurrentPublishedBatch());
}

function hydrateBatchEvents(batch) {
  if (!batch) return [];
  return (batch.eventIds ?? []).map((id) => getEvent(id)).filter(Boolean);
}

function eventLine(event) {
  return [event.title, event.venue, event.city].filter(Boolean).join(' — ');
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.date) - DAY_ORDER.indexOf(b.date);
    if (dayDiff !== 0) return dayDiff;
    return String(a.mode).localeCompare(String(b.mode));
  });
}

export function buildNewsletterDraft() {
  const batch = pickBatch(true);
  if (!batch) throw new Error('No publish batch available for newsletter drafting');

  const events = sortEvents(hydrateBatchEvents(batch));
  if (events.length === 0) throw new Error(`Batch ${batch.id} has no events`);

  const grouped = DAY_ORDER.map((day) => ({
    day,
    events: events.filter((event) => event.date === day),
  })).filter((entry) => entry.events.length > 0);

  const subject = `OK LET'S GO — Week of ${batch.weekLabel}`;
  const previewText = `${events.length} picks from the approved batch, ready for edit and final approval.`;
  const intro = `Here’s the current approved drop for the week of ${batch.weekLabel}. Everything below comes from the same reviewed publish batch so site + newsletter stay aligned.`;
  const outro = 'Final check: confirm copy, links, and Beehiiv settings before marking this ready to send.';

  const sections = grouped.map((group) => ({
    id: `section-${group.day.toLowerCase()}`,
    heading: group.day,
    summary: `${group.events.length} pick${group.events.length === 1 ? '' : 's'}`,
    items: group.events.map((event) => ({
      eventId: event.id,
      title: event.title,
      venue: event.venue,
      city: event.city,
      mode: event.mode,
      date: event.date,
      startTime: event.startTime ?? null,
      ticketUrl: event.ticketUrl ?? null,
      sourceUrl: event.sourceUrl ?? null,
      image: event.latestAsset?.squareUrl ?? event.latestAsset?.portraitUrl ?? (event.fallbackImage ? `/${String(event.fallbackImage).replace(/^\//, '')}` : null),
      blurb: [event.description, event.tags?.length ? `Tags: ${event.tags.join(', ')}` : null].filter(Boolean).join(' '),
    })),
  }));

  const blocks = [
    { type: 'hero', heading: subject, text: intro },
    ...sections.map((section) => ({
      type: 'section',
      heading: section.heading,
      text: section.items.map((item) => `• ${eventLine(item)}`).join('\n'),
      items: section.items,
    })),
    {
      type: 'cta',
      heading: 'Plan your week',
      text: `This draft mirrors batch ${batch.id}. Once final approval is complete, export the Beehiiv payload and hand off to send flow.`,
    },
  ];

  return {
    batchId: batch.id,
    weekLabel: batch.weekLabel,
    subject,
    previewText,
    intro,
    outro,
    sections,
    blocks,
    checklist: [
      { id: 'copy', label: 'Copy reviewed against approved batch', done: false },
      { id: 'links', label: 'Ticket/source links spot-checked', done: false },
      { id: 'beehiiv', label: 'Beehiiv payload + settings confirmed', done: false },
      { id: 'approval', label: 'Final approval granted before ready-to-send', done: false },
    ],
    beehiiv: buildBeehiivPayload({ batchId: batch.id, weekLabel: batch.weekLabel, subject, previewText, blocks, sections }),
  };
}

export function generateNewsletterDraft() {
  const draft = buildNewsletterDraft();
  return createNewsletterDraft({ ...draft, status: 'draft' });
}

export function approveNewsletterDraft(id) {
  const draft = getLatestNewsletterDraft();
  if (!draft || draft.id !== id) throw new Error(`Newsletter draft not found: ${id}`);
  if (draft.status !== 'draft') throw new Error(`Newsletter draft ${id} must be in draft status before approval`);
  return updateNewsletterDraft(id, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    checklist: (draft.checklist ?? []).map((item) => item.id === 'approval' ? { ...item, done: true } : item),
  });
}

export function markNewsletterReadyToSend(id) {
  const draft = getLatestNewsletterDraft();
  if (!draft || draft.id !== id) throw new Error(`Newsletter draft not found: ${id}`);
  if (draft.status !== 'approved') throw new Error('Final approval is required before ready-to-send');
  return updateNewsletterDraft(id, {
    status: 'ready_to_send',
    readyToSendAt: new Date().toISOString(),
    checklist: (draft.checklist ?? []).map((item) => ({ ...item, done: true })),
  });
}

export function buildBeehiivPayload(draftLike) {
  const settings = getNewsletterSettings();
  return {
    publicationId: settings.publicationId ?? '',
    templateId: settings.templateId ?? '',
    audienceSegment: settings.audienceSegment ?? 'all',
    endpointPath: settings.endpointPath ?? '/v2/posts',
    status: 'draft',
    subject: draftLike.subject,
    previewText: draftLike.previewText,
    blocks: draftLike.blocks,
    metadata: {
      weekLabel: draftLike.weekLabel,
      batchId: draftLike.batchId,
      exportedAt: new Date().toISOString(),
      integrationMode: 'later-ready-placeholder',
    },
  };
}
