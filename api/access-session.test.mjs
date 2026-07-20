/**
 * Unit tests for access session helpers (Node 24+ has global Web Crypto).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACCESS_COOKIE_NAME,
  LEGACY_ACCESS_COOKIE_NAME,
  createAccessSessionToken,
  verifyAccessSessionToken,
  buildAccessSessionCookie,
  buildClearAccessSessionCookies,
  readCookie,
} from './access-session.js';

const PASSWORD = 'test-access-password-ü';

test('mints a session that verifies and never equals the password', async () => {
  const token = await createAccessSessionToken(PASSWORD);
  assert.notEqual(token, PASSWORD);
  assert.equal(token.includes('.'), true);
  assert.equal(await verifyAccessSessionToken(token, PASSWORD), true);
});

test('rejects wrong password, raw password cookie, and tampered token', async () => {
  const token = await createAccessSessionToken(PASSWORD);
  assert.equal(await verifyAccessSessionToken(token, 'other'), false);
  assert.equal(await verifyAccessSessionToken(PASSWORD, PASSWORD), false);
  assert.equal(await verifyAccessSessionToken(`${token}x`, PASSWORD), false);
  const [payload] = token.split('.');
  assert.equal(await verifyAccessSessionToken(`${payload}.AAAA`, PASSWORD), false);
});

test('rejects expired sessions', async () => {
  const past = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 10;
  const token = await createAccessSessionToken(PASSWORD, past);
  assert.equal(await verifyAccessSessionToken(token, PASSWORD), false);
});

test('cookie builders use HttpOnly session name and clear legacy cookie', () => {
  const cookie = buildAccessSessionCookie('abc.def', { secure: true });
  assert.match(cookie, new RegExp(`^${ACCESS_COOKIE_NAME}=`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);

  const cleared = buildClearAccessSessionCookies({ secure: false });
  assert.equal(cleared.length, 2);
  assert.match(cleared[0], new RegExp(`${ACCESS_COOKIE_NAME}=`));
  assert.match(cleared[1], new RegExp(`${LEGACY_ACCESS_COOKIE_NAME}=`));
});

test('readCookie extracts named values', () => {
  const header = `foo=1; ${ACCESS_COOKIE_NAME}=sess.val; bar=2`;
  assert.equal(readCookie(header, ACCESS_COOKIE_NAME), 'sess.val');
  assert.equal(readCookie(header, 'missing'), '');
});
