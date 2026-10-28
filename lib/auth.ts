// Shared session-token helpers. Web Crypto only, so the same code runs in the
// edge middleware and in node route handlers.

const encoder = new TextEncoder();

async function hmacHex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const SESSION_COOKIE = 'tc_session';

export async function sessionToken(secret: string): Promise<string> {
  return hmacHex(secret, 'thingycare-session-v1');
}

export async function verifyPassword(password: string, expected: string, secret: string): Promise<boolean> {
  const a = await hmacHex(secret, password);
  const b = await hmacHex(secret, expected);
  return timingSafeEq(a, b);
}

export function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
