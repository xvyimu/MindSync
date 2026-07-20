/**
 * Vercel access gate API.
 * Cookie stores an HMAC session (api/access-session.js), never ACCESS_PASSWORD.
 */

import {
  ACCESS_SESSION_MAX_AGE_SEC,
  buildAccessSessionCookie,
  buildClearAccessSessionCookies,
  createAccessSessionToken,
} from './access-session.js';

/** Best-effort per-isolate rate limit (not global across Vercel instances). */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_FAILURES = 10;
const failureBuckets = new Map();

function clientIp(req) {
  const xf = req.headers?.['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) {
    return xf.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.headers?.['x-real-ip'] || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = failureBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    return false;
  }
  return bucket.failures >= RATE_MAX_FAILURES;
}

function recordFailure(ip) {
  const now = Date.now();
  const bucket = failureBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    failureBuckets.set(ip, { failures: 1, resetAt: now + RATE_WINDOW_MS });
    return;
  }
  bucket.failures += 1;
}

function clearFailures(ip) {
  failureBuckets.delete(ip);
}

function isProduction() {
  return process.env.VERCEL_ENV === 'production'
    || process.env.NODE_ENV === 'production';
}

function setNoStore(res) {
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  setNoStore(res);
  // Same-origin SPA only — do not reflect arbitrary Origin.
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const accessPassword = process.env.ACCESS_PASSWORD;
  const secureCookie = isProduction();

  if (!accessPassword) {
    res.status(200).json({
      success: true,
      message: 'No password protection configured',
    });
    return;
  }

  if (req.method === 'POST') {
    const ip = clientIp(req);
    if (isRateLimited(ip)) {
      res.status(429).json({
        success: false,
        message: 'Too many attempts. Try again later.',
      });
      return;
    }

    const body = typeof req.body === 'string'
      ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })()
      : (req.body || {});
    const { password, action } = body;

    if (action === 'verify') {
      if (typeof password === 'string' && password === accessPassword) {
        try {
          const token = await createAccessSessionToken(accessPassword);
          res.setHeader(
            'Set-Cookie',
            buildAccessSessionCookie(token, {
              maxAgeSec: ACCESS_SESSION_MAX_AGE_SEC,
              secure: secureCookie,
            }),
          );
          clearFailures(ip);
          res.status(200).json({
            success: true,
            message: 'Authentication successful',
          });
          return;
        } catch (err) {
          console.error('[auth] failed to mint session', err?.message || err);
          res.status(500).json({
            success: false,
            message: 'Authentication failed',
          });
          return;
        }
      }

      recordFailure(ip);
      res.status(401).json({
        success: false,
        message: 'Invalid password',
      });
      return;
    }

    res.status(400).json({ success: false, message: 'Unknown action' });
    return;
  }

  if (req.method === 'GET') {
    const action = req.query?.action;
    if (action === 'logout') {
      res.setHeader('Set-Cookie', buildClearAccessSessionCookies({ secure: secureCookie }));
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
      return;
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
