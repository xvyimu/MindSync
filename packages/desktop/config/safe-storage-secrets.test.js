/**
 * unit tests for Electron safeStorage codec adapter (no real Electron).
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { createElectronSafeStorageCodec } = require('./safe-storage-secrets');

test('codec reports unavailable when safeStorage missing', () => {
  const codec = createElectronSafeStorageCodec(null);
  assert.equal(codec.isAvailable(), false);
});

test('codec encrypt/decrypt round-trip with mock safeStorage', () => {
  const mock = {
    isEncryptionAvailable: () => true,
    encryptString: (plain) => Buffer.from(`ENC(${plain})`, 'utf8'),
    decryptString: (buf) => {
      const s = Buffer.from(buf).toString('utf8');
      const m = /^ENC\((.*)\)$/.exec(s);
      if (!m) throw new Error('bad payload');
      return m[1];
    },
  };
  const codec = createElectronSafeStorageCodec(mock);
  assert.equal(codec.isAvailable(), true);
  const payload = codec.encrypt('sk-test-123');
  assert.equal(typeof payload, 'string');
  assert.equal(codec.decrypt(payload), 'sk-test-123');
});

test('isAvailable false when isEncryptionAvailable throws', () => {
  const mock = {
    isEncryptionAvailable: () => {
      throw new Error('boom');
    },
  };
  const codec = createElectronSafeStorageCodec(mock);
  assert.equal(codec.isAvailable(), false);
});
