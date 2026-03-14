import { NextResponse } from 'next/server';
import { createEvent } from '../../../../lib/db.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
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
      description: body.description ? String(body.description).trim() : '',
      mode: String(body.mode).trim(),
      sourceId: 'manual',
      source: 'manual',
      status: 'candidate',
    });

    return NextResponse.json({ ok: true, event }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
