/**
 * Minimal HTTP client for local AI-Core stub (main process only).
 * Used when AI_CORE_URL is set; does not call providers or spend LLM quota.
 */

/**
 * @typedef {import('./ai-core-config').AiCoreConfig} AiCoreConfig
 */

/**
 * @param {AiCoreConfig} config
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} [options]
 */
function createAiCoreClient(config, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 10_000;

  if (typeof fetchImpl !== 'function') {
    throw new Error('AI-Core client requires global fetch or an injected fetchImpl');
  }

  function assertEnabled() {
    if (!config || !config.enabled || !config.baseUrl) {
      const err = new Error('AI_CORE_URL is not set; remote AI-Core is disabled');
      err.code = 'AI_CORE_DISABLED';
      throw err;
    }
  }

  function buildHeaders(extra = {}) {
    const headers = { ...extra };
    if (config.bearer) {
      headers.Authorization = `Bearer ${config.bearer}`;
    }
    return headers;
  }

  /**
   * GET /health
   * @returns {Promise<{ status: number, body: any }>}
   */
  async function health() {
    assertEnabled();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${config.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      const text = await res.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = { raw: text };
      }
      return { status: res.status, body };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * POST /v1/evaluation/run (stub contract).
   * @param {Record<string, unknown>} requestBody
   * @returns {Promise<{ status: number, body: any }>}
   */
  async function runEvaluation(requestBody) {
    assertEnabled();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${config.baseUrl}/v1/evaluation/run`, {
        method: 'POST',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(requestBody ?? {}),
        signal: controller.signal,
      });
      const text = await res.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = { raw: text };
      }
      return { status: res.status, body };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    health,
    runEvaluation,
    getConfig: () => config,
  };
}

module.exports = {
  createAiCoreClient,
};
