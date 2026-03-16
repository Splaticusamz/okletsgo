import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { initDb, flushDb, getEvents, updateEvent } from '../../../../lib/db.js';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../../lib/admin-auth.js';

export const dynamic = 'force-dynamic';

async function isAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  return await verifyAdminSessionValue(token);
}

/**
 * POST /api/calendar/assign
 * Body: { assignments: { "MONDAY:night": "event-id", ... } }
 *
 * Sets calendarDay and calendarMode on assigned events.
 * Clears calendarDay/calendarMode on events no longer assigned.
 */
export async function POST(request) {
  try {
    if (!await isAuthorized()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initDb();
    const body = await request.json();
    const assignments = body.assignments || {};

    // Build a map: eventId → { day, mode }
    const eventSlots = {};
    for (const [slotKey, eventId] of Object.entries(assignments)) {
      const [day, mode] = slotKey.split(':');
      if (day && mode && eventId) {
        eventSlots[eventId] = { calendarDay: day, calendarMode: mode };
      }
    }

    // Clear all existing calendar assignments
    const allEvents = getEvents();
    for (const event of allEvents) {
      if (event.calendarDay || event.calendarMode) {
        if (!eventSlots[event.id]) {
          updateEvent(event.id, { calendarDay: null, calendarMode: null });
        }
      }
    }

    // Set new assignments
    for (const [eventId, slot] of Object.entries(eventSlots)) {
      updateEvent(eventId, slot);
    }

    await flushDb();
    return NextResponse.json({ ok: true, assignedCount: Object.keys(eventSlots).length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/calendar/assign
 * Returns current calendar assignments from event calendarDay/calendarMode fields.
 */
export async function GET() {
  try {
    await initDb();
    const allEvents = getEvents();
    const assignments = {};
    for (const event of allEvents) {
      if (event.calendarDay && event.calendarMode) {
        assignments[`${event.calendarDay}:${event.calendarMode}`] = event.id;
      }
    }
    return NextResponse.json({ ok: true, assignments });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
