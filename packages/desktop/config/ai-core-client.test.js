const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveAiCoreConfig } = require('./ai-core-config');
const { createAiCoreClient } = require('./ai-core-client');

const PROMPT_ONLY = {
  type: 'prompt-only',
  evaluationModelKey: 'openai:gpt-4o-mini',
  mode: { functionMode: 'basic', subMode: 'system' },
  target: { workspacePrompt: 'You are a helpful assistant.' },
};

test('disabled client rejects health/run without network', async () => {
  const client = createAiCoreClient(resolveAiCoreConfig({}));
  await assert.rejects(() => client.health(), (err) => {
    assert.equal(err.code, 'AI_CORE_DISABLED');
    return true;
  });
  await assert.rejects(() => client.runEvaluation(PROMPT_ONLY), (err) => {
    assert.equal(err.code, 'AI_CORE_DISABLED');
    return true;
  });
});

test('health GET hits AI_CORE_URL/health', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      status: 200,
      text: async () => JSON.stringify({ status: 'ok', service: 'ai-core' }),
    };
  };
  const client = createAiCoreClient(
    resolveAiCoreConfig({ AI_CORE_URL: 'http://127.0.0.1:8091' }),
    { fetchImpl },
  );
  const result = await client.health();
  assert.equal(result.status, 200);
  assert.equal(result.body.status, 'ok');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://127.0.0.1:8091/health');
  assert.equal(calls[0].init.method, 'GET');
});

test('runEvaluation sends bearer when AI_CORE_BEARER set', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      status: 200,
      text: async () => JSON.stringify({
        type: 'prompt-only',
        score: { overall: 0, dimensions: [] },
        summary: 'Stub evaluation',
        patchPlan: [],
      }),
    };
  };
  const client = createAiCoreClient(
    resolveAiCoreConfig({
      AI_CORE_URL: 'http://127.0.0.1:8091',
      AI_CORE_BEARER: 'test-token',
    }),
    { fetchImpl },
  );
  const result = await client.runEvaluation(PROMPT_ONLY);
  assert.equal(result.status, 200);
  assert.equal(result.body.type, 'prompt-only');
  assert.equal(calls[0].url, 'http://127.0.0.1:8091/v1/evaluation/run');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-token');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  assert.equal(JSON.parse(calls[0].init.body).type, 'prompt-only');
});

test('runEvaluation omits Authorization when bearer unset', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      status: 401,
      text: async () => JSON.stringify({ detail: 'missing bearer' }),
    };
  };
  const client = createAiCoreClient(
    resolveAiCoreConfig({ AI_CORE_URL: 'http://127.0.0.1:8091' }),
    { fetchImpl },
  );
  const result = await client.runEvaluation(PROMPT_ONLY);
  assert.equal(result.status, 401);
  assert.equal(calls[0].init.headers.Authorization, undefined);
});
