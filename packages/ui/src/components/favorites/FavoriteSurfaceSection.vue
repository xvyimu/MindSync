<template>
  <NCard
    size="small"
    :title="title"
    :segmented="segmented"
    class="favorite-surface-section"
    :class="[
      `favorite-surface-section--${variant}`,
      {
        'favorite-surface-section--changed': changed,
        'favorite-surface-section--flush': flush,
      },
    ]"
  >
    <template v-if="$slots.headerExtra" #header-extra>
      <slot name="headerExtra" />
    </template>

    <slot />
  </NCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NCard } from 'naive-ui'

const props = withDefaults(defineProps<{
  title?: string
  changed?: boolean
  variant?: 'default' | 'identity' | 'media' | 'content'
  flush?: boolean
}>(), {
  title: undefined,
  changed: false,
  variant: 'default',
  flush: false,
})

const segmented = computed(() => (props.title ? { content: true } : false))
</script>

<style scoped>
.favorite-surface-section {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-color: color-mix(in srgb, var(--n-border-color) 76%, transparent);
  border-radius: 8px;
  box-shadow: none;
}

.favorite-surface-section--identity {
  background: color-mix(in srgb, var(--n-color) 90%, var(--n-primary-color) 10%);
}

.favorite-surface-section--media {
  background: var(--n-color);
}

.favorite-surface-section--content {
  background: var(--n-color);
}

.favorite-surface-section--changed {
  border-color: color-mix(in srgb, var(--n-warning-color) 45%, var(--n-border-color));
  box-shadow: inset 3px 0 0 var(--n-warning-color);
}

.favorite-surface-section :deep(.n-card-header) {
  min-height: 44px;
  padding: 8px 16px 8px;
}

.favorite-surface-section :deep(.n-card__content) {
  padding: 16px 16px 16px;
}

.favorite-surface-section--flush :deep(.n-card__content) {
  padding: 0;
}
</style>
