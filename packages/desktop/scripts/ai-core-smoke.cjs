/**
 * Smoke: resolve AI_CORE_URL config and optionally hit live stub /health.
 *
 * Usage:
 *   node packages/desktop/scripts/ai-core-smoke.cjs
 *   AI_CORE_URL=http://127.0.0.1:8091 node packages/desktop/scripts/ai-core-smoke.cjs
 *   AI_CORE_URL=http://127.0.0.1:8091 AI_CORE_BEARER=dev-token node packages/desktop/scripts/ai-core-smoke.cjs --eval
 *
 * Exit 0 when disabled (default) or when live probe succeeds.
 * Exit 1 on config rejection or failed probe when URL set.
 */

const { resolveAiCoreConfig, toPublicAiCoreStatus } = require('../config/ai-core-config');
const { createAiCoreClient } = require('../config/ai-core-client');

async function main() {
  const wantEval = process.argv.includes('--eval');
  const config = resolveAiCoreConfig(process.env);
  const publicStatus = toPublicAiCoreStatus(config);

  console.log('[ai-core-smoke] status:', JSON.stringify(publicStatus));

  if (!config.enabled) {
    if (config.error) {
      console.error('[ai-core-smoke] AI_CORE_URL rejected:', config.error);
      process.exit(1);
    }
    console.log('[ai-core-smoke] AI_CORE_URL empty — remote AI-Core disabled (default). OK.');
    process.exit(0);
  }

  const client = createAiCoreClient(config);
  const health = await client.health();
  console.log('[ai-core-smoke] health:', health.status, JSON.stringify(health.body));
  if (health.status !== 200) {
    console.error('[ai-core-smoke] health failed');
    process.exit(1);
  }

  if (wantEval) {
    const body = {
      type: 'prompt-only',
      evaluationModelKey: 'openai:gpt-4o-mini',
      mode: { functionMode: 'basic', subMode: 'system' },
      target: { workspacePrompt: 'You are a helpful assistant.' },
    };
    const result = await client.runEvaluation(body);
    console.log('[ai-core-smoke] evaluation:', result.status, JSON.stringify(result.body)?.slice(0, 200));
    if (result.status !== 200) {
      console.error('[ai-core-smoke] evaluation failed');
      process.exit(1);
    }
  }

  console.log('[ai-core-smoke] OK');
  process.exit(0);
}

main().catch((err) => {
  console.error('[ai-core-smoke] error:', err && err.message ? err.message : err);
  process.exit(1);
});
