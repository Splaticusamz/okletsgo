import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEvent, updateEvent, initDb, flushDb } from '../../../../lib/db.js';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../../lib/admin-auth.js';
import { createFalClient } from '@fal-ai/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function isAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  return await verifyAdminSessionValue(token);
}

function getFalClient() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error('FAL_KEY is not configured');
  return createFalClient({ credentials: key });
}

export async function POST(request) {
  try {
    if (!await isAuthorized()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 503 });
    }

    await initDb();
    const body = await request.json().catch(() => ({}));
    const eventId = String(body?.eventId ?? '').trim();
    const candidateId = String(body?.candidateId ?? '').trim();
    const imageUrl = String(body?.imageUrl ?? '').trim();
    const scale = body?.scale === 4 ? 4 : 2;

    if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });

    const event = getEvent(eventId);
    if (!event) return NextResponse.json({ error: `Event not found: ${eventId}` }, { status: 404 });

    const fal = getFalClient();
    const result = await fal.subscribe('fal-ai/clarity-upscaler', {
      input: {
        image_url: imageUrl,
        scale,
        prompt: 'high quality, detailed, sharp',
      },
      logs: false,
    });

    const upscaledUrl = result?.data?.image?.url;
    if (!upscaledUrl) throw new Error('fal.ai did not return an upscaled image URL');

    // Update the candidate with upscaled version info
    const candidates = [...(event.imageCandidates ?? [])];
    const idx = candidates.findIndex(c => c.id === candidateId);
    if (idx >= 0) {
      candidates[idx] = {
        ...candidates[idx],
        originalUrl: candidates[idx].originalUrl || candidates[idx].url,
        url: upscaledUrl,
        upscaled: true,
        upscaleScale: scale,
        upscaledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updateEvent(eventId, { imageCandidates: candidates });
      await flushDb();
    }

    return NextResponse.json({ ok: true, upscaledUrl, scale, candidateId });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
