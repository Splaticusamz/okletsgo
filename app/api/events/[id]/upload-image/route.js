import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEvent, updateEvent, initDb, flushDb } from '../../../../../lib/db.js';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../../../lib/admin-auth.js';
import fs from 'fs/promises';
import path from 'path';

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

    const formData = await request.formData();
    const file = formData.get('image');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = (file.name || 'upload.jpg').split('.').pop() || 'jpg';
    const candidateId = `${id}-upload-${Date.now()}`;
    const filename = `${candidateId}.${ext}`;

    const candidateDir = path.join(process.cwd(), 'public', 'assets', 'candidates', id);
    await fs.mkdir(candidateDir, { recursive: true });
    const filePath = path.join(candidateDir, filename);
    await fs.writeFile(filePath, buffer);

    const url = `/assets/candidates/${id}/${filename}`;
    const newCandidate = {
      id: candidateId,
      url,
      source: 'upload',
      provenance: 'upload',
      extractorId: 'manual-upload',
      selected: false,
    };

    const existing = event.imageCandidates ?? [];
    const updated = updateEvent(id, { imageCandidates: [...existing, newCandidate] });
    await flushDb();

    return NextResponse.json({ ok: true, candidate: newCandidate, candidates: updated.imageCandidates });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
