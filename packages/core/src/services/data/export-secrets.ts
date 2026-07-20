/**
 * 导出时对模型配置中的敏感连接字段做脱敏（默认不含明文 Key）。
 * 与 Desktop safeStorage 互补：磁盘加密 ≠ 导出文件安全。
 */

const SENSITIVE_CONNECTION_KEYS = new Set([
  'apiKey',
  'secretAccessKey',
  'accessKeyId',
  'password',
  'token',
  'secret',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * 从单条模型配置中移除敏感字段（浅拷贝）。
 */
export function redactModelConfigSecrets<T>(config: T): T {
  if (!isRecord(config)) {
    return config;
  }
  const next: Record<string, unknown> = { ...config };
  if (typeof next.apiKey === 'string') {
    delete next.apiKey;
  }
  if (isRecord(next.connectionConfig)) {
    const conn: Record<string, unknown> = { ...next.connectionConfig };
    for (const key of SENSITIVE_CONNECTION_KEYS) {
      if (key in conn) {
        delete conn[key];
      }
    }
    next.connectionConfig = conn;
  }
  return next as T;
}

/**
 * 模型表：数组或 Record 两种 export 形态均支持。
 */
export function redactModelsExportPayload(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload.map((item) => redactModelConfigSecrets(item));
  }
  if (!isRecord(payload)) {
    return payload;
  }
  const next: Record<string, unknown> = {};
  for (const [id, config] of Object.entries(payload)) {
    next[id] = redactModelConfigSecrets(config);
  }
  return next;
}

export interface ExportAllDataOptions {
  /**
   * 是否在导出中包含模型 API Key 等敏感连接字段。
   * 默认 false（脱敏）。
   */
  includeSecrets?: boolean;
}

/**
 * 对 exportFormat `{ version, data }` 或扁平 data 对象脱敏 models / imageModels。
 */
export function redactExportDataObject(
  data: Record<string, unknown>,
  options: ExportAllDataOptions = {},
): Record<string, unknown> {
  if (options.includeSecrets) {
    return data;
  }
  const next = { ...data };
  if ('models' in next) {
    next.models = redactModelsExportPayload(next.models);
  }
  if ('imageModels' in next) {
    next.imageModels = redactModelsExportPayload(next.imageModels);
  }
  return next;
}

/**
 * 对完整导出 JSON 字符串脱敏后返回新字符串；解析失败则原样返回。
 */
export function redactExportAllDataJson(
  json: string,
  options: ExportAllDataOptions = {},
): string {
  if (options.includeSecrets) {
    return json;
  }
  try {
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed)) {
      return json;
    }
    // New format: { version, data }
    if (isRecord(parsed.data)) {
      return JSON.stringify(
        {
          ...parsed,
          data: redactExportDataObject(parsed.data, options),
        },
        null,
        2,
      );
    }
    // Flat format
    if ('models' in parsed || 'imageModels' in parsed) {
      return JSON.stringify(redactExportDataObject(parsed, options), null, 2);
    }
    return json;
  } catch {
    return json;
  }
}

/**
 * 粗检导出 JSON 是否仍含疑似明文 apiKey（用于单测，非安全保证）。
 */
export function exportJsonLooksLikeItContainsApiKeys(json: string): boolean {
  return /"apiKey"\s*:\s*"(?!__enc:v1:)[^"]+"/i.test(json);
}
