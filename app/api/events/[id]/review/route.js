import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEvent, updateEvent, addReview } from '../../../../../lib/db.js';
import { ensurePendingAssetRecord } from '../../../../../lib/assets.js';
import { transition, canTransition } from '../../../../../lib/state.js';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../../../lib/admin-auth.js';

export const dynamic = 'force-dynamic';

async function isAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  return await verifyAdminSessionValue(token);
}

export async function POST(request, { params }) {
  try {
    if (!await isAuthorized()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, stage, notes, reviewedBy, reviewer } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const event = getEvent(id);
    if (!event) {
      return NextResponse.json({ error: `Event not found: ${id}` }, { status: 404 });
    }

    if (!canTransition(event, action)) {
      return NextResponse.json(
        { error: `Cannot perform '${action}' on event with status '${event.status}'` },
        { status: 422 }
      );
    }

    const newStatus = transition(event, action);
    const review = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventId: id,
      stage: stage ?? null,
      action,
      reviewedBy: reviewedBy ?? reviewer ?? 'admin',
      reviewedAt: new Date().toISOString(),
      notes: notes ?? '',
      previousStatus: event.status,
      newStatus,
    };

    addReview(id, review);
    const updated = updateEvent(id, { status: newStatus });

    if (newStatus === 'approved_1') {
      try {
        ensurePendingAssetRecord(id);
      } catch {
        // Asset eligibility should not block the review transition.
      }
    }

    return NextResponse.json({ event: getEvent(id) ?? updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
