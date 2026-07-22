const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveAiCoreConfig,
  toPublicAiCoreStatus,
} = require('./ai-core-config');

test('AI_CORE_URL empty keeps remote AI-Core disabled (default / production-safe)', () => {
  const config = resolveAiCoreConfig({});
  assert.equal(config.enabled, false);
  assert.equal(config.baseUrl, null);
  assert.equal(config.bearer, null);

  const empty = resolveAiCoreConfig({ AI_CORE_URL: '   ' });
  assert.equal(empty.enabled, false);
});

test('AI_CORE_URL loopback enables client baseUrl and optional bearer', () => {
  const config = resolveAiCoreConfig({
    AI_CORE_URL: 'http://127.0.0.1:8091/',
    AI_CORE_BEARER: 'desktop-dev-token',
  });
  assert.equal(config.enabled, true);
  assert.equal(config.baseUrl, 'http://127.0.0.1:8091');
  assert.equal(config.bearer, 'desktop-dev-token');
});

test('localhost is accepted as loopback', () => {
  const config = resolveAiCoreConfig({
    AI_CORE_URL: 'http://localhost:8091',
  });
  assert.equal(config.enabled, true);
  assert.equal(config.baseUrl, 'http://localhost:8091');
  assert.equal(config.bearer, null);
});

test('non-loopback and invalid URLs stay disabled', () => {
  assert.equal(
    resolveAiCoreConfig({ AI_CORE_URL: 'http://example.com:8091' }).enabled,
    false,
  );
  assert.equal(
    resolveAiCoreConfig({ AI_CORE_URL: 'http://example.com:8091' }).error,
    'non_loopback_host',
  );
  assert.equal(
    resolveAiCoreConfig({ AI_CORE_URL: 'not a url' }).error,
    'invalid_url',
  );
  assert.equal(
    resolveAiCoreConfig({ AI_CORE_URL: 'ftp://127.0.0.1:8091' }).error,
    'unsupported_protocol',
  );
});

test('public status never includes bearer and exposes Mode A + lastHealth + healthState', () => {
  const config = resolveAiCoreConfig({
    AI_CORE_URL: 'http://127.0.0.1:8091',
    AI_CORE_BEARER: 'secret-token-must-not-leak',
  });
  const publicStatus = toPublicAiCoreStatus(config);
  assert.deepEqual(publicStatus, {
    enabled: true,
    baseUrl: 'http://127.0.0.1:8091',
    error: null,
    distributionMode: 'A',
    lastHealth: null,
    healthState: 'not_probed',
  });
  assert.equal(JSON.stringify(publicStatus).includes('secret-token'), false);

  const withHealth = toPublicAiCoreStatus(config, {
    lastHealth: {
      ok: true,
      httpStatus: 200,
      body: { status: 'ok' },
      error: null,
      probedAt: '2026-07-23T00:00:00.000Z',
    },
  });
  assert.equal(withHealth.distributionMode, 'A');
  assert.equal(withHealth.lastHealth.ok, true);
  assert.equal(withHealth.lastHealth.httpStatus, 200);
  assert.equal(withHealth.healthState, 'ok');
});

test('healthState covers disabled / config_error / error (Mode A W3)', () => {
  const { deriveAiCoreHealthState } = require('./ai-core-config');
  assert.equal(deriveAiCoreHealthState({ enabled: false }, null), 'disabled');
  assert.equal(
    deriveAiCoreHealthState({ enabled: false, error: 'non_loopback_host' }, null),
    'config_error',
  );
  assert.equal(
    deriveAiCoreHealthState(
      { enabled: true, baseUrl: 'http://127.0.0.1:8091' },
      { ok: false, httpStatus: 500, error: 'boom', probedAt: 't' },
    ),
    'error',
  );
});
