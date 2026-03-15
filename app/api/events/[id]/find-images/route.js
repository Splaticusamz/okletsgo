import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEvent, updateEvent, initDb, flushDb } from '../../../../../lib/db.js';
import { findImagesForEvent } from '../../../../../lib/image-search.js';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../../../lib/admin-auth.js';

export const dynamic = 'force-dynamic';

async function isAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  return await verifyAdminSessionValue(token);
}

export async function POST(request, { params }) {
  try {
    if (!await isAuthorized()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initDb();
    const { id } = await params;
    const event = getEvent(id);
    if (!event) {
      return NextResponse.json({ error: `Event not found: ${id}` }, { status: 404 });
    }

    const newCandidates = await findImagesForEvent(event);
    const existing = event.imageCandidates ?? [];
    const merged = [...existing, ...newCandidates];

    const updated = updateEvent(id, { imageCandidates: merged });
    await flushDb();

    return NextResponse.json({ ok: true, candidates: updated.imageCandidates });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
