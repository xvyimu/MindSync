/**
 * Optional AI-Core probe IPC (main process gateway).
 * Status never includes AI_CORE_BEARER. Default OFF when URL empty.
 * get-status surfaces lastHealth (desktop status panel) without re-probing.
 */

/**
 * Build a public health snapshot (no secrets).
 * @param {{ status: number, body: any }|null} result
 * @param {string|null} [errorMessage]
 */
function toPublicHealthSnapshot(result, errorMessage = null) {
  const probedAt = new Date().toISOString();
  if (errorMessage) {
    return {
      ok: false,
      httpStatus: null,
      body: null,
      error: String(errorMessage).slice(0, 200),
      probedAt,
    };
  }
  const httpStatus = result && typeof result.status === 'number' ? result.status : null;
  const body = result && result.body !== undefined ? result.body : null;
  return {
    ok: httpStatus === 200,
    httpStatus,
    body,
    error: null,
    probedAt,
  };
}

/**
 * @param {object} deps
 * @param {(channel: string, handler: Function, validateArgs?: Function) => void} deps.registerSensitiveIpc
 * @param {() => import('../ai-core-config').AiCoreConfig} deps.getAiCoreConfig
 * @param {() => ReturnType<import('../ai-core-client').createAiCoreClient>|null} deps.getAiCoreClient
 * @param {Function} deps.createIpcError
 * @param {(obj: any) => any} [deps.safeSerialize]
 */
function registerAiCoreIpcHandlers({
  registerSensitiveIpc,
  getAiCoreConfig,
  getAiCoreClient,
  createIpcError,
  safeSerialize = (x) => x,
}) {
  /** @type {ReturnType<typeof toPublicHealthSnapshot>|null} */
  let lastHealth = null;

  registerSensitiveIpc('ai-core-get-status', async () => {
    const { toPublicAiCoreStatus } = require('../ai-core-config');
    return safeSerialize(toPublicAiCoreStatus(getAiCoreConfig(), { lastHealth }));
  });

  registerSensitiveIpc('ai-core-probe-health', async () => {
    const config = getAiCoreConfig();
    if (!config.enabled) {
      lastHealth = toPublicHealthSnapshot(null, 'AI_CORE_DISABLED');
      throw createIpcError(
        'AI_CORE_DISABLED',
        'AI_CORE_URL is empty; remote AI-Core is disabled (default)',
      );
    }
    const client = getAiCoreClient();
    if (!client) {
      lastHealth = toPublicHealthSnapshot(null, 'AI_CORE_DISABLED');
      throw createIpcError('AI_CORE_DISABLED', 'AI-Core client is not available');
    }
    try {
      const result = await client.health();
      lastHealth = toPublicHealthSnapshot(result);
      return safeSerialize(result);
    } catch (err) {
      lastHealth = toPublicHealthSnapshot(
        null,
        err && err.message ? err.message : 'health_probe_failed',
      );
      throw err;
    }
  });

  registerSensitiveIpc('ai-core-run-evaluation', async (_event, body) => {
    const config = getAiCoreConfig();
    if (!config.enabled) {
      throw createIpcError(
        'AI_CORE_DISABLED',
        'AI_CORE_URL is empty; remote AI-Core is disabled (default)',
      );
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw createIpcError('IPC_INVALID_ARGUMENT', 'evaluation body must be an object');
    }
    const client = getAiCoreClient();
    if (!client) {
      throw createIpcError('AI_CORE_DISABLED', 'AI-Core client is not available');
    }
    return safeSerialize(await client.runEvaluation(body));
  }, ([body]) => {
    if (body !== undefined && (body === null || typeof body !== 'object' || Array.isArray(body))) {
      throw createIpcError('IPC_INVALID_ARGUMENT', 'Invalid IPC request arguments');
    }
  });
}

module.exports = {
  registerAiCoreIpcHandlers,
  toPublicHealthSnapshot,
};
