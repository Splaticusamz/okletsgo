import { NextResponse } from 'next/server';
import { getEvents } from '../../../lib/db.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const events = getEvents();
    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
