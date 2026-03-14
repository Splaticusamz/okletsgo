import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { generateAssetsForEvent } from '../../../../lib/assets.js';
import { initDb, flushDb } from '../../../../lib/db.js';
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

    await initDb();
    const body = await request.json().catch(() => ({}));
    const eventId = String(body?.eventId ?? '').trim();
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const asset = await generateAssetsForEvent(eventId, {
      regenerate: body?.regenerate === true,
      stillOnly: body?.stillOnly === true,
    });

    await flushDb();
    return NextResponse.json({ ok: true, asset });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
