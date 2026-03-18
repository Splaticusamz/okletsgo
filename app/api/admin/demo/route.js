import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSettings, updateSettings, initDb, flushDb } from '../../../../lib/db.js';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../../lib/admin-auth.js';

export const dynamic = 'force-dynamic';

async function isAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  return await verifyAdminSessionValue(token);
}

export async function GET() {
  try {
    if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await initDb();
    const settings = getSettings();
    return NextResponse.json({ demoMode: settings?.demoMode === true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await initDb();
    const body = await request.json().catch(() => ({}));
    const enabled = body.enabled === true;
    updateSettings({ demoMode: enabled });
    await flushDb();
    return NextResponse.json({ ok: true, demoMode: enabled });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
