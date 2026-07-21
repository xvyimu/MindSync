import { getBuiltinModelIds, getDefaultTextModels } from '../../../src/services/model/defaults'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

describe('model defaults provider env mapping', () => {
  const originalAnthropicApiKey = process.env.VITE_ANTHROPIC_API_KEY
  const originalCloudflareApiKey = process.env.VITE_CF_API_TOKEN
  const originalCloudflareAccountId = process.env.VITE_CF_ACCOUNT_ID
  const originalLegacyCloudflareApiKey = process.env.CF_API_TOKEN
  const originalLegacyCloudflareAccountId = process.env.CF_ACCOUNT_ID
  const originalCustomApiKey = process.env.VITE_CUSTOM_API_KEY
  const originalCustomApiBaseUrl = process.env.VITE_CUSTOM_API_BASE_URL
  const originalCustomApiModel = process.env.VITE_CUSTOM_API_MODEL
  const originalCustomApiHeaders = process.env.VITE_CUSTOM_API_HEADERS
  const originalGrokApiKey = process.env.VITE_GROK_API_KEY
  const originalXaiApiKey = process.env.VITE_XAI_API_KEY
  const originalMimoTokenPlanApiKey = process.env.VITE_MIMO_TOKEN_PLAN_API_KEY
  const originalMimoTokenPlanApiBaseUrl = process.env.VITE_MIMO_TOKEN_PLAN_API_BASE_URL
  const originalE2eVcrAllow = process.env.VITE_E2E_VCR_ALLOW_PRESETS
  const originalE2eVcrPresets = process.env.VITE_E2E_VCR_PRESETS
  const originalDeepseekApiKey = process.env.VITE_DEEPSEEK_API_KEY

  beforeEach(() => {
    delete process.env.VITE_ANTHROPIC_API_KEY
    delete process.env.VITE_CF_API_TOKEN
    delete process.env.VITE_CF_ACCOUNT_ID
    delete process.env.CF_API_TOKEN
    delete process.env.CF_ACCOUNT_ID
    delete process.env.VITE_CUSTOM_API_KEY
    delete process.env.VITE_CUSTOM_API_BASE_URL
    delete process.env.VITE_CUSTOM_API_MODEL
    delete process.env.VITE_CUSTOM_API_HEADERS
    delete process.env.VITE_GROK_API_KEY
    delete process.env.VITE_XAI_API_KEY
    delete process.env.VITE_MIMO_TOKEN_PLAN_API_KEY
    delete process.env.VITE_MIMO_TOKEN_PLAN_API_BASE_URL
    delete process.env.VITE_E2E_VCR_ALLOW_PRESETS
    delete process.env.VITE_E2E_VCR_PRESETS
    delete process.env.VITE_DEEPSEEK_API_KEY
  })

  afterAll(() => {
    if (originalAnthropicApiKey === undefined) {
      delete process.env.VITE_ANTHROPIC_API_KEY
    } else {
      process.env.VITE_ANTHROPIC_API_KEY = originalAnthropicApiKey
    }

    if (originalCloudflareApiKey === undefined) {
      delete process.env.VITE_CF_API_TOKEN
    } else {
      process.env.VITE_CF_API_TOKEN = originalCloudflareApiKey
    }

    if (originalCloudflareAccountId === undefined) {
      delete process.env.VITE_CF_ACCOUNT_ID
    } else {
      process.env.VITE_CF_ACCOUNT_ID = originalCloudflareAccountId
    }

    if (originalLegacyCloudflareApiKey === undefined) {
      delete process.env.CF_API_TOKEN
    } else {
      process.env.CF_API_TOKEN = originalLegacyCloudflareApiKey
    }

    if (originalLegacyCloudflareAccountId === undefined) {
      delete process.env.CF_ACCOUNT_ID
    } else {
      process.env.CF_ACCOUNT_ID = originalLegacyCloudflareAccountId
    }

    if (originalCustomApiKey === undefined) {
      delete process.env.VITE_CUSTOM_API_KEY
    } else {
      process.env.VITE_CUSTOM_API_KEY = originalCustomApiKey
    }

    if (originalCustomApiBaseUrl === undefined) {
      delete process.env.VITE_CUSTOM_API_BASE_URL
    } else {
      process.env.VITE_CUSTOM_API_BASE_URL = originalCustomApiBaseUrl
    }

    if (originalCustomApiModel === undefined) {
      delete process.env.VITE_CUSTOM_API_MODEL
    } else {
      process.env.VITE_CUSTOM_API_MODEL = originalCustomApiModel
    }

    if (originalCustomApiHeaders === undefined) {
      delete process.env.VITE_CUSTOM_API_HEADERS
    } else {
      process.env.VITE_CUSTOM_API_HEADERS = originalCustomApiHeaders
    }

    if (originalGrokApiKey === undefined) {
      delete process.env.VITE_GROK_API_KEY
    } else {
      process.env.VITE_GROK_API_KEY = originalGrokApiKey
    }

    if (originalXaiApiKey === undefined) {
      delete process.env.VITE_XAI_API_KEY
    } else {
      process.env.VITE_XAI_API_KEY = originalXaiApiKey
    }

    if (originalMimoTokenPlanApiKey === undefined) {
      delete process.env.VITE_MIMO_TOKEN_PLAN_API_KEY
    } else {
      process.env.VITE_MIMO_TOKEN_PLAN_API_KEY = originalMimoTokenPlanApiKey
    }

    if (originalMimoTokenPlanApiBaseUrl === undefined) {
      delete process.env.VITE_MIMO_TOKEN_PLAN_API_BASE_URL
    } else {
      process.env.VITE_MIMO_TOKEN_PLAN_API_BASE_URL = originalMimoTokenPlanApiBaseUrl
    }

    if (originalE2eVcrAllow === undefined) {
      delete process.env.VITE_E2E_VCR_ALLOW_PRESETS
    } else {
      process.env.VITE_E2E_VCR_ALLOW_PRESETS = originalE2eVcrAllow
    }

    if (originalE2eVcrPresets === undefined) {
      delete process.env.VITE_E2E_VCR_PRESETS
    } else {
      process.env.VITE_E2E_VCR_PRESETS = originalE2eVcrPresets
    }

    if (originalDeepseekApiKey === undefined) {
      delete process.env.VITE_DEEPSEEK_API_KEY
    } else {
      process.env.VITE_DEEPSEEK_API_KEY = originalDeepseekApiKey
    }
  })

  // 需求变更（钢铁铲除）：15 个厂商预设不再默认生成。
  // 它们仍出现在 getBuiltinModelIds()（身份识别用），但 getDefaultTextModels() 不再产出配置。
  const SUPPRESSED_PRESET_IDS = [
    'openai', 'gemini', 'anthropic', 'deepseek', 'siliconflow', 'zhipu',
    'dashscope', 'openrouter', 'modelscope', 'ollama', 'minimax',
    'cloudflare', 'grok', 'xiaomi-mimo-token-plan', 'chrome-built-in',
  ] as const

  it('should still list suppressed presets in builtin model ids (identity only)', () => {
    const builtinModelIds = getBuiltinModelIds()
    for (const id of SUPPRESSED_PRESET_IDS) {
      expect(builtinModelIds).toContain(id)
    }
  })

  it('should NOT generate any suppressed vendor preset by default', () => {
    const models = getDefaultTextModels()
    for (const id of SUPPRESSED_PRESET_IDS) {
      expect(models[id]).toBeUndefined()
    }
  })

  it('should NOT generate anthropic even when VITE_ANTHROPIC_API_KEY is provided', () => {
    process.env.VITE_ANTHROPIC_API_KEY = 'test-anthropic-key'
    const models = getDefaultTextModels()
    expect(models.anthropic).toBeUndefined()
  })

  it('should NOT generate cloudflare even when VITE_CF_* credentials are provided', () => {
    process.env.VITE_CF_API_TOKEN = 'test-cloudflare-token'
    process.env.VITE_CF_ACCOUNT_ID = 'test-cloudflare-account'
    const models = getDefaultTextModels()
    expect(models.cloudflare).toBeUndefined()
  })

  it('should only generate the custom preset (plus any dynamic custom models)', () => {
    const models = getDefaultTextModels()
    expect(Object.keys(models)).toEqual(['custom'])
  })

  it('should allow E2E VCR presets when VITE_E2E_VCR_ALLOW_PRESETS=1', () => {
    process.env.VITE_E2E_VCR_ALLOW_PRESETS = '1'
    process.env.VITE_E2E_VCR_PRESETS = 'deepseek'
    process.env.VITE_DEEPSEEK_API_KEY = 'vcr'
    try {
      const models = getDefaultTextModels()
      expect(models.deepseek).toBeDefined()
      expect(models.deepseek.enabled).toBe(true)
      expect(models.openai).toBeUndefined()
      expect(models.custom).toBeDefined()
    } finally {
      delete process.env.VITE_E2E_VCR_ALLOW_PRESETS
      delete process.env.VITE_E2E_VCR_PRESETS
      delete process.env.VITE_DEEPSEEK_API_KEY
    }
  })

  it('should expose the custom preset as OpenAI-compatible with chat completions but keep it disabled by default', () => {
    const models = getDefaultTextModels()

    expect(models.custom).toBeDefined()
    expect(models.custom.providerMeta.id).toBe('openai-compatible')
    expect(models.custom.providerMeta.name).toBe('OpenAI Compatible (Custom)')
    expect(models.custom.enabled).toBe(false)
    expect(models.custom.connectionConfig.apiKey).toBe('')
    expect(models.custom.connectionConfig.requestStyle).toBe('chat_completions')
  })

  it('should enable the custom preset when explicit custom connection config is provided', () => {
    process.env.VITE_CUSTOM_API_BASE_URL = 'http://localhost:11434/v1'

    const models = getDefaultTextModels()

    expect(models.custom.enabled).toBe(true)
    expect(models.custom.connectionConfig.baseURL).toBe('http://localhost:11434/v1')
  })

  it('should expose VITE_CUSTOM_API_HEADERS on the custom preset connection config', () => {
    process.env.VITE_CUSTOM_API_HEADERS = '{"x-auth-token":"gateway-token"}'

    const models = getDefaultTextModels()

    expect(models.custom.connectionConfig.customHeaders).toEqual({
      'x-auth-token': 'gateway-token'
    })
  })

  // 需求变更（钢铁铲除）：deepseek / grok / xiaomi-mimo-token-plan 均属被抑制预设，不再默认生成。
  it('should NOT generate deepseek preset by default', () => {
    const models = getDefaultTextModels()
    expect(models.deepseek).toBeUndefined()
  })

  it('should NOT generate grok preset even when VITE_XAI_API_KEY is provided', () => {
    process.env.VITE_XAI_API_KEY = 'test-xai-key'
    const models = getDefaultTextModels()
    expect(models.grok).toBeUndefined()
  })

  it('should NOT generate xiaomi-mimo-token-plan preset even with Token Plan env keys', () => {
    process.env.VITE_MIMO_TOKEN_PLAN_API_KEY = 'tp-test-key'
    process.env.VITE_MIMO_TOKEN_PLAN_API_BASE_URL = 'https://token-plan-sgp.xiaomimimo.com/v1'
    const models = getDefaultTextModels()
    expect(models['xiaomi-mimo-token-plan']).toBeUndefined()
  })
})
