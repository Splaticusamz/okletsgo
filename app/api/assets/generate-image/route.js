import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEvent, updateEvent, initDb, flushDb } from '../../../../lib/db.js';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../../lib/admin-auth.js';
import { generateImage, isFalConfigured } from '../../../../lib/fal-video.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PRESETS = {
  'event-promo': (event) =>
    `Professional event promotional image for "${event.title || 'event'}". ${event.venue ? `Venue: ${event.venue}.` : ''} ${event.city ? `Location: ${event.city}.` : ''} Vibrant, eye-catching, modern design with bold typography feel. High quality, editorial style.`,
  'venue-atmosphere': (event) =>
    `Atmospheric interior/exterior photograph of ${event.venue || 'a venue'}${event.city ? ` in ${event.city}` : ''}. ${event.mode === 'night' ? 'Evening ambiance, warm lighting, moody atmosphere.' : 'Natural daylight, welcoming atmosphere, inviting space.'} Professional photography, high resolution.`,
  'abstract-artistic': (event) =>
    `Abstract artistic interpretation of ${event.title || 'an event'}. ${event.mode === 'night' ? 'Dark palette with neon accents and dramatic lighting.' : 'Warm palette with flowing shapes and natural textures.'} Modern art style, visually striking, suitable as event background.`,
};

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
      return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 503 });
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

    // Build prompt
    let prompt = '';
    const presetId = body?.presetId;
    if (presetId && PRESETS[presetId]) {
      prompt = PRESETS[presetId](event);
    } else if (body?.prompt) {
      prompt = body.prompt;
    } else {
      prompt = PRESETS['event-promo'](event);
    }

    // Append custom parameters if provided
    if (body?.customParams) {
      prompt += ' ' + body.customParams;
    }

    const result = await generateImage(prompt, {
      size: body?.size ?? 'portrait_16_9',
    });

    // Add as image candidate
    const candidateId = `${eventId}-gen-${Date.now()}`;
    const newCandidate = {
      id: candidateId,
      url: result.imageUrl,
      source: 'ai-generated',
      provenance: 'ai-generated',
      category: 'activity',
      extractorId: result.provider,
      aiPrompt: prompt,
      selected: false,
    };

    const existing = event.imageCandidates ?? [];
    updateEvent(eventId, { imageCandidates: [...existing, newCandidate] });
    await flushDb();

    return NextResponse.json({ ok: true, candidate: newCandidate });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
