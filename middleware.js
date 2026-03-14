import { NextResponse } from 'next/server';
import { isAdminRequestAuthenticated } from './lib/admin-auth.js';

function isProtectedAdminPage(pathname) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function isProtectedAdminApi(pathname, method) {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  if (pathname === '/api/events/create') return true;
  if (pathname === '/api/sources/run') return true;
  if (pathname === '/api/admin/logout') return true;
  if (pathname.startsWith('/api/events/') && pathname.endsWith('/review')) return true;
  return false;
}

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;

  if (pathname === '/admin/login') {
    const authenticated = await isAdminRequestAuthenticated(request);
    if (authenticated) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  const needsAdmin = isProtectedAdminPage(pathname) || isProtectedAdminApi(pathname, request.method);
  if (!needsAdmin) return NextResponse.next();

  const authenticated = await isAdminRequestAuthenticated(request);
  if (authenticated) return NextResponse.next();

  if (isProtectedAdminApi(pathname, request.method)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
