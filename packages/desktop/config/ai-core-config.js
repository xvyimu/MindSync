/**
 * Optional AI-Core HTTP side-car config for Electron main.
 *
 * Env:
 * - AI_CORE_URL: empty/unset = disabled (default; production-safe)
 * - AI_CORE_BEARER: optional desktopBearer for Authorization header
 *
 * Never put production secrets in source. Bearer stays in main process only.
 */

/**
 * @typedef {object} AiCoreConfig
 * @property {boolean} enabled
 * @property {string|null} baseUrl
 * @property {string|null} bearer
 * @property {string|null} [error] — reason when URL was set but rejected
 */

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

/**
 * Normalize boolean-like env strings.
 * @param {string|undefined|null} value
 * @returns {boolean}
 */
function isTruthyEnv(value) {
  if (value === undefined || value === null) return false;
  const v = String(value).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/**
 * Resolve AI-Core connection from process env (or injected map).
 * Default empty AI_CORE_URL keeps remote evaluation off (in-process TS path).
 *
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @returns {AiCoreConfig}
 */
function resolveAiCoreConfig(env = process.env) {
  const rawUrl = (env.AI_CORE_URL || '').trim();
  const bearerRaw = (env.AI_CORE_BEARER || '').trim();
  const bearer = bearerRaw || null;

  if (!rawUrl) {
    return {
      enabled: false,
      baseUrl: null,
      bearer: null,
    };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return {
      enabled: false,
      baseUrl: null,
      bearer: null,
      error: 'invalid_url',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      enabled: false,
      baseUrl: null,
      bearer: null,
      error: 'unsupported_protocol',
    };
  }

  const host = parsed.hostname.toLowerCase();
  // Desktop flag is for local stub only (OpenAPI: loopback bind).
  if (!LOOPBACK_HOSTS.has(host)) {
    return {
      enabled: false,
      baseUrl: null,
      bearer: null,
      error: 'non_loopback_host',
    };
  }

  // Strip trailing slash; keep path prefix if any (default: origin only).
  let path = parsed.pathname || '';
  if (path === '/' || path === '') {
    path = '';
  } else {
    path = path.replace(/\/+$/, '');
  }
  const baseUrl = `${parsed.protocol}//${parsed.host}${path}`;

  return {
    enabled: true,
    baseUrl,
    bearer,
  };
}

/**
 * Public status for logs / IPC (never includes bearer).
 * @param {AiCoreConfig} config
 */
function toPublicAiCoreStatus(config) {
  return {
    enabled: Boolean(config && config.enabled),
    baseUrl: config && config.enabled ? config.baseUrl : null,
    error: config && config.error ? config.error : null,
  };
}

module.exports = {
  resolveAiCoreConfig,
  toPublicAiCoreStatus,
  isTruthyEnv,
  LOOPBACK_HOSTS,
};
