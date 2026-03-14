import { NextResponse } from 'next/server';
import { getSources } from '../../../lib/sources.js';
import { getFetcherIds } from '../../../lib/fetchers/index.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const fetcherIds = new Set(getFetcherIds());
    const sources = getSources().map(source => ({
      ...source,
      hasFetcher: fetcherIds.has(source.id),
    }));

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      sources,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
