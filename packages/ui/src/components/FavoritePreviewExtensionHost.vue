<template>
  <div v-if="activePlugins.length > 0" class="favorite-preview-extension-host">
    <component
      :is="plugin.component"
      v-for="plugin in activePlugins"
      :key="plugin.id"
      :favorite="favorite"
      :garden-snapshot-hidden-sections="gardenSnapshotHiddenSections"
      :garden-snapshot-source-only="gardenSnapshotSourceOnly"
      @favorite-updated="handleFavoriteUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import type { FavoritePrompt } from '@mindsync/core'

import {
  loadEnabledFavoritePreviewPlugins,
  type FavoritePreviewPlugin,
} from '../integrations/favoritePreviewPlugins'

const props = defineProps<{
  favorite: FavoritePrompt
  gardenSnapshotHiddenSections?: string[]
  gardenSnapshotSourceOnly?: boolean
}>()

const emit = defineEmits<{
  'favorite-updated': [favoriteId: string]
}>()

const plugins = shallowRef<FavoritePreviewPlugin[]>([])

const activePlugins = computed(() => {
  return plugins.value.filter((plugin) => plugin.match(props.favorite))
})

const handleFavoriteUpdated = (favoriteId: string) => {
  emit('favorite-updated', favoriteId)
}

onMounted(async () => {
  plugins.value = await loadEnabledFavoritePreviewPlugins()
})
</script>

<style scoped>
.favorite-preview-extension-host {
  display: grid;
  gap: 12px;
}
</style>
