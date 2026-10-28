import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, sessionToken, timingSafeEq, verifyPassword } from '../../../lib/auth';

const UNLOCK_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: NextRequest) {
  let password: string | undefined;
  try {
    const body = (await request.json()) as { password?: string };
    password = body.password;
  } catch {
    // fallthrough to unauthorized
  }

  const expected = 'CZ2I^zh@O0&Fj1';
  const secret = process.env.SESSION_SECRET || 'insecure-dev-secret';
  if (
    !password ||
    !expected ||
    !(await verifyPassword(password, expected, secret))
  ) {
    return Response.json({ ok: false, error: 'Wrong password.' }, { status: 401 });
  }

  const token = await sessionToken(secret);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: UNLOCK_COOKIE_MAX_AGE,
  });
  return Response.json({ ok: true });
}
