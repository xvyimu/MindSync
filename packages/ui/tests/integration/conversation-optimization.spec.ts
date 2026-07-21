import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

const toast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  loading: vi.fn()
}

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key
    })
  }
})

vi.mock('../../src/composables/ui/useToast', () => ({
  useToast: () => toast
}))

import type { AppServices } from '../../src/types/services'
import type { Template, ConversationMessage } from '@mindsync/core'
import { useProMultiMessageSession } from '../../src/stores/session/useProMultiMessageSession'
import { createPreferenceServiceStub, createTestPinia } from '../utils/pinia-test-helpers'
import { useConversationOptimization } from '../../src/composables/prompt/useConversationOptimization'

describe('Conversation optimization (integration)', () => {
  it('optimizes selected message, applies to conversation, and persists mapping in pro-system session', async () => {
    toast.success.mockReset()
    toast.error.mockReset()
    toast.warning.mockReset()

    const preferenceSet = vi.fn(async () => {})
    const promptService = {
      optimizeMessageStream: vi.fn(async (_req: any, handlers: any) => {
        handlers.onToken('opt ')
        expect(preferenceSet).not.toHaveBeenCalled()
        handlers.onToken('msg')
        handlers.onReasoningToken('why')
        await handlers.onComplete()
      }),
      iteratePromptStream: vi.fn()
    }

    const historyManager = {
      createNewChain: vi.fn(async (recordData: any) => ({
        chainId: 'chain-pro-1',
        versions: [recordData],
        currentRecord: { id: 'v1', optimizedPrompt: recordData.optimizedPrompt }
      })),
      addIteration: vi.fn(),
      getChain: vi.fn()
    }

    const { pinia } = createTestPinia({
      promptService: promptService as any,
      historyManager: historyManager as any,
      preferenceService: createPreferenceServiceStub({
        set: preferenceSet
      })
    } as Partial<AppServices>)
    void pinia

    const proSession = useProMultiMessageSession()
    proSession.reset()

    const services = ref({
      promptService,
      historyManager
    } as unknown as AppServices)

    const conversationMessages = ref<ConversationMessage[]>([
      { id: 'm1', role: 'user', content: 'hello', originalContent: 'hello' } as any
    ])

    const optimizationMode = ref<'system' | 'user'>('system')
    const selectedOptimizeModelKey = ref('model-1')
    const selectedTemplate = ref<Template | null>({ id: 'tpl-1' } as any)
    const selectedIterateTemplate = ref<Template | null>({ id: 'tpl-iter' } as any)

    const optimizer = useConversationOptimization(
      services,
      conversationMessages as any,
      optimizationMode as any,
      selectedOptimizeModelKey,
      selectedTemplate,
      selectedIterateTemplate
    )

    await optimizer.selectMessage(conversationMessages.value[0]!)
    await optimizer.optimizeMessage()

    expect(promptService.optimizeMessageStream).toHaveBeenCalledTimes(1)
    expect(historyManager.createNewChain).toHaveBeenCalledTimes(1)

    expect(conversationMessages.value[0]!.content).toBe('opt msg')
    expect(optimizer.optimizedPrompt.value).toBe('opt msg')
    expect(optimizer.currentChainId.value).toBe('chain-pro-1')
    expect(optimizer.currentRecordId.value).toBe('v1')
    expect(optimizer.messageChainMap.value.get('m1')).toBe('chain-pro-1')

    expect(proSession.chainId).toBe('chain-pro-1')
    expect(proSession.versionId).toBe('v1')
    expect(proSession.messageChainMap).toEqual({ m1: 'chain-pro-1' })
    expect(preferenceSet).toHaveBeenCalledTimes(1)
    expect(preferenceSet).toHaveBeenCalledWith(
      'session/v1/pro-multi',
      expect.objectContaining({
        optimizedPrompt: 'opt msg',
        reasoning: 'why',
        chainId: 'chain-pro-1',
        versionId: 'v1',
        messageChainMap: { m1: 'chain-pro-1' }
      })
    )
  })

  it('saves the pro-system session after persisting an iteration version', async () => {
    toast.success.mockReset()
    toast.error.mockReset()
    toast.warning.mockReset()

    const preferenceSet = vi.fn(async () => {})
    const promptService = {
      optimizeMessageStream: vi.fn(),
      iteratePromptStream: vi.fn(async (_original: any, _last: any, _note: any, _model: any, handlers: any) => {
        handlers.onToken('next ')
        expect(preferenceSet).not.toHaveBeenCalled()
        handlers.onToken('version')
        handlers.onReasoningToken('why next')
        await handlers.onComplete()
      })
    }

    const historyManager = {
      createNewChain: vi.fn(),
      addIteration: vi.fn(async (_payload: any) => ({
        chainId: 'chain-pro-1',
        versions: [{ id: 'v1', version: 1 }, { id: 'v2', version: 2 }],
        currentRecord: { id: 'v2', optimizedPrompt: 'next version' }
      })),
      getChain: vi.fn()
    }

    const { pinia } = createTestPinia({
      promptService: promptService as any,
      historyManager: historyManager as any,
      preferenceService: createPreferenceServiceStub({
        set: preferenceSet
      })
    } as Partial<AppServices>)
    void pinia

    const proSession = useProMultiMessageSession()
    proSession.reset()

    const services = ref({
      promptService,
      historyManager
    } as unknown as AppServices)

    const conversationMessages = ref<ConversationMessage[]>([
      { id: 'm1', role: 'system', content: 'hello', originalContent: 'hello' } as any
    ])

    const optimizer = useConversationOptimization(
      services,
      conversationMessages as any,
      ref<'system' | 'user'>('system') as any,
      ref('model-1'),
      ref<Template | null>({ id: 'tpl-1' } as any),
      ref<Template | null>({ id: 'tpl-iter' } as any)
    )

    await optimizer.selectMessage(conversationMessages.value[0]!)
    optimizer.currentChainId.value = 'chain-pro-1'
    optimizer.currentRecordId.value = 'v1'
    optimizer.currentVersions.value = [{ id: 'v1', version: 1, optimizedPrompt: 'last' } as any]
    optimizer.messageChainMap.value.set('m1', 'chain-pro-1')
    proSession.setMessageChainMap({ m1: 'chain-pro-1' })

    await optimizer.iterateMessage({
      originalPrompt: 'hello',
      optimizedPrompt: 'last',
      iterateInput: 'improve'
    })

    expect(promptService.iteratePromptStream).toHaveBeenCalledTimes(1)
    expect(historyManager.addIteration).toHaveBeenCalledTimes(1)
    expect(optimizer.currentRecordId.value).toBe('v2')
    expect(preferenceSet).toHaveBeenCalledTimes(1)
    expect(preferenceSet).toHaveBeenCalledWith(
      'session/v1/pro-multi',
      expect.objectContaining({
        optimizedPrompt: 'next version',
        reasoning: 'why next',
        chainId: 'chain-pro-1',
        versionId: 'v2',
        messageChainMap: { m1: 'chain-pro-1' }
      })
    )
  })

  it('saves the pro-system session after persisting a local edit version', async () => {
    toast.success.mockReset()
    toast.error.mockReset()
    toast.warning.mockReset()

    const preferenceSet = vi.fn(async () => {})
    const historyManager = {
      createNewChain: vi.fn(),
      addIteration: vi.fn(async (_payload: any) => ({
        chainId: 'chain-pro-1',
        versions: [{ id: 'v1', version: 1 }, { id: 'v2', version: 2 }],
        currentRecord: { id: 'v2', optimizedPrompt: 'edited' }
      })),
      getChain: vi.fn()
    }

    const { pinia } = createTestPinia({
      historyManager: historyManager as any,
      preferenceService: createPreferenceServiceStub({
        set: preferenceSet
      })
    } as Partial<AppServices>)
    void pinia

    const proSession = useProMultiMessageSession()
    proSession.reset()

    const services = ref({
      historyManager
    } as unknown as AppServices)

    const conversationMessages = ref<ConversationMessage[]>([
      { id: 'm1', role: 'system', content: 'hello', originalContent: 'hello' } as any
    ])

    const optimizer = useConversationOptimization(
      services,
      conversationMessages as any,
      ref<'system' | 'user'>('system') as any,
      ref('model-1'),
      ref<Template | null>({ id: 'tpl-1' } as any),
      ref<Template | null>({ id: 'tpl-iter' } as any)
    )

    await optimizer.selectMessage(conversationMessages.value[0]!)
    optimizer.currentChainId.value = 'chain-pro-1'
    optimizer.currentRecordId.value = 'v1'
    optimizer.currentVersions.value = [{ id: 'v1', version: 1, modelKey: 'model-1', templateId: 'tpl-1' } as any]
    optimizer.optimizedPrompt.value = 'edited'
    optimizer.messageChainMap.value.set('m1', 'chain-pro-1')
    proSession.setMessageChainMap({ m1: 'chain-pro-1' })

    await optimizer.saveLocalEdit({ optimizedPrompt: 'edited', note: 'manual edit' })

    expect(historyManager.addIteration).toHaveBeenCalledTimes(1)
    expect(optimizer.currentRecordId.value).toBe('v2')
    expect(preferenceSet).toHaveBeenCalledTimes(1)
    expect(preferenceSet).toHaveBeenCalledWith(
      'session/v1/pro-multi',
      expect.objectContaining({
        optimizedPrompt: 'edited',
        chainId: 'chain-pro-1',
        versionId: 'v2',
        messageChainMap: { m1: 'chain-pro-1' }
      })
    )
  })
})
