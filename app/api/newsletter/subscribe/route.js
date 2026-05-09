import { NextResponse } from 'next/server';
import { initDb, flushDb, upsertNewsletterSubscriber } from '../../../../lib/db.js';
import { normalizeNewsletterEmail } from '../../../../lib/newsletter-signups.mjs';

export const dynamic = 'force-dynamic';

const DEFAULT_FORWARD_EMAIL = 'sam@samzamor.com';

function getClientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || null;
}

async function forwardToFormSubmit(email, request) {
  const forwardEmail = process.env.NEWSLETTER_FORWARD_EMAIL || DEFAULT_FORWARD_EMAIL;
  if (!forwardEmail) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(forwardEmail)}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        _subject: 'New OKLetsGo newsletter signup',
        _template: 'table',
        _captcha: 'false',
        email,
        source: 'okletsgo.ca newsletter form',
        referrer: request.headers.get('referer') || '',
      }),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeNewsletterEmail(body.email);
    await initDb();

    const forwarded = await forwardToFormSubmit(email, request);
    const subscriber = upsertNewsletterSubscriber({
      email,
      source: body.source || 'homepage-newsletter',
      userAgent: request.headers.get('user-agent') || null,
      ip: getClientIp(request),
      referrer: request.headers.get('referer') || null,
      formSubmitForwarded: forwarded,
    });
    await flushDb();

    return NextResponse.json({
      ok: true,
      message: 'You’re on the list.',
      subscriber: {
        email: subscriber.email,
        createdAt: subscriber.createdAt,
        updatedAt: subscriber.updatedAt,
        formSubmitForwarded: subscriber.formSubmitForwarded,
      },
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message || 'Signup failed.' }, { status: 400 });
  }
}
