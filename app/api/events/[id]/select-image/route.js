import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEvent, updateEvent, initDb, flushDb } from '../../../../../lib/db.js';
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
    const body = await request.json();
    const { candidateId, cropData } = body;

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
    }

    const event = getEvent(id);
    if (!event) {
      return NextResponse.json({ error: `Event not found: ${id}` }, { status: 404 });
    }

    const candidates = event.imageCandidates ?? [];
    const updatedCandidates = candidates.map((c) => ({
      ...c,
      selected: c.id === candidateId,
      cropData: c.id === candidateId ? (cropData ?? c.cropData) : c.cropData,
    }));

    // TODO: When sharp is available, actually crop the image to 1:2 ratio here
    // For now we just mark it as selected with crop metadata

    const selectedCandidate = updatedCandidates.find(c => c.selected);
    const updated = updateEvent(id, {
      imageCandidates: updatedCandidates,
      selectedImageCandidate: selectedCandidate ? { url: selectedCandidate.url, id: selectedCandidate.id } : null,
    });
    await flushDb();

    const selected = updated.imageCandidates?.find((c) => c.selected);
    return NextResponse.json({ ok: true, selected, candidates: updated.imageCandidates });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
