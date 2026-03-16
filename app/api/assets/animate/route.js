import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { initDb, flushDb, getEvent, getLatestAssetByEventId, createOrUpdateAsset } from '../../../../lib/db.js';
import { generateVideoFromImage, isFalConfigured } from '../../../../lib/fal-video.js';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../../lib/admin-auth.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // fal.ai can take a while

async function isAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  return await verifyAdminSessionValue(token);
}

export async function POST(request) {
  try {
    if (!await isAuthorized()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isFalConfigured()) {
      return NextResponse.json({ error: 'FAL_KEY not configured — cannot generate animations' }, { status: 503 });
    }

    await initDb();
    const body = await request.json().catch(() => ({}));
    const eventId = String(body?.eventId ?? '').trim();
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const event = getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: `Event not found: ${eventId}` }, { status: 404 });
    }

    // Find the source image URL
    const selectedImage = event.selectedImageCandidate?.url
      || event.imageCandidates?.find(c => c.selected)?.url
      || event.imageCandidates?.[0]?.url;

    if (!selectedImage) {
      return NextResponse.json({ error: 'No image selected. Select an image first, then animate.' }, { status: 400 });
    }

    // Build a motion prompt from event metadata
    const title = (event.title || '').trim();
    const venue = (event.venue || '').trim();
    const mode = event.mode || 'day';

    let motionPrompt = 'Subtle cinematic camera movement with gentle parallax effect';
    if (title || venue) {
      const scene = title && venue ? `${title} at ${venue}` : (title || venue);
      const atmosphere = mode === 'night'
        ? 'evening ambiance, warm lights gently flickering'
        : 'daytime scene, natural light shifting subtly';
      motionPrompt = `Subtle cinematic camera push-in with gentle parallax. ${scene}. ${atmosphere}. Smooth, professional, editorial quality.`;
    }

    // Update asset status to processing
    createOrUpdateAsset(eventId, {
      animationStatus: 'processing',
      notes: 'Generating animation via fal.ai...',
    });
    await flushDb();

    // Call fal.ai
    const result = await generateVideoFromImage(selectedImage, {
      prompt: motionPrompt,
      duration: 5,
    });

    // Update asset with video URL
    createOrUpdateAsset(eventId, {
      animationStatus: 'ready',
      animationUrl: result.videoUrl,
      animationProvider: result.provider,
      animationRequestId: result.requestId,
      notes: `Animation generated via ${result.provider}`,
    });
    await flushDb();

    return NextResponse.json({
      ok: true,
      videoUrl: result.videoUrl,
      provider: result.provider,
    });
  } catch (error) {
    // Update asset to failed
    try {
      const body = await request.clone().json().catch(() => ({}));
      if (body?.eventId) {
        await initDb();
        createOrUpdateAsset(body.eventId, {
          animationStatus: 'failed',
          notes: `Animation failed: ${error.message}`,
        });
        await flushDb();
      }
    } catch { /* ignore cleanup errors */ }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
