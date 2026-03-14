import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../lib/admin-auth.js';
import { getLatestNewsletterDraft, getNewsletterDrafts, getNewsletterSettings, updateNewsletterSettings } from '../../../lib/db.js';
import { buildBeehiivPayload, generateNewsletterDraft, approveNewsletterDraft, markNewsletterReadyToSend } from '../../../lib/newsletter.js';

export const dynamic = 'force-dynamic';

async function isAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  return await verifyAdminSessionValue(token);
}

export async function GET() {
  try {
    if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const latest = getLatestNewsletterDraft();
    return NextResponse.json({
      latest,
      drafts: getNewsletterDrafts().slice(0, 20),
      settings: getNewsletterSettings(),
      beehiivPayload: latest ? buildBeehiivPayload(latest) : null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const action = body.action ?? 'generate';

    if (action === 'generate') {
      const draft = generateNewsletterDraft();
      return NextResponse.json({ ok: true, draft }, { status: 201 });
    }

    if (action === 'approve') {
      if (!body.draftId) return NextResponse.json({ error: 'draftId is required' }, { status: 400 });
      return NextResponse.json({ ok: true, draft: approveNewsletterDraft(body.draftId) });
    }

    if (action === 'ready') {
      if (!body.draftId) return NextResponse.json({ error: 'draftId is required' }, { status: 400 });
      return NextResponse.json({ ok: true, draft: markNewsletterReadyToSend(body.draftId) });
    }

    if (action === 'save_settings') {
      return NextResponse.json({ ok: true, settings: updateNewsletterSettings(body.settings ?? {}) });
    }

    if (action === 'send_placeholder') {
      const latest = getLatestNewsletterDraft();
      if (!latest) return NextResponse.json({ error: 'No newsletter draft available' }, { status: 404 });
      return NextResponse.json({
        ok: false,
        status: 501,
        message: 'Beehiiv send is intentionally not wired yet. Use the exported payload + endpoint scaffold once credentials are provisioned.',
        beehiivPayload: buildBeehiivPayload(latest),
      }, { status: 501 });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
