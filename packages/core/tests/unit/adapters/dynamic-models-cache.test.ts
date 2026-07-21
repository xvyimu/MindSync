import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TextAdapterRegistry } from '../../../src/services/llm/adapters/registry'
import type { TextModelConfig } from '../../../src/services/llm/types'

/**
 * Layer-4: dynamic model list cache + inflight coalesce on AbstractAdapterRegistry.
 */
describe('TextAdapterRegistry dynamic models cache', () => {
  let registry: TextAdapterRegistry

  beforeEach(() => {
    registry = new TextAdapterRegistry()
  })

  const config = {
    id: 'openai',
    name: 'OpenAI',
    enabled: true,
    providerMeta: {
      id: 'openai',
      name: 'OpenAI',
      supportsDynamicModels: true,
      requiresApiKey: true,
      defaultBaseURL: 'https://api.openai.com/v1',
    },
    modelMeta: {
      id: 'gpt-4o-mini',
      name: 'gpt-4o-mini',
      providerId: 'openai',
      capabilities: { supportsTools: true },
      parameterDefinitions: [],
    },
    connectionConfig: { apiKey: 'sk-test', baseURL: 'https://api.openai.com/v1' },
    paramOverrides: {},
  } as unknown as TextModelConfig

  it('coalesces concurrent getDynamicModels into one adapter call', async () => {
    const adapter = registry.getAdapter('openai') as any
    const spy = vi.spyOn(adapter, 'getModelsAsync').mockResolvedValue([
      {
        id: 'm1',
        name: 'm1',
        providerId: 'openai',
        capabilities: { supportsTools: false },
        parameterDefinitions: [],
      },
    ] as any)

    const [a, b] = await Promise.all([
      registry.getDynamicModels('openai', config),
      registry.getDynamicModels('openai', config),
    ])

    expect(spy).toHaveBeenCalledTimes(1)
    expect(a).toEqual(b)
  })

  it('serves second call from TTL cache without second adapter call', async () => {
    const adapter = registry.getAdapter('openai') as any
    const spy = vi.spyOn(adapter, 'getModelsAsync').mockResolvedValue([
      {
        id: 'm2',
        name: 'm2',
        providerId: 'openai',
        capabilities: { supportsTools: false },
        parameterDefinitions: [],
      },
    ] as any)

    await registry.getDynamicModels('openai', config)
    await registry.getDynamicModels('openai', config)

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does not cache failures (allows retry)', async () => {
    const adapter = registry.getAdapter('openai') as any
    const spy = vi
      .spyOn(adapter, 'getModelsAsync')
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([
        {
          id: 'm3',
          name: 'm3',
          providerId: 'openai',
          capabilities: { supportsTools: false },
          parameterDefinitions: [],
        },
      ] as any)

    await expect(registry.getDynamicModels('openai', config)).rejects.toThrow('network')
    const ok = await registry.getDynamicModels('openai', config)
    expect(ok[0].id).toBe('m3')
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
