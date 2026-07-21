import { watch, computed, reactive, type Ref } from 'vue'

import { useToast } from '../ui/useToast'
import { useI18n } from 'vue-i18n'

import type {
  HistoryStorageUsage,
  PromptRecordChain,
  PromptRecord,
} from '@mindsync/core'
import type { AppServices } from '../../types/services'

type PromptChain = PromptRecordChain

interface HistorySelectionContext {
  record: PromptRecord
  chainId: string
  rootPrompt: string
}

const DEFAULT_USAGE: HistoryStorageUsage = {
  count: 0,
  max: 50,
  nearThreshold: 40,
  warningLevel: 'ok',
}

/**
 * 提示词历史管理Hook
 * @param services 服务实例引用
 * @param prompt 提示词
 * @param optimizedPrompt 优化后的提示词
 * @param currentChainId 当前链ID
 * @param currentVersions 当前版本列表
 * @param currentVersionId 当前版本ID
 * @returns 提示词历史管理接口
 */
export function usePromptHistory(
  services: Ref<AppServices | null>,
  prompt: Ref<string>,
  optimizedPrompt: Ref<string>,
  currentChainId: Ref<string>,
  currentVersions: Ref<PromptChain['versions']>,
  currentVersionId: Ref<string>
) {
  const toast = useToast()
  const { t } = useI18n()

  // 历史记录管理器引用
  const historyManager = computed(() => services.value?.historyManager)

  // 创建一个 reactive 状态对象
  const state = reactive({
    history: [] as PromptChain[],
    showHistory: false,
    usage: { ...DEFAULT_USAGE } as HistoryStorageUsage,

    handleSelectHistory: async (context: HistorySelectionContext) => {
      try {
        const { record, chainId, rootPrompt } = context

        // 设置工作区内容
        prompt.value = rootPrompt
        optimizedPrompt.value = record.optimizedPrompt

        // 加载现有链（而不是创建新链）- 这是修复迭代断层问题的关键
        const existingChain = await historyManager.value!.getChain(chainId)

        // 恢复完整的链状态，保持版本历史连贯性
        currentChainId.value = existingChain.chainId
        currentVersions.value = existingChain.versions
        currentVersionId.value = record.id

        await refreshHistory()
        state.showHistory = false

        toast.success(t('toast.success.historyLoaded'))
      } catch (error) {
        console.error('[History] Failed to load history:', error)
        toast.error(t('toast.error.loadHistoryFailed'))
      }
    },

    handleClearHistory: async () => {
    try {
      await historyManager.value!.clearHistory()

      // 清空当前显示的内容
      prompt.value = '';
      optimizedPrompt.value = '';
      currentChainId.value = '';
      currentVersions.value = [];
      currentVersionId.value = '';

      // 立即更新历史记录，确保UI能够反映最新状态
        state.history = []
      await refreshUsage()
      toast.success(t('toast.success.historyClear'))
    } catch (error) {
      console.error(t('toast.error.clearHistoryFailed'), error)
      toast.error(t('toast.error.clearHistoryFailed'))
    }
    },

    handleDeleteChain: async (chainId: string) => {
    try {
      // 获取链中的所有记录
      const allChains = await historyManager.value!.getAllChains()
      const chain = allChains.find((c) => c.chainId === chainId)

      if (chain) {
        // 删除链中的所有记录
        for (const record of chain.versions) {
          await historyManager.value!.deleteRecord(record.id)
        }

        // 如果当前正在查看的是被删除的链，则清空当前显示
        if (currentChainId.value === chainId) {
          prompt.value = '';
          optimizedPrompt.value = '';
          currentChainId.value = '';
          currentVersions.value = [];
          currentVersionId.value = '';
        }

        // 立即更新历史记录，确保UI能够反映最新状态
        const updatedChains = await historyManager.value!.getAllChains()
          state.history = [...updatedChains]
        await refreshUsage()
        toast.success(t('toast.success.historyChainDeleted'))
      }
    } catch (error) {
      console.error(t('toast.error.historyChainDeleteFailed'), error)
      toast.error(t('toast.error.historyChainDeleteFailed'))
    }
    },

    handleSetMaxRecords: async (max: number) => {
      try {
        const mgr = historyManager.value
        if (!mgr?.setMaxRecords) {
          toast.error(t('toast.error.historyUnavailable'))
          return
        }
        const result = await mgr.setMaxRecords(max)
        await refreshHistory()
        toast.success(t('history.maxApplied', { max: result.max }))
        if (result.dropped > 0) {
          toast.warning(t('history.maxDropped', { dropped: result.dropped }))
        }
      } catch (error) {
        console.error('[History] Failed to set max records:', error)
        toast.error(error instanceof Error ? error.message : String(error))
      }
    },

    initHistory: async () => {
    try {
      await refreshHistory()
    } catch (error) {
      console.error(t('toast.error.loadHistoryFailed'), error)
      toast.error(t('toast.error.loadHistoryFailed'))
    }
  }
  })

  const refreshUsage = async () => {
    const mgr = historyManager.value
    if (!mgr?.getUsage) {
      Object.assign(state.usage, DEFAULT_USAGE)
      return
    }
    try {
      const usage = await mgr.getUsage()
      Object.assign(state.usage, usage)
    } catch (error) {
      console.warn('[History] Failed to load usage:', error)
    }
  }

  // 添加一个刷新历史记录的函数
  const refreshHistory = async () => {
    const chains = await historyManager.value!.getAllChains()
    state.history.splice(0, state.history.length, ...chains)
    await refreshUsage()
  }

  // Watch history display state
  watch(() => state.showHistory, async (newVal) => {
    if (newVal) {
      await refreshHistory()
    }
  })

  // Watch version and chain changes, update history
  watch([currentVersions, currentChainId], async () => {
    await refreshHistory()
  })

  // 监听服务实例变化，初始化历史记录
  watch(services, async () => {
    if (services.value?.historyManager) {
      await refreshHistory()
    }
  }, { immediate: true })

  return state
}
