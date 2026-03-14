import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  getAdminCookieName,
  getAdminLogoutCookieOptions,
} from '../../../../lib/admin-auth.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const cookieStore = await cookies();
  cookieStore.set(getAdminCookieName(), '', getAdminLogoutCookieOptions());

  const nextUrl = new URL('/admin/login?loggedOut=1', request.url);
  return NextResponse.redirect(nextUrl, 303);
}
