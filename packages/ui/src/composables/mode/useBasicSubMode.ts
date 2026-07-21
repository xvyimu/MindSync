import { ref, readonly, type Ref } from 'vue'

import type { AppServices } from '../../types/services'
import { usePreferences } from '../storage/usePreferenceManager'
import { UI_SETTINGS_KEYS, type BasicSubMode } from '@mindsync/core'

interface UseBasicSubModeApi {
  basicSubMode: Ref<BasicSubMode>
  setBasicSubMode: (mode: BasicSubMode) => Promise<void>
  switchToSystem: () => Promise<void>
  switchToUser: () => Promise<void>
  ensureInitialized: () => Promise<void>
}

let singleton: {
  mode: Ref<BasicSubMode>
  initialized: boolean
  initializing: Promise<void> | null
} | null = null

/**
 * 基础模式的子模式单例
 * - 默认值为 'system'（系统提示词优化）
 * - 自动持久化
 * - 独立于上下文模式和图像模式
 */
export function useBasicSubMode(services: Ref<AppServices | null>): UseBasicSubModeApi {
  if (!singleton) {
    singleton = {
      mode: ref<BasicSubMode>('system'),
      initialized: false,
      initializing: null
    }
  }

  const { getPreference, setPreference } = usePreferences(services)

  const ensureInitialized = async () => {
    if (singleton!.initialized) return
    if (singleton!.initializing) {
      await singleton!.initializing
      return
    }

    singleton!.initializing = (async () => {
      try {
        const saved = await getPreference<BasicSubMode>(
          UI_SETTINGS_KEYS.BASIC_SUB_MODE,
          'system'
        )
        singleton!.mode.value = (saved === 'system' || saved === 'user')
          ? saved
          : 'system'

        console.log(`[useBasicSubMode] Initialization completed. Current value: ${singleton!.mode.value}`)

        // 持久化默认值（如果未设置过）
        if (saved !== 'system' && saved !== 'user') {
          await setPreference(UI_SETTINGS_KEYS.BASIC_SUB_MODE, 'system')
          console.log('[useBasicSubMode] First initialization complete. Persisted the default value: system')
        }
      } catch (e) {
        console.error('[useBasicSubMode] Failed to initialize. Falling back to the default value system:', e)
        // 读取失败则保持默认 'system'，并尝试持久化
        try {
          await setPreference(UI_SETTINGS_KEYS.BASIC_SUB_MODE, 'system')
        } catch {
          // 忽略设置失败错误
        }
      } finally {
        singleton!.initialized = true
        singleton!.initializing = null
      }
    })()

    await singleton!.initializing
  }

  const setBasicSubMode = async (mode: BasicSubMode) => {
    await ensureInitialized()
    singleton!.mode.value = mode
    await setPreference(UI_SETTINGS_KEYS.BASIC_SUB_MODE, mode)
    console.log(`[useBasicSubMode] Sub-mode switched and persisted: ${mode}`)
  }

  const switchToSystem = () => setBasicSubMode('system')
  const switchToUser = () => setBasicSubMode('user')

  return {
    basicSubMode: readonly(singleton.mode) as Ref<BasicSubMode>,
    setBasicSubMode,
    switchToSystem,
    switchToUser,
    ensureInitialized
  }
}
