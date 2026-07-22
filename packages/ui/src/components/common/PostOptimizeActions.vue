<template>
  <div
    v-if="show"
    class="post-optimize-cta"
    data-testid="post-optimize-cta"
    role="region"
    :aria-label="t('postOptimize.ariaLabel')"
  >
    <div class="post-optimize-cta__text">
      <NText strong>{{ t('postOptimize.title') }}</NText>
      <NText depth="3" class="post-optimize-cta__hint">{{ t('postOptimize.hint') }}</NText>
    </div>
    <NSpace :size="8" wrap>
      <NButton
        type="primary"
        size="small"
        data-testid="post-optimize-test"
        @click="$emit('test')"
      >
        {{ t('postOptimize.test') }}
      </NButton>
      <NButton
        size="small"
        secondary
        data-testid="post-optimize-evaluate"
        @click="$emit('evaluate')"
      >
        {{ t('postOptimize.evaluate') }}
      </NButton>
      <NButton
        size="small"
        secondary
        data-testid="post-optimize-favorite"
        @click="$emit('favorite')"
      >
        {{ t('postOptimize.favorite') }}
      </NButton>
      <NButton
        size="tiny"
        quaternary
        data-testid="post-optimize-dismiss"
        @click="$emit('dismiss')"
      >
        {{ t('common.close') }}
      </NButton>
    </NSpace>
  </div>
</template>

<script setup lang="ts">
import { NButton, NSpace, NText } from 'naive-ui'
import { useI18n } from 'vue-i18n'

defineProps<{
  show: boolean
}>()

defineEmits<{
  (e: 'test'): void
  (e: 'evaluate'): void
  (e: 'favorite'): void
  (e: 'dismiss'): void
}>()

const { t } = useI18n()
</script>

<style scoped>
.post-optimize-cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--n-border-color);
  background: var(--n-color-modal);
}
.post-optimize-cta__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.post-optimize-cta__hint {
  font-size: 12px;
}
</style>
