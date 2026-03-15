import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEvent, updateEvent, initDb, flushDb } from '../../../../../lib/db.js';
import { fetchCategorizedImages, findImagesForEvent } from '../../../../../lib/image-search.js';
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

    const body = await request.json().catch(() => ({}));
    const categorized = body.categorized !== false; // default true

    let newCandidates;
    let categories = null;

    if (categorized) {
      const result = await fetchCategorizedImages(event);
      categories = result;
      newCandidates = [...result.venue, ...result.event, ...result.activity];
    } else {
      newCandidates = await findImagesForEvent(event, { offset: body.offset ?? 0, limit: body.limit ?? 5 });
    }

    const existing = event.imageCandidates ?? [];
    const existingUrls = new Set(existing.map(c => c.url));
    const deduped = newCandidates.filter(c => !existingUrls.has(c.url));
    const merged = [...existing, ...deduped];

    const updated = updateEvent(id, { imageCandidates: merged });
    await flushDb();

    return NextResponse.json({ ok: true, candidates: updated.imageCandidates, categories });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
