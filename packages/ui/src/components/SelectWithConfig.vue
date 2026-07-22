<template>
  <NSelect
    v-bind="forwardedAttrs"
    :value="normalizedValue"
    :options="mappedOptions"
    :render-label="renderOptionLabel"
    :render-tag="multiple ? renderSelectedTag : undefined"
    @update:value="onUpdateValue"
  >
    <template #empty>
      <slot name="empty">
        <NSpace vertical align="center" class="swc-empty">
          <NText depth="3">{{ emptyText || t('model.select.noAvailableModels') }}</NText>
          <NButton
            v-if="shouldShowEmptyConfigCTA"
            type="tertiary"
            size="small"
            ghost
            class="swc-config-btn"
            @click="emitConfig()"
          >
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="swc-icon" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </template>
            {{ configText || t('model.select.configure') }}
          </NButton>
        </NSpace>
      </slot>
    </template>

    <template #action>
      <slot name="action">
        <div v-if="shouldShowConfigAction" class="swc-action">
          <NButton quaternary size="small" class="swc-config-btn" @click="emitConfig()">
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="swc-icon" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </template>
            {{ configText || t('model.select.configure') }}
          </NButton>
        </div>
      </slot>
    </template>
  </NSelect>
</template>

<script setup lang="ts">
import { computed, h, useAttrs, toValue, type ComputedRef, type Ref } from 'vue'

import { useI18n } from 'vue-i18n'
import { NSelect, NSpace, NButton, NText, type SelectOption as NaiveSelectOption, type SelectFilter } from 'naive-ui'

import type { SelectOption as StandardSelectOption } from '../types/select-options'

type SelectOption = StandardSelectOption<unknown>

type OptionsSource = SelectOption[] | Ref<SelectOption[]> | ComputedRef<SelectOption[]>

interface Props {
  // Allow null so callers can intentionally clear selection.
  modelValue: string | number | Array<string | number> | null
  options: OptionsSource
  getPrimary: (opt: SelectOption) => string
  getSecondary?: (opt: SelectOption) => string
  getValue: (opt: SelectOption) => string | number
  selectedTooltip?: boolean
  showConfigAction?: boolean
  showEmptyConfigCTA?: boolean
  configText?: string
  emptyText?: string
  multiple?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  options: () => [],
  getSecondary: undefined,
  selectedTooltip: true,
  // Defaults flipped to `true` as part of the 2026-07-19 UX baseline so model
  // and template dropdowns always surface a config entry and an empty-state CTA.
  // Consumer audit at flip time (2026-07-20): every in-tree caller either wires
  // a `@config` handler (workspaces + variant selectors) or already passes both
  // props explicitly (`FunctionModelManager`), so no caller regresses. If a new
  // caller does not want the config affordance, pass `:show-config-action="false"`
  // and/or `:show-empty-config-cta="false"` explicitly.
  showConfigAction: true,
  showEmptyConfigCTA: true,
  configText: undefined,
  emptyText: undefined,
  multiple: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | Array<string | number> | null]
  'config': [payload?: Record<string, unknown>]
}>()

const attrs = useAttrs() as Record<string, unknown>
const { t } = useI18n()

// 检测是否有 config 事件处理器 - 始终显示配置按钮确保功能可用
// 动态显示配置相关功能（由父级显式开启）
const shouldShowConfigAction = computed(() => !!props.showConfigAction)
const shouldShowEmptyConfigCTA = computed(() => !!props.showEmptyConfigCTA)

// 将外部原始 options 转换为 NSelect 可识别的选项，label 为两行结构
const mappedOptions = computed(() => {
  // 使用 toValue 解包可能的 Ref，兼容直接传递 ref 或数组
  const optionsArray = toValue(props.options) || []
  return optionsArray.map((opt: SelectOption) => {
    const primary = props.getPrimary(opt) || ''
    const secondary = props.getSecondary ? (props.getSecondary(opt) || '') : ''
    const value = props.getValue(opt)
    return {
      label: primary,
      value,
      raw: opt,
      primary,
      secondary
    }
  })
})

// 使用 Naive UI 官方的 render-label 自定义选项渲染
const renderOptionLabel = (option: { primary: string; secondary: string; raw: SelectOption }) => {
  const primary = option?.primary || ''
  const secondary = option?.secondary || ''
  const title = props.selectedTooltip && secondary ? `${primary} · ${secondary}` : undefined
  return h('div', { class: 'swc-opt', title }, [
    h('div', { class: 'swc-primary' }, primary),
    secondary ? h('div', { class: 'swc-secondary' }, secondary) : null
  ])
}

// 多选 tag 渲染
const renderSelectedTag = ({
  option
}: {
  option: NaiveSelectOption & { primary?: string; secondary?: string }
  handleClose: () => void
}) => {
  const title = props.selectedTooltip && option?.secondary ? `${option.primary} · ${option.secondary}` : undefined
  return h('span', { title }, option?.primary || '')
}

// 透传属性，若无自定义 filter，则提供默认过滤（匹配主/副文本）
const forwardedAttrs = computed(() => {
  const hasCustomFilter = Object.prototype.hasOwnProperty.call(attrs, 'filter')
  const internalFilter = (pattern: string, option: { primary: string; secondary: string }) => {
    const p = (pattern || '').toLowerCase()
    return (
      (option?.primary || '').toLowerCase().includes(p) ||
      (option?.secondary || '').toLowerCase().includes(p)
    )
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ['onUpdate:value']: _, multiple: attrsMultiple, class: rootClass, ['menu-props']: menuPropsKebab, menuProps, style: rootStyle, ...rest } = attrs as Record<string, unknown>

  const normalizedMultiple =
    typeof attrsMultiple === 'boolean'
      ? attrsMultiple
      : attrsMultiple != null
        ? true
        : props.multiple

  // 规范：通过 class & menu-props.class 注入样式作用域，避免使用 :deep
  const mergedRootClass = [rootClass, 'swc-select'].filter(Boolean).join(' ')
  const mp = (menuPropsKebab || menuProps || {}) as Record<string, unknown>
  const mergedMenuClass = [mp.class, 'swc-select-menu'].filter(Boolean).join(' ')
  const normalizedMenuProps = { ...mp, class: mergedMenuClass }

  const customFilter = (attrs as Record<string, unknown>).filter
  const resolvedFilter: SelectFilter = hasCustomFilter && typeof customFilter === 'function'
    ? (customFilter as SelectFilter)
    : (internalFilter as unknown as SelectFilter)
 
  return {
    filterable: true,
    multiple: normalizedMultiple,
    class: mergedRootClass,
    style: { minWidth: '160px', ...(rootStyle as Record<string, unknown> || {}) },
    menuProps: normalizedMenuProps,
    ...rest,
    filter: resolvedFilter
  }
})

const normalizedValue = computed(() => props.modelValue)

const onUpdateValue = (val: string | number | Array<string | number> | null) => {
  emit('update:modelValue', val)
  const cb = (attrs as Record<string, unknown>)['onUpdate:value']
  if (typeof cb === 'function') cb(val)
}

const emitConfig = () => emit('config')
</script>

<style scoped>
.swc-opt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}
.swc-primary {
  font-weight: 500;
  line-height: 1.35;
}
.swc-secondary {
  font-size: 12px;
  opacity: 0.72;
  line-height: 1.3;
  white-space: normal;
}
.swc-empty {
  padding: 8px 0;
}
.swc-action {
  padding: 8px 8px;
}
.swc-config-btn {
  cursor: pointer;
}
.swc-icon {
  width: 14px;
  height: 14px;
}
</style>

<style>
/* 使用类作用域（通过 class & menu-props 注入），避免 :deep */
.swc-select-menu .n-base-select-option__content {
  white-space: normal;
  line-height: 1.35;
  display: block;
  width: 100%;
}
.swc-select-menu .n-base-select-option {
  align-items: flex-start;
  padding-top: 8px;
  padding-bottom: 8px;
  border-radius: 8px;
  transition: background-color 150ms ease, opacity 150ms ease;
}
.swc-select-menu .swc-opt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  gap: 2px;
}
.swc-select-menu .swc-primary {
  font-weight: 600;
  line-height: 1.35;
  margin-bottom: 0;
}
.swc-select-menu .swc-secondary {
  font-size: 12px;
  opacity: 0.68;
  line-height: 1.3;
  white-space: normal;
  word-break: break-word;
}
/* 选中区仅显示主行 */
.swc-select .n-base-selection .swc-secondary,
.swc-select .n-base-selection-label .swc-secondary {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .swc-select-menu .n-base-select-option {
    transition: none;
  }
}
</style>
