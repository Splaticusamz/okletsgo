import { NextResponse } from 'next/server';
import { getEvents, getCurrentPublishedBatch, initDb } from '../../../lib/db.js';
import { getBatchEvents } from '../../../lib/publisher.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await initDb();
    const url = new URL(request.url);
    const showAll = url.searchParams.get('all') === '1';

    // Admin callers pass ?all=1 to see everything
    if (showAll) {
      const events = getEvents();
      return NextResponse.json({ events });
    }

    // Public: only show events from a published batch
    const published = getCurrentPublishedBatch();
    if (published) {
      const events = getBatchEvents(published.id);
      return NextResponse.json({ events, batchId: published.id });
    }

    // Fallback: return all events (no batch published yet)
    const events = getEvents();
    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
