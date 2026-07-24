/**
 * unit tests for Electron safeStorage codec adapter + log redaction (no real Electron).
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createElectronSafeStorageCodec,
  redactSecretsInText,
} = require('./safe-storage-secrets');

function createMockSafeStorage(overrides = {}) {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (plain) => Buffer.from(`ENC(${plain})`, 'utf8'),
    decryptString: (buf) => {
      const s = Buffer.from(buf).toString('utf8');
      const m = /^ENC\((.*)\)$/.exec(s);
      if (!m) throw new Error(`bad payload containing ${s}`);
      return m[1];
    },
    ...overrides,
  };
}

test('codec reports unavailable when safeStorage missing', () => {
  const codec = createElectronSafeStorageCodec(null);
  assert.equal(codec.isAvailable(), false);
});

test('codec reports unavailable when isEncryptionAvailable returns false', () => {
  const codec = createElectronSafeStorageCodec(
    createMockSafeStorage({ isEncryptionAvailable: () => false }),
  );
  assert.equal(codec.isAvailable(), false);
});

test('codec encrypt/decrypt round-trip with mock safeStorage', () => {
  const codec = createElectronSafeStorageCodec(createMockSafeStorage());
  assert.equal(codec.isAvailable(), true);
  const payload = codec.encrypt('sk-test-123');
  assert.equal(typeof payload, 'string');
  assert.ok(!payload.includes('sk-test-123'), 'payload must not contain plaintext');
  assert.equal(codec.decrypt(payload), 'sk-test-123');
});

test('isAvailable false when isEncryptionAvailable throws', () => {
  const codec = createElectronSafeStorageCodec(
    createMockSafeStorage({
      isEncryptionAvailable: () => {
        throw new Error('boom');
      },
    }),
  );
  assert.equal(codec.isAvailable(), false);
});

test('encrypt rejects non-string without echoing value', () => {
  const codec = createElectronSafeStorageCodec(createMockSafeStorage());
  assert.throws(() => codec.encrypt(12345), /expects a string/);
  assert.throws(() => codec.encrypt(null), /expects a string/);
});

test('encrypt when API missing throws fixed message (no plaintext)', () => {
  const codec = createElectronSafeStorageCodec(null);
  try {
    codec.encrypt('sk-super-secret-key');
    assert.fail('expected throw');
  } catch (err) {
    assert.match(String(err.message), /not available/);
    assert.ok(!String(err.message).includes('sk-super-secret-key'));
  }
});

test('encrypt wraps underlying failure without leaking plaintext', () => {
  const codec = createElectronSafeStorageCodec(
    createMockSafeStorage({
      encryptString: (plain) => {
        throw new Error(`OS refused to encrypt: ${plain}`);
      },
    }),
  );
  try {
    codec.encrypt('sk-should-not-appear');
    assert.fail('expected throw');
  } catch (err) {
    assert.match(String(err.message), /encryptString failed/);
    assert.ok(!String(err.message).includes('sk-should-not-appear'));
    assert.ok(!String(err.message).includes('OS refused'));
  }
});

test('decrypt rejects empty payload with fixed message', () => {
  const codec = createElectronSafeStorageCodec(createMockSafeStorage());
  assert.throws(() => codec.decrypt(''), /non-empty string/);
  assert.throws(() => codec.decrypt(null), /non-empty string/);
});

test('decrypt wraps underlying failure without leaking payload or plain', () => {
  const codec = createElectronSafeStorageCodec(createMockSafeStorage());
  const garbage = Buffer.from('not-enc-format').toString('base64');
  try {
    codec.decrypt(garbage);
    assert.fail('expected throw');
  } catch (err) {
    assert.match(String(err.message), /decryptString failed/);
    assert.ok(!String(err.message).includes('not-enc-format'));
    assert.ok(!String(err.message).includes(garbage));
  }
});

test('redactSecretsInText strips JSON apiKey and sk- tokens', () => {
  const raw =
    'failed model {"apiKey":"sk-live-abcdefghijklmnopqrstuvwxyz","baseURL":"https://x"} sk-proj-ABCDEFGH12345678';
  const out = redactSecretsInText(raw);
  assert.ok(out.includes('[REDACTED]'));
  assert.ok(!out.includes('sk-live-abcdefghijklmnopqrstuvwxyz'));
  assert.ok(!out.includes('sk-proj-ABCDEFGH12345678'));
  assert.ok(out.includes('https://x'), 'non-secret fields preserved');
});

test('redactSecretsInText strips Bearer and __enc markers', () => {
  const raw =
    'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaa.bbbb __enc:v1:QUJDREVGR0g=';
  const out = redactSecretsInText(raw);
  assert.ok(!out.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'));
  assert.ok(!out.includes('QUJDREVGR0g'));
  assert.ok(out.includes('Bearer [REDACTED]') || out.includes('[REDACTED]'));
  assert.ok(out.includes('__enc:v1:[REDACTED]'));
});

test('redactSecretsInText handles null/undefined', () => {
  assert.equal(redactSecretsInText(null), '');
  assert.equal(redactSecretsInText(undefined), '');
});
