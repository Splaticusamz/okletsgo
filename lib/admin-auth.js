const COOKIE_NAME = 'oklg_admin';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function getPassword() {
  return process.env.ADMIN_PASSWORD ?? '';
}

function getSecret() {
  return process.env.ADMIN_SECRET ?? process.env.ADMIN_PASSWORD ?? '';
}

function cookieOptions(expires = new Date(Date.now() + SESSION_TTL_MS)) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  };
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function signValue(value) {
  const secret = getSecret();
  if (!secret) return '';

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`okletsgo-admin:${value}`)
  );

  return toHex(signature);
}

export function isAdminAuthConfigured() {
  return Boolean(getPassword());
}

export async function verifyAdminPassword(password) {
  if (!isAdminAuthConfigured()) return false;
  return String(password ?? '') === getPassword();
}

export async function createAdminSessionValue() {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const signature = await signValue(String(expiresAt));
  return `${expiresAt}.${signature}`;
}

export async function verifyAdminSessionValue(token) {
  if (!token || !isAdminAuthConfigured()) return false;

  const [expiresAtRaw, signature] = String(token).split('.');
  const expiresAt = Number(expiresAtRaw);

  if (!expiresAt || !signature || Number.isNaN(expiresAt)) return false;
  if (expiresAt < Date.now()) return false;

  const expected = await signValue(String(expiresAt));
  return expected === signature;
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export function getAdminSessionCookieOptions() {
  return cookieOptions();
}

export function getAdminLogoutCookieOptions() {
  return cookieOptions(new Date(0));
}

export async function isAdminRequestAuthenticated(request) {
  const token = request?.cookies?.get?.(COOKIE_NAME)?.value;
  return await verifyAdminSessionValue(token);
}
