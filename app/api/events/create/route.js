import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createEvent } from '../../../../lib/db.js';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../../lib/admin-auth.js';

export const dynamic = 'force-dynamic';

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

    const body = await request.json();
    const required = ['title', 'date', 'venue', 'city', 'mode'];
    const missing = required.filter(field => !String(body?.[field] ?? '').trim());
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing fields: ${missing.join(', ')}` }, { status: 400 });
    }

    const event = createEvent({
      title: String(body.title).trim(),
      date: String(body.date).trim(),
      startTime: body.startTime ? String(body.startTime).trim() : null,
      endTime: body.endTime ? String(body.endTime).trim() : null,
      venue: String(body.venue).trim(),
      city: String(body.city).trim(),
      address: body.address ? String(body.address).trim() : null,
      description: body.description ? String(body.description).trim() : '',
      mode: String(body.mode).trim(),
      sourceId: 'manual',
      source: 'manual',
      status: 'candidate',
      confidenceScore: 90,
      confidenceReasons: ['Manual entry', 'Required fields present'],
    });

    return NextResponse.json({ ok: true, event }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
