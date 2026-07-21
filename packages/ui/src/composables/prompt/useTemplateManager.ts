import { reactive } from 'vue'
import type { TemplateMetadata } from '@mindsync/core'

export type TemplateManagerTemplateType = Exclude<
  TemplateMetadata['templateType'],
  | 'contextSystemOptimize'
  | 'evaluation'
  | 'variable-extraction'
  | 'variable-value-generation'
  | 'image-reference-prompt-seed-extraction'
  | 'image-prompt-composition'
  | 'image-prompt-migration'
>

export interface TemplateManagerHooks {
  showTemplates: boolean
  currentType: TemplateManagerTemplateType
  openTemplateManager: (type: TemplateManagerTemplateType) => void
  handleTemplateManagerClose: (refreshCallback?: () => void) => void
}

/**
 * TemplateManager Hook（无持久化副作用）
 *
 * Phase 1/2 迁移说明：
 * - 模板选择的持久化已迁移到各 mode 的 Session Store（单一真源）
 * - 本 hook 仅负责：
 *   1) 控制 TemplateManager Modal 展示
 *   2) 将“选择的模板对象”写入调用方提供的 refs（UI 需要）
 *
 * IMPORTANT：
 * - 禁止在此处读写 TEMPLATE_SELECTION_KEYS（避免双真源）
 */
export function useTemplateManager(
  _services: unknown
): TemplateManagerHooks {
  void _services

  const state = reactive<TemplateManagerHooks>({
    showTemplates: false,
    currentType: 'optimize',
    openTemplateManager: (type: TemplateManagerTemplateType) => {
      state.currentType = type
      state.showTemplates = true
    },
    handleTemplateManagerClose: (refreshCallback?: () => void) => {
      if (refreshCallback) refreshCallback()
      state.showTemplates = false
    },
  })

  return state
}
