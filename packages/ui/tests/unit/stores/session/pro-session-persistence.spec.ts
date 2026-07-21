import { describe, it, expect, vi } from 'vitest'
import { createTestPinia } from '../../../utils/pinia-test-helpers'
import { useProMultiMessageSession } from '../../../../src/stores/session/useProMultiMessageSession'
import { useProVariableSession } from '../../../../src/stores/session/useProVariableSession'
import { TEMPLATE_SELECTION_KEYS } from '@mindsync/core'

describe('Session stores (pro) persistence', () => {
  it('pro-variable clearContent removes content and variables while preserving workspace selections', () => {
    const { pinia } = createTestPinia()
    const store = useProVariableSession(pinia)

    store.updatePrompt('prompt')
    store.updateOptimizedResult({ optimizedPrompt: 'optimized', reasoning: 'reasoning', chainId: 'chain', versionId: 'version' })
    store.updateTestContent('test input')
    store.setTemporaryVariable('topic', 'pizza')
    store.updateOptimizeModel('opt-model')
    store.updateTestModel('test-model')
    store.updateTemplate('template')
    store.updateIterateTemplate('iterate-template')
    store.setTestColumnCount(3)
    store.updateTestVariant('b', { modelKey: 'variant-model' })

    store.clearContent()

    expect(store.prompt).toBe('')
    expect(store.optimizedPrompt).toBe('')
    expect(store.reasoning).toBe('')
    expect(store.chainId).toBe('')
    expect(store.versionId).toBe('')
    expect(store.testContent).toBe('')
    expect(store.temporaryVariables).toEqual({})
    expect(store.selectedOptimizeModelKey).toBe('opt-model')
    expect(store.selectedTestModelKey).toBe('test-model')
    expect(store.selectedTemplateId).toBe('template')
    expect(store.selectedIterateTemplateId).toBe('iterate-template')
    expect(store.layout.testColumnCount).toBe(3)
    expect(store.testVariants.find((variant) => variant.id === 'b')?.modelKey).toBe('variant-model')
  })

  it('pro-multi clearContent removes conversation content while preserving workspace selections', () => {
    const { pinia } = createTestPinia()
    const store = useProMultiMessageSession(pinia)

    store.updateConversationMessages([{ id: 'm1', role: 'user', content: 'hello' }] as any)
    store.selectMessage('m1')
    store.updateOptimizedResult({ optimizedPrompt: 'optimized', reasoning: 'reasoning', chainId: 'chain', versionId: 'version' })
    store.setTemporaryVariable('topic', 'pizza')
    store.setMessageChainMap({ m1: 'chain' })
    store.updateOptimizeModel('opt-model')
    store.updateTestModel('test-model')
    store.updateTemplate('template')
    store.updateIterateTemplate('iterate-template')
    store.setTestColumnCount(4)
    store.updateTestVariant('c', { modelKey: 'variant-model' })

    store.clearContent()

    expect(store.conversationMessagesSnapshot).toEqual([])
    expect(store.selectedMessageId).toBe('')
    expect(store.optimizedPrompt).toBe('')
    expect(store.reasoning).toBe('')
    expect(store.chainId).toBe('')
    expect(store.versionId).toBe('')
    expect(store.temporaryVariables).toEqual({})
    expect(store.messageChainMap).toEqual({})
    expect(store.selectedOptimizeModelKey).toBe('opt-model')
    expect(store.selectedTestModelKey).toBe('test-model')
    expect(store.selectedTemplateId).toBe('template')
    expect(store.selectedIterateTemplateId).toBe('iterate-template')
    expect(store.layout.testColumnCount).toBe(4)
    expect(store.testVariants.find((variant) => variant.id === 'c')?.modelKey).toBe('variant-model')
  })

  it('pro-variable clearTemporaryVariables persists the cleared snapshot', async () => {
    const set = vi.fn(async () => {})

    const { pinia } = createTestPinia({
      preferenceService: {
        get: async <T,>(_key: string, defaultValue: T) => defaultValue,
        set,
        delete: async () => {},
        keys: async () => [],
        clear: async () => {},
        getAll: async () => ({}),
        exportData: async () => ({}),
        importData: async () => {},
        getDataType: async () => 'preference',
        validateData: async () => true,
      } as any
    })

    const store = useProVariableSession(pinia)
    store.setTemporaryVariable('主体', '小猫')
    set.mockClear()

    store.clearTemporaryVariables()
    await Promise.resolve()

    expect(store.temporaryVariables).toEqual({})
    expect(set).toHaveBeenCalled()

    const lastCall = set.mock.calls.at(-1)
    expect(lastCall?.[0]).toBe('session/v1/pro-variable')

    const raw = lastCall?.[1]
    const saved =
      typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw as Record<string, unknown> | undefined) || {}
    expect(saved.temporaryVariables).toEqual({})
  })

  it('pro-multi saveSession writes snapshot to preferenceService', async () => {
    const set = vi.fn(async () => {})

    const { pinia } = createTestPinia({
      preferenceService: {
        get: async <T,>(_key: string, defaultValue: T) => defaultValue,
        set,
        delete: async () => {},
        keys: async () => [],
        clear: async () => {},
        getAll: async () => ({}),
        exportData: async () => ({}),
        importData: async () => {},
        getDataType: async () => 'preference',
        validateData: async () => true,
      } as any
    })

    const store = useProMultiMessageSession(pinia)
    store.updateConversationMessages([{ id: 'm1', role: 'user', content: 'c1' }] as any)
    store.selectMessage('m1')
    store.updateOptimizedResult({ optimizedPrompt: 'o', reasoning: 'r', chainId: 'c', versionId: 'v' })
    store.setMessageChainMap({ m1: 'c' })
    store.updateTemplate('tpl')
    store.updateIterateTemplate('tpl-iter')

    await store.saveSession()

    expect(set).toHaveBeenCalled()
    const lastCall = set.mock.calls.at(-1)
    expect(lastCall?.[0]).toBe('session/v1/pro-multi')

    const raw = lastCall?.[1]
    const saved =
      typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw as Record<string, unknown> | undefined) || {}
    expect(saved).toMatchObject({
      selectedMessageId: 'm1',
      optimizedPrompt: 'o',
      reasoning: 'r',
      chainId: 'c',
      versionId: 'v',
      messageChainMap: { m1: 'c' },
      selectedTemplateId: 'tpl',
      selectedIterateTemplateId: 'tpl-iter',
    })
  })

  it('pro-variable restoreSession migrates legacy optimize/iterate templates when missing', async () => {
    const get = vi.fn(async (key: string, defaultValue: any) => {
      if (key === 'session/v1/pro-variable') return null
      if (key === TEMPLATE_SELECTION_KEYS.CONTEXT_USER_OPTIMIZE_TEMPLATE) return 'legacy-opt'
      if (key === TEMPLATE_SELECTION_KEYS.CONTEXT_ITERATE_TEMPLATE) return 'legacy-iter'
      return defaultValue
    })

    const { pinia } = createTestPinia({
      preferenceService: {
        get,
        set: async () => {},
        delete: async () => {},
        keys: async () => [],
        clear: async () => {},
        getAll: async () => ({}),
        exportData: async () => ({}),
        importData: async () => {},
        getDataType: async () => 'preference',
        validateData: async () => true,
      } as any
    })

    const store = useProVariableSession(pinia)
    await store.restoreSession()

    expect(store.selectedTemplateId).toBe('legacy-opt')
    expect(store.selectedIterateTemplateId).toBe('legacy-iter')

    // restoreSession 会读取 3 个键：
    // 1. session/v1/pro-variable
    // 2. app:selected-context-user-optimize-template (迁移)
    // 3. app:selected-context-iterate-template (迁移)
    expect(get).toHaveBeenCalledTimes(3)
    expect(get).toHaveBeenCalledWith('session/v1/pro-variable', null)
  })

  it('pro-multi restoreSession migrates legacy latest test variants to workspace', async () => {
    const get = vi.fn(async (key: string, defaultValue: any) => {
      if (key !== 'session/v1/pro-multi') return defaultValue
      return {
        conversationMessagesSnapshot: [{ id: 'm1', role: 'user', content: 'hi' }],
        selectedMessageId: 'm1',
        optimizedPrompt: 'draft',
        reasoning: '',
        chainId: '',
        versionId: '',
        messageChainMap: {},
        conversationVersionMap: {},
        conversationCurrentVersionMap: {},
        testVariants: [
          { id: 'a', version: 0, modelKey: 'm1' },
          { id: 'b', version: 'latest', modelKey: 'm2' },
          { id: 'c', version: 'latest', modelKey: 'm3' },
          { id: 'd', version: 'latest', modelKey: 'm4' },
        ],
        testVariantResults: {
          a: { result: '', reasoning: '' },
          b: { result: '', reasoning: '' },
          c: { result: '', reasoning: '' },
          d: { result: '', reasoning: '' },
        },
        testVariantLastRunFingerprint: { a: '', b: '', c: '', d: '' },
        evaluationResults: {},
        selectedTemplateId: null,
        selectedIterateTemplateId: null,
        selectedTestModelKey: '',
        selectedOptimizeModelKey: '',
        isCompareMode: true,
        lastActiveAt: Date.now(),
      }
    })

    const { pinia } = createTestPinia({
      preferenceService: {
        get,
        set: async () => {},
        delete: async () => {},
        keys: async () => [],
        clear: async () => {},
        getAll: async () => ({}),
        exportData: async () => ({}),
        importData: async () => {},
        getDataType: async () => 'preference',
        validateData: async () => true,
      } as any
    })

    const store = useProMultiMessageSession(pinia)
    await store.restoreSession()

    expect(store.testVariants.map((item) => item.version)).toEqual([0, 'workspace', 'workspace', 'workspace'])
  })

  it('uses English warnings when preferenceService is unavailable', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { pinia } = createTestPinia({
      preferenceService: undefined as any,
    })

    const proMultiStore = useProMultiMessageSession(pinia)
    await proMultiStore.saveSession()
    await proMultiStore.restoreSession()

    const proVariableStore = useProVariableSession(pinia)
    await proVariableStore.saveSession()
    await proVariableStore.restoreSession()

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[ProMultiMessageSession] PreferenceService is unavailable; cannot save session',
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[ProMultiMessageSession] PreferenceService is unavailable; cannot restore session',
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[ProVariableSession] PreferenceService is unavailable; cannot save session',
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[ProVariableSession] PreferenceService is unavailable; cannot restore session',
    )

    consoleWarnSpy.mockRestore()
  })

  it('uses English error logs when pro session persistence throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('boom')
    const { pinia } = createTestPinia({
      preferenceService: {
        get: vi.fn(async () => {
          throw error
        }),
        set: vi.fn(async () => {
          throw error
        }),
        delete: async () => {},
        keys: async () => [],
        clear: async () => {},
        getAll: async () => ({}),
        exportData: async () => ({}),
        importData: async () => {},
        getDataType: async () => 'preference',
        validateData: async () => true,
      } as any,
    })

    const proMultiStore = useProMultiMessageSession(pinia)
    await proMultiStore.saveSession()
    await proMultiStore.restoreSession()

    const proVariableStore = useProVariableSession(pinia)
    await proVariableStore.saveSession()
    await proVariableStore.restoreSession()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ProMultiMessageSession] Failed to save session:',
      error,
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ProMultiMessageSession] Failed to restore session:',
      error,
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ProVariableSession] Failed to save session:',
      error,
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ProVariableSession] Failed to restore session:',
      error,
    )

    consoleErrorSpy.mockRestore()
  })
})
