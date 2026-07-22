import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isLocalModelAdapterEnabled,
  isTruthyEnvValue,
  LOCAL_MODEL_PROVIDER_ID,
  LOCAL_MODEL_STUB_ID,
} from '../../../src/services/llm/local-model-flag';
import { LocalModelAdapter } from '../../../src/services/llm/adapters/local-model-adapter';
import { TextAdapterRegistry } from '../../../src/services/llm/adapters/registry';
import type { TextModelConfig } from '../../../src/services/llm/types';

const baseConfig = (): TextModelConfig => ({
  id: 'local-model-test',
  name: 'local-model-test',
  enabled: true,
  providerMeta: {
    id: LOCAL_MODEL_PROVIDER_ID,
    name: 'Local Model (stub)',
    description: 'test',
    requiresApiKey: false,
    defaultBaseURL: '',
    supportsDynamicModels: false,
    connectionSchema: { required: [], optional: [], fieldTypes: {} },
  },
  modelMeta: {
    id: LOCAL_MODEL_STUB_ID,
    name: 'Local Model Stub',
    description: 'test',
    providerId: LOCAL_MODEL_PROVIDER_ID,
    capabilities: { supportsTools: false, supportsReasoning: false },
    parameterDefinitions: [],
    defaultParameterValues: {},
  },
  connectionConfig: {},
  paramOverrides: {},
});

describe('local-model feature flag + stub adapter (W3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('flag defaults OFF for empty / missing env', () => {
    expect(isLocalModelAdapterEnabled({})).toBe(false);
    expect(isLocalModelAdapterEnabled({ MINDSYNC_LOCAL_MODEL_ADAPTER: '' })).toBe(false);
    expect(isLocalModelAdapterEnabled({ MINDSYNC_LOCAL_MODEL_ADAPTER: '0' })).toBe(false);
    expect(isTruthyEnvValue(undefined)).toBe(false);
  });

  it('flag accepts truthy env values on either key', () => {
    expect(isLocalModelAdapterEnabled({ MINDSYNC_LOCAL_MODEL_ADAPTER: '1' })).toBe(true);
    expect(isLocalModelAdapterEnabled({ VITE_LOCAL_MODEL_ADAPTER: 'true' })).toBe(true);
    expect(isLocalModelAdapterEnabled({ MINDSYNC_LOCAL_MODEL_ADAPTER: 'yes' })).toBe(true);
  });

  it('does not register local-model in registry when flag is OFF', () => {
    vi.stubEnv('MINDSYNC_LOCAL_MODEL_ADAPTER', '');
    const registry = new TextAdapterRegistry();
    expect(() => registry.getAdapter(LOCAL_MODEL_PROVIDER_ID)).toThrow();
    const ids = registry.getAllProviders().map((p) => p.id);
    expect(ids).not.toContain(LOCAL_MODEL_PROVIDER_ID);
  });

  it('registers local-model when flag is ON and stub returns offline text', async () => {
    vi.stubEnv('MINDSYNC_LOCAL_MODEL_ADAPTER', '1');
    const registry = new TextAdapterRegistry();
    const adapter = registry.getAdapter(LOCAL_MODEL_PROVIDER_ID);
    expect(adapter.getProvider().id).toBe(LOCAL_MODEL_PROVIDER_ID);
    expect(adapter.getProvider().requiresApiKey).toBe(false);
    expect(adapter.getModels().map((m) => m.id)).toContain(LOCAL_MODEL_STUB_ID);

    const result = await adapter.sendMessage(
      [{ role: 'user', content: 'hello-local' }],
      baseConfig(),
    );
    expect(result.content).toContain('[local-model-stub]');
    expect(result.content).toContain('hello-local');
    expect(result.metadata?.model).toBe(LOCAL_MODEL_STUB_ID);
    expect(result.metadata?.finishReason).toBe('local-model-stub');
    // No API key required / no secret fields in config path
    expect(JSON.stringify(result)).not.toMatch(/sk-|api[_-]?key/i);
  });

  it('adapter itself fail-closes when flag is OFF', async () => {
    vi.stubEnv('MINDSYNC_LOCAL_MODEL_ADAPTER', '0');
    const adapter = new LocalModelAdapter();
    await expect(
      adapter.sendMessage([{ role: 'user', content: 'x' }], baseConfig()),
    ).rejects.toThrow(/disabled/i);
  });
});
