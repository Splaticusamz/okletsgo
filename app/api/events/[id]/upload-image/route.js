import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEvent, updateEvent, initDb, flushDb } from '../../../../../lib/db.js';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../../../lib/admin-auth.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

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

    const formData = await request.formData();
    const file = formData.get('image');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Convert to base64 data URL (Vercel serverless has read-only filesystem)
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

    const candidateId = `${id}-upload-${Date.now()}`;
    const newCandidate = {
      id: candidateId,
      url: dataUrl,
      source: 'upload',
      provenance: 'upload',
      extractorId: 'manual-upload',
      selected: false,
    };

    const existing = event.imageCandidates ?? [];
    const updated = updateEvent(id, { imageCandidates: [...existing, newCandidate] });
    await flushDb();

    return NextResponse.json({ ok: true, candidate: { ...newCandidate, url: '(stored)' }, candidates: updated.imageCandidates });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
