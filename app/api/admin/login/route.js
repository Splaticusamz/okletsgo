import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  createAdminSessionValue,
  getAdminCookieName,
  getAdminSessionCookieOptions,
  isAdminAuthConfigured,
  verifyAdminPassword,
} from '../../../../lib/admin-auth.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const contentType = request.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await request.json().catch(() => ({}))
    : await request.formData().catch(() => null);

  const password = body?.get ? body.get('password') : body?.password;
  const next = body?.get ? body.get('next') : body?.next;
  const redirectTo = typeof next === 'string' && next.startsWith('/') ? next : '/admin';

  if (!isAdminAuthConfigured()) {
    return NextResponse.redirect(new URL('/admin/login?error=ADMIN_PASSWORD%20not%20configured', request.url), 303);
  }

  const ok = await verifyAdminPassword(password);
  if (!ok) {
    return NextResponse.redirect(new URL(`/admin/login?error=Wrong%20password&next=${encodeURIComponent(redirectTo)}`, request.url), 303);
  }

  const cookieStore = await cookies();
  cookieStore.set(getAdminCookieName(), await createAdminSessionValue(), getAdminSessionCookieOptions());

  return NextResponse.redirect(new URL(redirectTo, request.url), 303);
}
