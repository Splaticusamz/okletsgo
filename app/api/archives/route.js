import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../lib/admin-auth.js';
import { listArchives, getArchive, compareArchives } from '../../../lib/archive.js';
import { createEvent } from '../../../lib/db.js';

export const dynamic = 'force-dynamic';

async function isAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  return await verifyAdminSessionValue(token);
}

export async function GET(request) {
  try {
    if (!await isAuthorized()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week');
    const compareA = searchParams.get('compareA');
    const compareB = searchParams.get('compareB');

    // Compare two weeks
    if (compareA && compareB) {
      const diff = compareArchives(compareA, compareB);
      if (!diff) return NextResponse.json({ error: 'One or both archives not found' }, { status: 404 });
      return NextResponse.json(diff);
    }

    // Get specific week
    if (week) {
      const archive = getArchive(week);
      if (!archive) return NextResponse.json({ error: 'Archive not found' }, { status: 404 });
      return NextResponse.json(archive);
    }

    // List all
    return NextResponse.json({ archives: listArchives() });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!await isAuthorized()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'reuse') {
      const event = body?.event;
      if (!event || !event.title) {
        return NextResponse.json({ error: 'Event data required' }, { status: 400 });
      }

      const created = createEvent({
        title: event.title,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        venue: event.venue,
        city: event.city,
        address: event.address,
        description: event.description,
        mode: event.mode,
        sourceUrl: event.sourceUrl,
        ticketUrl: event.ticketUrl,
        tags: event.tags,
        source: 'archive',
        status: 'candidate',
      });

      return NextResponse.json({ ok: true, event: created }, { status: 201 });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
