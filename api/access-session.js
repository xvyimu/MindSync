/**
 * Stateless access session for Vercel ACCESS_PASSWORD gate.
 * Cookie holds HMAC-signed payload (never the password itself).
 * Works in Node (api/auth) and Edge (middleware) via Web Crypto.
 */

export const ACCESS_COOKIE_NAME = 'po_access_session';
/** Legacy cookie that stored the raw password — never accept as valid. */
export const LEGACY_ACCESS_COOKIE_NAME = 'vercel_access_token';
export const ACCESS_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days
export const ACCESS_SESSION_VERSION = 1;

const textEncoder = new TextEncoder();

function bytesToBase64Url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < arr.length; i += 1) {
    binary += String.fromCharCode(arr[i]);
  }
  const b64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(arr).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(b64url) {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const b64 = padded + '='.repeat(padLen);
  const binary =
    typeof atob === 'function'
      ? atob(b64)
      : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function importHmacKey(password) {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function timingSafeEqualBytes(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array) || a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Create a signed session token bound to the current ACCESS_PASSWORD.
 * Rotating the password invalidates existing sessions (HMAC key changes).
 */
export async function createAccessSessionToken(password, nowSec = Math.floor(Date.now() / 1000)) {
  if (!password || typeof password !== 'string') {
    throw new Error('ACCESS_PASSWORD required to mint session');
  }
  const payload = {
    v: ACCESS_SESSION_VERSION,
    exp: nowSec + ACCESS_SESSION_MAX_AGE_SEC,
    iat: nowSec,
  };
  const payloadPart = bytesToBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(password);
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payloadPart));
  return `${payloadPart}.${bytesToBase64Url(sig)}`;
}

/**
 * Verify session token. Returns true only for valid, non-expired signatures.
 */
export async function verifyAccessSessionToken(token, password, nowSec = Math.floor(Date.now() / 1000)) {
  if (!token || !password || typeof token !== 'string' || typeof password !== 'string') {
    return false;
  }
  // Never treat the raw password (legacy cookie value) as a session.
  if (token === password) {
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }
  const [payloadPart, sigPart] = parts;
  if (!payloadPart || !sigPart) {
    return false;
  }

  try {
    const key = await importHmacKey(password);
    const expected = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, textEncoder.encode(payloadPart)),
    );
    const actual = base64UrlToBytes(sigPart);
    if (!timingSafeEqualBytes(expected, actual)) {
      return false;
    }

    const json = new TextDecoder().decode(base64UrlToBytes(payloadPart));
    const payload = JSON.parse(json);
    if (!payload || payload.v !== ACCESS_SESSION_VERSION) {
      return false;
    }
    if (typeof payload.exp !== 'number' || payload.exp < nowSec) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function buildAccessSessionCookie(token, { maxAgeSec = ACCESS_SESSION_MAX_AGE_SEC, secure = true } = {}) {
  const parts = [
    `${ACCESS_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAgeSec}`,
    'SameSite=Strict',
  ];
  if (secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function buildClearAccessSessionCookies({ secure = true } = {}) {
  const secureFlag = secure ? '; Secure' : '';
  return [
    `${ACCESS_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${secureFlag}`,
    // Clear legacy plaintext-password cookie if present
    `${LEGACY_ACCESS_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${secureFlag}`,
  ];
}

export function readCookie(cookieHeader, name) {
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return '';
  }
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return trimmed.slice(name.length + 1);
    }
  }
  return '';
}
