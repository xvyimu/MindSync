/**
 * Electron safeStorage 编解码适配。
 * 仅主进程使用；payload 为 encryptString 产出 Buffer 的 base64。
 */

/**
 * @param {typeof import('electron').safeStorage | null | undefined} safeStorageApi
 * @returns {{ isAvailable: () => boolean, encrypt: (plain: string) => string, decrypt: (payload: string) => string }}
 */
function createElectronSafeStorageCodec(safeStorageApi) {
  const api = safeStorageApi || null;

  return {
    isAvailable() {
      try {
        return !!(api && typeof api.isEncryptionAvailable === 'function' && api.isEncryptionAvailable());
      } catch {
        return false;
      }
    },
    encrypt(plain) {
      if (!api || typeof api.encryptString !== 'function') {
        throw new Error('safeStorage.encryptString is not available');
      }
      const buf = api.encryptString(String(plain));
      return Buffer.from(buf).toString('base64');
    },
    decrypt(payload) {
      if (!api || typeof api.decryptString !== 'function') {
        throw new Error('safeStorage.decryptString is not available');
      }
      const buf = Buffer.from(String(payload), 'base64');
      return api.decryptString(buf);
    },
  };
}

module.exports = {
  createElectronSafeStorageCodec,
};
