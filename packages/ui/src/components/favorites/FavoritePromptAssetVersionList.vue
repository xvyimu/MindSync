<template>
  <div
    v-if="versionEntries.length > 0"
    class="favorite-prompt-asset-version-list"
    data-testid="favorite-prompt-asset-version-list"
  >
    <div
      v-for="version in versionEntries"
      :key="version.id"
      class="favorite-prompt-asset-version-list__item"
      :class="{
        'is-current': version.id === currentVersionId,
      }"
      :data-testid="`favorite-prompt-asset-version-${version.version}`"
    >
      <button
        type="button"
        class="favorite-prompt-asset-version-list__main"
        :data-testid="`favorite-prompt-asset-version-view-${version.version}`"
        @click="$emit('view-version', version)"
      >
        <NSpace :size="6" align="center" wrap>
          <NText strong>{{ t('favorites.version.itemLabel', { version: version.version }) }}</NText>
          <NTag
            v-if="version.id === currentVersionId"
            size="small"
            type="success"
            :bordered="false"
          >
            {{ t('favorites.version.current') }}
          </NTag>
          <NText depth="3" class="favorite-prompt-asset-version-list__date">
            {{ t('favorites.version.createdAt', { time: formatVersionDate(version.createdAt) }) }}
          </NText>
          <NText
            v-if="version.updatedAt && version.updatedAt !== version.createdAt"
            depth="3"
            class="favorite-prompt-asset-version-list__date"
          >
            {{ t('favorites.version.updatedAt', { time: formatVersionDate(version.updatedAt) }) }}
          </NText>
        </NSpace>

        <NText depth="3" class="favorite-prompt-asset-version-list__preview">
          {{ promptContentVersionPreview(version) || t('favorites.version.emptyPreview') }}
        </NText>
      </button>

      <NSpace
        v-if="showSetCurrentActions || showDeleteActions"
        :size="6"
        class="favorite-prompt-asset-version-list__actions"
        @click.stop
      >
        <NButton
          v-if="showSetCurrentActions && version.id !== currentVersionId"
          size="tiny"
          type="primary"
          :loading="busyVersionId === version.id"
          data-testid="favorite-prompt-asset-version-set-current"
          @click="$emit('set-current-version', version)"
        >
          {{ t('favorites.version.setCurrent') }}
        </NButton>
        <NButton
          v-if="showDeleteActions"
          size="tiny"
          quaternary
          type="error"
          :disabled="version.id === currentVersionId || versionEntries.length <= 1"
          :loading="busyVersionId === version.id"
          data-testid="favorite-prompt-asset-version-delete"
          @click="$emit('delete-version', version)"
        >
          {{ t('favorites.version.delete') }}
        </NButton>
      </NSpace>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NSpace, NTag, NText } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import type { PromptAsset, PromptContentVersion } from '@mindsync/core'

import {
  promptContentVersionPreview,
  sortPromptAssetVersionsForDisplay,
} from '../../utils/favorite-prompt-versions'

const props = withDefaults(defineProps<{
  promptAsset: PromptAsset | null
  showSetCurrentActions?: boolean
  showDeleteActions?: boolean
  busyVersionId?: string
}>(), {
  showSetCurrentActions: false,
  showDeleteActions: false,
  busyVersionId: '',
})

defineEmits<{
  'view-version': [version: PromptContentVersion]
  'set-current-version': [version: PromptContentVersion]
  'delete-version': [version: PromptContentVersion]
}>()

const { t } = useI18n()

const currentVersionId = computed(() => props.promptAsset?.currentVersionId || '')
const versionEntries = computed(() =>
  props.promptAsset ? sortPromptAssetVersionsForDisplay(props.promptAsset.versions) : [],
)

const formatVersionDate = (timestamp: number) => {
  if (!Number.isFinite(timestamp)) return ''
  return new Date(timestamp).toLocaleDateString()
}
</script>

<style scoped>
.favorite-prompt-asset-version-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.favorite-prompt-asset-version-list__item {
  display: flex;
  min-width: 0;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  border: 1px solid color-mix(in srgb, var(--n-border-color) 72%, transparent);
  border-radius: 8px;
  background: var(--n-color);
  padding: 10px 12px;
}

.favorite-prompt-asset-version-list__item.is-current {
  border-color: color-mix(in srgb, var(--n-success-color) 38%, var(--n-border-color));
  background: color-mix(in srgb, var(--n-color) 92%, var(--n-success-color) 8%);
}

.favorite-prompt-asset-version-list__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.favorite-prompt-asset-version-list__date {
  font-size: 12px;
}

.favorite-prompt-asset-version-list__preview {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 1.45;
  word-break: break-word;
}

.favorite-prompt-asset-version-list__actions {
  flex: 0 0 auto;
}

@media (max-width: 767px) {
  .favorite-prompt-asset-version-list__item {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
