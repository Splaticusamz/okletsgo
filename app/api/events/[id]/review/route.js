import { NextResponse } from 'next/server';
import { getEvent, updateEvent, addReview } from '../../../../../lib/db.js';
import { transition, canTransition } from '../../../../../lib/state.js';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
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

    // Build full audit record
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

    // Persist: add review + update status
    addReview(id, review);
    const updated = updateEvent(id, { status: newStatus });

    return NextResponse.json({ event: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
