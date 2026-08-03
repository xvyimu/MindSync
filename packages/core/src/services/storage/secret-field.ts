/**
 * 敏感字段编解码（Cut+1：Desktop safeStorage）
 *
 * 磁盘标记：`__enc:v1:<payload>`
 * - Desktop：payload = safeStorage.encryptString 的 base64
 * - Web / 无 codec：透传明文（不写标记）
 *
 * 业务层（ModelManager 等）始终看到明文 apiKey。
 */

/** 磁盘上加密字段前缀 */
export const SECRET_FIELD_PREFIX = '__enc:v1:' as const;

export interface ISecretCodec {
  /** 是否可用（Electron 主进程 + safeStorage.isEncryptionAvailable） */
  isAvailable(): boolean;
  /** 明文 → 可持久化密文 payload（不含前缀） */
  encrypt(plain: string): string;
  /** 密文 payload → 明文 */
  decrypt(payload: string): string;
}

/** 透传编解码（Web / 测试 / 不可用时） */
export class PassthroughSecretCodec implements ISecretCodec {
  isAvailable(): boolean {
    return false;
  }
  encrypt(plain: string): string {
    return plain;
  }
  decrypt(payload: string): string {
    return payload;
  }
}

export function isEncryptedSecretField(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(SECRET_FIELD_PREFIX);
}

export function wrapEncryptedSecret(payload: string): string {
  return `${SECRET_FIELD_PREFIX}${payload}`;
}

export function unwrapEncryptedSecret(value: string): string {
  if (!isEncryptedSecretField(value)) {
    throw new Error('Value is not an encrypted secret field');
  }
  return value.slice(SECRET_FIELD_PREFIX.length);
}

/**
 * 写出前：明文 apiKey → 加密标记；已加密则原样。
 * codec 不可用时保持明文（Web）。
 */
export function sealSecretField(
  value: unknown,
  codec: ISecretCodec,
): unknown {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }
  if (isEncryptedSecretField(value)) {
    return value;
  }
  if (!codec.isAvailable()) {
    return value;
  }
  const payload = codec.encrypt(value);
  return wrapEncryptedSecret(payload);
}

/**
 * 读入后：加密标记 → 明文；明文原样。
 * 解密失败时返回空串并打日志，避免整库不可读。
 */
export function openSecretField(
  value: unknown,
  codec: ISecretCodec,
): unknown {
  if (!isEncryptedSecretField(value)) {
    return value;
  }
  if (!codec.isAvailable()) {
    // 密文无法在当前环境打开（例如把 Desktop 数据拷到 Web）
    console.warn('[SecretField] Encrypted field present but codec unavailable');
    return '';
  }
  try {
    return codec.decrypt(unwrapEncryptedSecret(value));
  } catch (error) {
    // 只记错误类型，不 dump message（可能含 OS 回显的明文/密文片段）
    const tag =
      error instanceof Error
        ? error.name || 'Error'
        : typeof error === 'string'
          ? 'string'
          : 'unknown';
    console.error(`[SecretField] Failed to decrypt secret field (${tag})`);
    return '';
  }
}

const SENSITIVE_CONNECTION_KEYS = new Set(['apiKey', 'secretAccessKey', 'accessKeyId']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 对模型配置表（Record<id, config>）的 connectionConfig 敏感字段做 seal/open。
 */
export function transformModelMapSecrets(
  raw: unknown,
  mode: 'seal' | 'open',
  codec: ISecretCodec,
): unknown {
  if (!isRecord(raw)) {
    return raw;
  }
  const transform = mode === 'seal' ? sealSecretField : openSecretField;
  const next: Record<string, unknown> = {};
  for (const [id, config] of Object.entries(raw)) {
    if (!isRecord(config)) {
      next[id] = config;
      continue;
    }
    const connectionConfig = config.connectionConfig;
    if (!isRecord(connectionConfig)) {
      next[id] = config;
      continue;
    }
    let changed = false;
    const nextConn: Record<string, unknown> = { ...connectionConfig };
    for (const key of SENSITIVE_CONNECTION_KEYS) {
      if (!(key in nextConn)) continue;
      const before = nextConn[key];
      const after = transform(before, codec);
      if (after !== before) {
        nextConn[key] = after;
        changed = true;
      }
    }
    // 兼容极旧 legacy 顶层 apiKey
    let nextConfig: Record<string, unknown> = config;
    if ('apiKey' in config && !isRecord(config.connectionConfig)) {
      // already handled if connectionConfig missing - still seal top-level
    }
    if ('apiKey' in config && typeof config.apiKey === 'string') {
      const sealed = transform(config.apiKey, codec);
      if (sealed !== config.apiKey) {
        nextConfig = { ...config, apiKey: sealed };
        changed = true;
      }
    }
    if (changed || nextConn !== connectionConfig) {
      next[id] = {
        ...nextConfig,
        connectionConfig: nextConn,
      };
    } else {
      next[id] = config;
    }
  }
  return next;
}

/** 需要字段级加密的存储键 */
export const SECRET_AWARE_STORAGE_KEYS = new Set([
  'models',
  'image-models',
]);

export function shouldProtectStorageKey(key: string): boolean {
  return SECRET_AWARE_STORAGE_KEYS.has(key);
}

/**
 * 序列化写出：对 models / image-models JSON 做 seal。
 */
export function sealStorageValue(
  key: string,
  value: string,
  codec: ISecretCodec,
): string {
  if (!shouldProtectStorageKey(key) || !codec.isAvailable()) {
    return value;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    const sealed = transformModelMapSecrets(parsed, 'seal', codec);
    return JSON.stringify(sealed);
  } catch {
    return value;
  }
}

/**
 * 反序列化读入：对 models / image-models JSON 做 open。
 */
export function openStorageValue(
  key: string,
  value: string | null,
  codec: ISecretCodec,
): string | null {
  if (value == null || !shouldProtectStorageKey(key)) {
    return value;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    const opened = transformModelMapSecrets(parsed, 'open', codec);
    return JSON.stringify(opened);
  } catch {
    return value;
  }
}
