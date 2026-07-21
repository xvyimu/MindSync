import { describe, expect, it, vi } from 'vitest'
import type { TextModelConfig } from '@mindsync/core'
import { autoEnableChromeBuiltInModelIfReady } from '../../../src/utils/chrome-built-in-auto-enable'
import {
  CHROME_BUILT_IN_AUTO_ENABLE_SOURCE,
  CHROME_BUILT_IN_PROVIDER_ID
} from '@mindsync/core'

const createChromeConfig = (overrides: Partial<TextModelConfig> = {}): TextModelConfig => ({
  id: CHROME_BUILT_IN_PROVIDER_ID,
  name: 'Chrome Built-in AI',
  enabled: false,
  activationState: { userConfigured: false },
  providerMeta: {
    id: CHROME_BUILT_IN_PROVIDER_ID,
    name: 'Chrome Built-in AI',
    requiresApiKey: false,
    defaultBaseURL: '',
    supportsDynamicModels: false,
    connectionSchema: {
      required: [],
      optional: [],
      fieldTypes: {}
    }
  },
  modelMeta: {
    id: 'gemini-nano',
    name: 'Gemini Nano (managed by Chrome)',
    providerId: CHROME_BUILT_IN_PROVIDER_ID,
    capabilities: {
      supportsTools: false
    },
    parameterDefinitions: []
  },
  connectionConfig: {},
  paramOverrides: {},
  ...overrides
})

describe('chrome built-in auto enable startup sync', () => {
  it('enables pristine Chrome built-in config when the browser model is available', async () => {
    const config = createChromeConfig()
    const updateModel = vi.fn()
    const result = await autoEnableChromeBuiltInModelIfReady(
      {
        getModel: vi.fn().mockResolvedValue(config),
        updateModel
      },
      vi.fn().mockResolvedValue({ availability: 'available' })
    )

    expect(result).toEqual({ checked: true, enabled: true, status: { availability: 'available' } })
    expect(updateModel).toHaveBeenCalledWith(
      CHROME_BUILT_IN_PROVIDER_ID,
      {
        enabled: true,
        activationState: {
          userConfigured: false,
          autoEnabledBy: CHROME_BUILT_IN_AUTO_ENABLE_SOURCE
        }
      }
    )
  })

  it('does not create a session or enable when the model is only downloadable', async () => {
    const updateModel = vi.fn()
    const result = await autoEnableChromeBuiltInModelIfReady(
      {
        getModel: vi.fn().mockResolvedValue(createChromeConfig()),
        updateModel
      },
      vi.fn().mockResolvedValue({ availability: 'downloadable' })
    )

    expect(result.enabled).toBe(false)
    expect(result.status?.availability).toBe('downloadable')
    expect(updateModel).not.toHaveBeenCalled()
  })

  it('skips availability checks after the user explicitly configured the provider', async () => {
    const checkAvailability = vi.fn()
    const updateModel = vi.fn()
    const result = await autoEnableChromeBuiltInModelIfReady(
      {
        getModel: vi.fn().mockResolvedValue(createChromeConfig({
          activationState: { userConfigured: true },
          enabled: false
        })),
        updateModel
      },
      checkAvailability
    )

    expect(result).toEqual({ checked: false, enabled: false, status: null })
    expect(checkAvailability).not.toHaveBeenCalled()
    expect(updateModel).not.toHaveBeenCalled()
  })

  it('skips already enabled configs', async () => {
    const checkAvailability = vi.fn()
    const updateModel = vi.fn()
    const result = await autoEnableChromeBuiltInModelIfReady(
      {
        getModel: vi.fn().mockResolvedValue(createChromeConfig({ enabled: true })),
        updateModel
      },
      checkAvailability
    )

    expect(result.checked).toBe(false)
    expect(checkAvailability).not.toHaveBeenCalled()
    expect(updateModel).not.toHaveBeenCalled()
  })
})
