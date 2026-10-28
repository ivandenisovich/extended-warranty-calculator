import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionToken, timingSafeEq } from './lib/auth';

export async function middleware(request: NextRequest) {
  const expected = await sessionToken(process.env.SESSION_SECRET || '');
  const cookie = request.cookies.get(SESSION_COOKIE)?.value ?? '';

  if (timingSafeEq(cookie, expected)) {
    return NextResponse.next();
  }

  const isApi = request.nextUrl.pathname.startsWith('/api/');
  if (isApi) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const unlockUrl = new URL('/unlock', request.url);
  unlockUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: ['/((?!unlock|api/unlock|_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
