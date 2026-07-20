<template>
  <NSelect
    class="template-select"
    :class="{ 'template-select--ready': isReady }"
    :value="modelValue?.id || null"
    :options="selectOptions"
    :placeholder="t('template.select')"
    :loading="!isReady"
    :render-label="renderOptionLabel"
    :filter="filterOption"
    filterable
    size="medium"
    :menu-props="{ class: 'template-select-menu' }"
    @update:value="handleTemplateSelect"
    @focus="handleFocus"
  >
    <template #empty>
      <NSpace vertical align="center" class="template-select-empty">
        <NText depth="3" class="template-select-empty__text">
          {{ t('template.noAvailableTemplates') }}
        </NText>
        <NButton
          type="tertiary"
          size="small"
          ghost
          class="template-select-empty__cta"
          @click="$emit('manage', props.type)"
        >
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="template-select-icon" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 7.125L18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </template>
          {{ t('template.configure') }}
        </NButton>
      </NSpace>
    </template>

    <template #action>
      <div class="template-select-action">
        <NButton quaternary size="small" class="template-select-action__btn" @click="$emit('manage', props.type)">
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="template-select-icon" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </template>
          {{ t('template.configure') }}
        </NButton>
      </div>
    </template>
  </NSelect>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, h, type Ref, type VNode } from 'vue'

import { useI18n } from 'vue-i18n'
import {
  NSelect,
  NButton,
  NSpace,
  NText,
  type SelectFilter,
  type SelectOption as NaiveSelectOption,
} from 'naive-ui'
import type { OptimizationMode, Template, TemplateMetadata } from '@prompt-optimizer/core'
import type { AppServices } from '../types/services'

const { t } = useI18n()

type TemplateType = TemplateMetadata['templateType'];

/** Menu option shape. Keep compatible with Naive SelectBaseOption for filter/render-label. */
interface TemplateSelectOption extends NaiveSelectOption {
  value: string
  label: string
  /** Present on our mapped options; not required by Naive's SelectFilter input. */
  type?: 'template' | 'config'
  template?: Template
  isBuiltin?: boolean
  description?: string
  primary?: string
  secondary?: string
}

const props = defineProps({
  modelValue: {
    type: Object as () => Template | null,
    default: null
  },
  type: {
    type: String as () => TemplateType,
    required: true,
    validator: (value: string): boolean => (
      ['optimize', 'userOptimize', 'text2imageOptimize', 'image2imageOptimize', 'multiimageOptimize', 'imageIterate', 'iterate', 'conversationMessageOptimize', 'contextUserOptimize', 'contextIterate'] as string[]
    ).includes(value)
  },
  optimizationMode: {
    type: String as () => OptimizationMode,
    required: true
  },
})

const emit = defineEmits<{
  'update:modelValue': [template: Template | null]
  'manage': [type: TemplateType]
  'select': [template: Template, showToast?: boolean]
}>()

const isReady = ref(false)

const services = inject<Ref<AppServices | null>>('services')
if (!services) {
  throw new Error('[TemplateSelect] Services were not injected correctly. Make sure App provides the services instance.')
}

const templateManager = computed(() => {
  const servicesValue = services.value
  if (!servicesValue) {
    throw new Error('[TemplateSelect] Services are not initialized. Make sure the application has started correctly.')
  }

  const manager = servicesValue.templateManager
  if (!manager) {
    throw new Error('[TemplateSelect] TemplateManager is not initialized. Make sure the service is configured correctly.')
  }

  return manager
})

const selectOptions = computed<TemplateSelectOption[]>(() => {
  return templates.value.map(template => {
    const description = template.metadata.description || t('template.noDescription')
    const badge = template.isBuiltin ? t('common.builtin') : t('common.custom')
    return {
      label: template.name,
      value: template.id,
      template,
      isBuiltin: template.isBuiltin,
      description,
      type: 'template' as const,
      primary: template.name,
      secondary: `${badge} · ${description}`
    }
  })
})

const renderOptionLabel = (option: NaiveSelectOption, selected: boolean): VNode => {
  const opt = option as TemplateSelectOption
  const primary = String(opt.primary || opt.label || '')
  const secondary = String(opt.secondary || opt.description || '')
  const title = secondary ? `${primary} · ${secondary}` : primary

  return h('div', {
    class: [
      'template-select-opt',
      selected ? 'template-select-opt--selected' : null,
      opt.isBuiltin ? 'template-select-opt--builtin' : 'template-select-opt--custom'
    ],
    title
  }, [
    h('div', { class: 'template-select-opt__primary' }, primary),
    secondary
      ? h('div', { class: 'template-select-opt__secondary' }, secondary)
      : null
  ])
}

// Match SelectWithConfig: implement against our fields, expose as Naive SelectFilter.
const filterOption = ((pattern: string, option: TemplateSelectOption): boolean => {
  const p = (pattern || '').toLowerCase()
  if (!p) return true
  return (
    (option.primary || String(option.label || '')).toLowerCase().includes(p) ||
    (option.secondary || option.description || '').toLowerCase().includes(p)
  )
}) as SelectFilter

const handleTemplateSelect = (value: string | null) => {
  if (value === '__config__') {
    emit('manage', props.type)
    return
  }

  const template = templates.value.find(t => t.id === value) || null
  if (template && template.id !== props.modelValue?.id) {
    emit('update:modelValue', template)
    emit('select', template, true)
  }
}

const handleFocus = async () => {
  if (!isReady.value) {
    await ensureTemplateManagerReady()
    await loadTemplatesByType()
  }
}

const ensureTemplateManagerReady = async () => {
  isReady.value = true
  return true
}

const templates = ref<Template[]>([])

const loadTemplatesByType = async () => {
  if (!isReady.value || !templateManager.value) {
    // Soft-fail: empty list rather than hard-throw from watchers (typecheck + UX).
    templates.value.splice(0, templates.value.length)
    return
  }

  try {
    const typeTemplates = await templateManager.value.listTemplatesByType(props.type)
    templates.value.splice(0, templates.value.length, ...typeTemplates)
  } catch (error) {
    console.error('[TemplateSelect] Failed to load templates:', error)
    templates.value.splice(0, templates.value.length)
  }
}

watch(
  () => services.value?.templateManager,
  async (newTemplateManager) => {
    if (newTemplateManager) {
      await ensureTemplateManagerReady()
      await loadTemplatesByType()
    } else {
      isReady.value = false
      templates.value.splice(0, templates.value.length)
      // Do not throw from watch — leave empty until services recover.
    }
  },
  { immediate: true, deep: true }
)

watch(
  () => props.type,
  async () => {
    if (isReady.value) {
      await loadTemplatesByType()
    }
  }
)

watch(
  () => props.optimizationMode,
  (newOptimizationMode, oldOptimizationMode) => {
    if (newOptimizationMode !== oldOptimizationMode) {
      refreshTemplates()
    }
  }
)

watch(
  templates,
  (newTemplates) => {
    const currentTemplate = props.modelValue
    if (currentTemplate && !newTemplates.find(t => t.id === currentTemplate.id)) {
      const firstTemplate = newTemplates.find(t => t.metadata.templateType === props.type) || null
      if (firstTemplate && firstTemplate.id !== currentTemplate?.id) {
        emit('update:modelValue', firstTemplate)
        emit('select', firstTemplate, false)
      }
    }
  },
  { deep: true }
)

const deepCompareTemplateContent = (content1: string | Array<{role: string; content: string}>, content2: string | Array<{role: string; content: string}>): boolean => {
  if (typeof content1 !== typeof content2) {
    return false
  }

  if (typeof content1 === 'string') {
    return content1 === content2
  }

  if (Array.isArray(content1) && Array.isArray(content2)) {
    if (content1.length !== content2.length) {
      return false
    }

    return content1.every((item1, index) => {
      const item2 = content2[index]
      return item1.role === item2.role && item1.content === item2.content
    })
  }

  return JSON.stringify(content1) === JSON.stringify(content2)
}

const refreshTemplates = async () => {
  try {
    await loadTemplatesByType()

    const currentTemplate = props.modelValue
    if (currentTemplate && currentTemplate.isBuiltin) {
      try {
        const updatedTemplate = await templateManager.value?.getTemplate(currentTemplate.id)
        if (updatedTemplate && deepCompareTemplateContent(updatedTemplate.content, currentTemplate.content) === false) {
          emit('update:modelValue', updatedTemplate)
          emit('select', updatedTemplate, false)
        }
      } catch (error) {
        console.warn('[TemplateSelect] Failed to get updated template:', error)
        const availableTemplates = templates.value.filter(t => t.metadata.templateType === props.type)
        if (availableTemplates.length > 0) {
          emit('update:modelValue', availableTemplates[0])
          emit('select', availableTemplates[0], false)
        }
      }
    }
  } catch (error) {
    console.error('[TemplateSelect] Failed to refresh templates:', error)
  }
}

defineExpose({
  refresh: refreshTemplates
})
</script>

<style scoped>
.template-select {
  min-width: 160px;
  transition: opacity 150ms ease;
}

.template-select-empty {
  padding: 12px 0;
}

.template-select-empty__text {
  text-align: center;
}

.template-select-empty__cta,
.template-select-action__btn {
  cursor: pointer;
}

.template-select-icon {
  width: 14px;
  height: 14px;
}

.template-select-action {
  padding: 8px 12px;
}
</style>

<style>
/* Menu is teleported; scope via menu-props.class (same pattern as SelectWithConfig). */
.template-select-menu .n-base-select-option__content {
  white-space: normal;
  line-height: 1.35;
  display: block;
  width: 100%;
}

.template-select-menu .n-base-select-option {
  align-items: flex-start;
  padding-top: 8px;
  padding-bottom: 8px;
  border-radius: 8px;
  transition: background-color 150ms ease, opacity 150ms ease;
}

.template-select-menu .template-select-opt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  gap: 2px;
}

.template-select-menu .template-select-opt__primary {
  font-weight: 600;
  line-height: 1.35;
  color: var(--n-text-color);
}

.template-select-menu .template-select-opt__secondary {
  font-size: 12px;
  line-height: 1.3;
  opacity: 0.68;
  white-space: normal;
  word-break: break-word;
  color: var(--n-text-color-3, inherit);
}

/* Selected value in trigger: primary only */
.template-select .n-base-selection .template-select-opt__secondary,
.template-select .n-base-selection-label .template-select-opt__secondary {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .template-select,
  .template-select-menu .n-base-select-option {
    transition: none;
  }
}
</style>
