import { NextResponse } from 'next/server';
import { getActiveSources, getSourceById } from '../../../../lib/sources.js';
import { runSourceFetcher } from '../../../../lib/fetchers/index.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const shouldRunAll = body?.all === true;

    let sources = [];
    if (shouldRunAll) {
      sources = getActiveSources();
    } else if (body?.sourceId) {
      const source = getSourceById(body.sourceId);
      if (!source) {
        return NextResponse.json({ error: `Unknown source: ${body.sourceId}` }, { status: 404 });
      }
      sources = [source];
    } else {
      return NextResponse.json({ error: 'Provide sourceId or all:true' }, { status: 400 });
    }

    const runs = await Promise.all(sources.map(source => runSourceFetcher(source)));
    const events = runs.flatMap(run => run.events ?? []);
    const errors = runs.flatMap(run => (run.errors ?? []).map(message => ({ sourceId: run.sourceId, message })));

    return NextResponse.json({
      ran: runs.length,
      events,
      errors,
      results: runs,
      summary: {
        eventCount: events.length,
        errorCount: errors.length,
        fallbackCount: runs.filter(run => run.usedFallback).length,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
