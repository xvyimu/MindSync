/**
 * Optional AI-Core probe IPC (main process gateway).
 * Status never includes AI_CORE_BEARER. Default OFF when URL empty.
 */

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
  registerSensitiveIpc('ai-core-get-status', async () => {
    const { toPublicAiCoreStatus } = require('../ai-core-config');
    return safeSerialize(toPublicAiCoreStatus(getAiCoreConfig()));
  });

  registerSensitiveIpc('ai-core-probe-health', async () => {
    const config = getAiCoreConfig();
    if (!config.enabled) {
      throw createIpcError(
        'AI_CORE_DISABLED',
        'AI_CORE_URL is empty; remote AI-Core is disabled (default)',
      );
    }
    const client = getAiCoreClient();
    if (!client) {
      throw createIpcError('AI_CORE_DISABLED', 'AI-Core client is not available');
    }
    return safeSerialize(await client.health());
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
};
