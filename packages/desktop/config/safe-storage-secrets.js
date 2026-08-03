/**
 * Electron safeStorage 编解码适配 + 日志脱敏辅助。
 * 仅主进程使用；payload 为 encryptString 产出 Buffer 的 base64。
 *
 * 磁盘标记前缀 `__enc:v1:` 由 @mindsync/core secret-field 写入；
 * 本模块只产出/消费 payload（无前缀）。
 */

/** 与 core secret-field 对齐的敏感 connection 字段名（日志/信封脱敏用） */
const SENSITIVE_JSON_KEYS = [
  'apiKey',
  'secretAccessKey',
  'accessKeyId',
  'password',
  'token',
  'secret',
  'authorization',
  'bearer',
];

/**
 * 从任意文本中抹掉疑似密钥，避免进 console / IPC 错误信封。
 * 非安全保证：只挡常见形态；调用方仍应避免把整份 config 打进日志。
 * @param {unknown} input
 * @returns {string}
 */
function redactSecretsInText(input) {
  if (input == null) {
    return '';
  }
  let s = typeof input === 'string' ? input : String(input);

  // 先抹 header / token 形态（避免后面按 key 只吃到 Bearer 一词）
  s = s.replace(/(Bearer\s+)[A-Za-z0-9._\-+/=]{8,}/gi, '$1[REDACTED]');
  s = s.replace(
    /(Authorization\s*:\s*)(?:Bearer\s+)?[A-Za-z0-9._\-+/=]{8,}/gi,
    '$1[REDACTED]',
  );

  // JSON 形态："apiKey":"..."
  const keyAlt = SENSITIVE_JSON_KEYS.join('|');
  s = s.replace(
    new RegExp(`("(?:${keyAlt})"\\s*:\\s*")([^"]*)(")`, 'gi'),
    '$1[REDACTED]$3',
  );

  // 赋值形态：apiKey=... / apiKey: sk-...（整段值）
  s = s.replace(
    new RegExp(`\\b(?:${keyAlt})\\s*[=:]\\s*[^\\s,;}\\]]+`, 'gi'),
    (m) => m.replace(/(=\s*|:\s*).+$/, '$1[REDACTED]'),
  );

  // OpenAI 风格 sk- / sk-proj-
  s = s.replace(/\bsk-(?:proj-)?[A-Za-z0-9_\-]{8,}\b/g, 'sk-[REDACTED]');

  // 已落盘密文标记（日志无需完整 payload）
  s = s.replace(/__enc:v1:[A-Za-z0-9+/=_-]+/g, '__enc:v1:[REDACTED]');

  return s;
}

/**
 * @param {typeof import('electron').safeStorage | null | undefined} safeStorageApi
 * @returns {{ isAvailable: () => boolean, encrypt: (plain: string) => string, decrypt: (payload: string) => string }}
 */
function createElectronSafeStorageCodec(safeStorageApi) {
  const api = safeStorageApi || null;

  return {
    isAvailable() {
      try {
        return !!(
          api &&
          typeof api.isEncryptionAvailable === 'function' &&
          api.isEncryptionAvailable()
        );
      } catch {
        return false;
      }
    },
    encrypt(plain) {
      if (typeof plain !== 'string') {
        throw new Error('safeStorage.encrypt expects a string');
      }
      if (!api || typeof api.encryptString !== 'function') {
        throw new Error('safeStorage.encryptString is not available');
      }
      try {
        const buf = api.encryptString(plain);
        return Buffer.from(buf).toString('base64');
      } catch {
        // 不附带原始异常文案，避免 OS/库把明文写进 message
        throw new Error('safeStorage.encryptString failed');
      }
    },
    decrypt(payload) {
      if (typeof payload !== 'string' || payload.length === 0) {
        throw new Error('safeStorage.decrypt expects a non-empty string payload');
      }
      if (!api || typeof api.decryptString !== 'function') {
        throw new Error('safeStorage.decryptString is not available');
      }
      try {
        const buf = Buffer.from(payload, 'base64');
        if (buf.length === 0 && payload.replace(/\s/g, '').length > 0) {
          // base64 解码空但输入非空 → 非法 payload（不把 payload 写进错误）
          throw new Error('invalid payload');
        }
        return api.decryptString(buf);
      } catch {
        throw new Error('safeStorage.decryptString failed');
      }
    },
  };
}

module.exports = {
  createElectronSafeStorageCodec,
  redactSecretsInText,
  SENSITIVE_JSON_KEYS,
};
