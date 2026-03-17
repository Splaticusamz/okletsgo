import { NextResponse } from 'next/server';
import { createEvent, initDb, flushDb } from '../../../../lib/db.js';

export const dynamic = 'force-dynamic';

/**
 * Token-authenticated ingest endpoint for the Discord pipeline.
 * POST /api/events/ingest
 * Header: Authorization: Bearer <INGEST_TOKEN>
 * Body: { title, date?, venue?, city?, mode?, description?, url?, image?, source? }
 */
export async function POST(request) {
  try {
    const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();
    const expected = (process.env.INGEST_TOKEN || '').trim();
    if (!expected || token !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initDb();
    const body = await request.json();

    if (!body?.title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const event = createEvent({
      title: String(body.title).trim(),
      date: body.date ? String(body.date).trim() : new Date().toISOString().slice(0, 10),
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      venue: body.venue ? String(body.venue).trim() : 'TBD',
      city: body.city ? String(body.city).trim() : 'Kelowna',
      address: body.address || null,
      description: body.description ? String(body.description).trim() : '',
      mode: body.mode || 'day',
      sourceId: body.source || 'discord',
      source: `discord:${body.source || 'manual'}`,
      sourceUrl: body.url || null,
      status: 'approved_1',
      confidenceScore: body.confidenceScore ?? 75,
      confidenceReasons: ['Discord pipeline import'],
      imageCandidates: body.image ? [{ url: body.image, source: body.source || 'discord', selected: true }] : [],
    });

    await flushDb();
    return NextResponse.json({ ok: true, event: { id: event.id, title: event.title, status: event.status } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
