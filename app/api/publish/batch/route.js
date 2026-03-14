import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../../lib/admin-auth.js';
import {
  getPublishBatches,
  getLatestPublishBatch,
  getCurrentPublishedBatch,
  getBatchActions,
} from '../../../../lib/db.js';
import {
  generateDraftBatch,
  confirmPublish,
  rollbackBatch,
  getBatchEvents,
} from '../../../../lib/publisher.js';

export const dynamic = 'force-dynamic';

async function isAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  return await verifyAdminSessionValue(token);
}

export async function GET(request) {
  try {
    if (!await isAuthorized()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const batches = getPublishBatches();
    const latest = getLatestPublishBatch();
    const currentPublished = getCurrentPublishedBatch();
    const auditTrail = getBatchActions();

    // Hydrate events for latest and current
    const latestEvents = latest ? getBatchEvents(latest.id) : [];
    const publishedEvents = currentPublished ? getBatchEvents(currentPublished.id) : [];

    return NextResponse.json({
      batches,
      latest: latest ? { ...latest, events: latestEvents } : null,
      currentPublished: currentPublished ? { ...currentPublished, events: publishedEvents } : null,
      auditTrail: auditTrail.slice(0, 50),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!await isAuthorized()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action ?? 'generate';

    if (action === 'generate') {
      const batch = generateDraftBatch();
      const events = getBatchEvents(batch.id);
      return NextResponse.json({ ok: true, batch: { ...batch, events } }, { status: 201 });
    }

    if (action === 'publish') {
      const batchId = body?.batchId;
      if (!batchId) return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
      const batch = confirmPublish(batchId);
      const events = getBatchEvents(batch.id);
      return NextResponse.json({ ok: true, batch: { ...batch, events } });
    }

    if (action === 'rollback') {
      const batchId = body?.batchId;
      if (!batchId) return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
      const result = rollbackBatch(batchId);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
