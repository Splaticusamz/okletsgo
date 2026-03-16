import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { initDb, flushDb, getEvent, createOrUpdateAsset } from '../../../../lib/db.js';
import { isFalConfigured, submitAnimation, pollAnimation } from '../../../../lib/fal-video.js';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../../lib/admin-auth.js';

export const dynamic = 'force-dynamic';

async function isAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  return await verifyAdminSessionValue(token);
}

/**
 * POST — Submit animation job (returns immediately with requestId)
 * GET  — Poll animation status (pass ?eventId=...&requestId=...)
 */
export async function POST(request) {
  try {
    if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isFalConfigured()) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 503 });

    await initDb();
    const body = await request.json().catch(() => ({}));
    const eventId = String(body?.eventId ?? '').trim();
    if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 });

    const event = getEvent(eventId);
    if (!event) return NextResponse.json({ error: `Event not found: ${eventId}` }, { status: 404 });

    const selectedImage = event.selectedImageCandidate?.url
      || event.imageCandidates?.find(c => c.selected)?.url
      || event.imageCandidates?.[0]?.url;
    if (!selectedImage) return NextResponse.json({ error: 'No image selected.' }, { status: 400 });

    const title = (event.title || '').trim();
    const venue = (event.venue || '').trim();
    const mode = event.mode || 'day';
    const scene = title && venue ? `${title} at ${venue}` : (title || venue);
    const atmosphere = mode === 'night'
      ? 'evening ambiance, warm lights gently flickering'
      : 'daytime scene, natural light shifting subtly';
    const motionPrompt = `Subtle cinematic camera push-in with gentle parallax. ${scene}. ${atmosphere}. Smooth, professional, editorial quality.`;

    // Submit async job — returns immediately
    const { requestId } = await submitAnimation(selectedImage, { prompt: motionPrompt, duration: 5 });

    createOrUpdateAsset(eventId, {
      animationStatus: 'processing',
      animationRequestId: requestId,
      notes: 'Animation submitted to fal.ai — polling for result...',
    });
    await flushDb();

    return NextResponse.json({ ok: true, status: 'processing', requestId });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const requestId = url.searchParams.get('requestId');
    const eventId = url.searchParams.get('eventId');
    if (!requestId) return NextResponse.json({ error: 'requestId is required' }, { status: 400 });

    const result = await pollAnimation(requestId);

    if (result.status === 'completed' && result.videoUrl && eventId) {
      await initDb();
      createOrUpdateAsset(eventId, {
        animationStatus: 'ready',
        animationUrl: result.videoUrl,
        animationProvider: 'fal-ai/kling-v2-master',
        animationRequestId: requestId,
        notes: 'Animation generated via fal.ai',
      });
      await flushDb();
    }

    if (result.status === 'failed' && eventId) {
      await initDb();
      createOrUpdateAsset(eventId, {
        animationStatus: 'failed',
        notes: `Animation failed: ${result.error || 'unknown error'}`,
      });
      await flushDb();
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
