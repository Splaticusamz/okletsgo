import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getActiveSources, getSourceById } from '../../../../lib/sources.js';
import { runSourceFetcher } from '../../../../lib/fetchers/index.js';
import { dedupeEvents, normalizeEvents } from '../../../../lib/normalize.js';
import { summarizeVenueEnrichment } from '../../../../lib/enrich.js';
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

    const runs = await Promise.all(sources.map((source) => runSourceFetcher(source)));
    const rawEvents = runs.flatMap((run) => run.events ?? []);
    const normalizedEvents = runs.flatMap((run) => normalizeEvents(run.events ?? [], { id: run.sourceId }));
    const { deduped, duplicates } = dedupeEvents(normalizedEvents);
    const errors = runs.flatMap((run) => (run.errors ?? []).map((message) => ({ sourceId: run.sourceId, message })));
    const venueSummary = summarizeVenueEnrichment(deduped);
    const imageCandidateCount = deduped.reduce((sum, event) => sum + (event.imageCandidateCount ?? event.imageCandidates?.length ?? 0), 0);
    const scored = deduped.filter((event) => Number.isFinite(event.confidenceScore));
    const averageConfidence = scored.length > 0
      ? Math.round(scored.reduce((sum, event) => sum + event.confidenceScore, 0) / scored.length)
      : null;

    return NextResponse.json({
      ran: runs.length,
      events: deduped,
      duplicates,
      errors,
      results: runs,
      summary: {
        rawCount: rawEvents.length,
        normalizedCount: normalizedEvents.length,
        dedupedCount: deduped.length,
        duplicateCount: duplicates.length,
        errorCount: errors.length,
        fallbackCount: runs.filter((run) => run.usedFallback).length,
        averageConfidence,
        venueSummary,
        imageCandidateCount,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
