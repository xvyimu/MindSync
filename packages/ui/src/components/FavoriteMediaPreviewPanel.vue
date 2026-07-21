<template>
  <NCard
    v-if="displayImages.length > 0"
    size="small"
    :title="t('favorites.manager.preview.media.title')"
    :segmented="{ content: true }"
  >
    <NSpace vertical :size="10">
      <NText depth="3">{{ t('favorites.manager.preview.media.hint') }}</NText>
      <AppPreviewImageGroup>
        <NSpace :size="8" wrap>
          <AppPreviewImage
            v-for="(src, index) in displayImages"
            :key="`${index}-${src.slice(0, 32)}`"
            :src="src"
            width="120"
            object-fit="cover"
            :alt="t('favorites.manager.preview.media.imageAlt', { index: index + 1 })"
          />
        </NSpace>
      </AppPreviewImageGroup>
    </NSpace>
  </NCard>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch, type Ref } from 'vue'
import { NCard, NSpace, NText } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import type { FavoritePrompt } from '@mindsync/core'

import type { AppServices } from '../types/services'
import { parseFavoriteMediaMetadata } from '../utils/favorite-media'
import { resolveAssetIdToDataUrl } from '../utils/image-asset-storage'
import AppPreviewImage from './media/AppPreviewImage.vue'
import AppPreviewImageGroup from './media/AppPreviewImageGroup.vue'

const props = defineProps<{
  favorite: FavoritePrompt
}>()

const { t } = useI18n()
const services = inject<Ref<AppServices | null> | null>('services', null)

const assetDataUrlCache = new Map<string, string>()
const displayImages = ref<string[]>([])
let resolveSequence = 0

const getReadStorageCandidates = () => {
  const favoriteStorage = services?.value?.favoriteImageStorageService || null
  const legacyStorage = services?.value?.imageStorageService || null

  if (favoriteStorage && legacyStorage && favoriteStorage !== legacyStorage) {
    return [favoriteStorage, legacyStorage]
  }

  if (favoriteStorage) return [favoriteStorage]
  if (legacyStorage) return [legacyStorage]
  return []
}

const mediaMetadata = computed(() => parseFavoriteMediaMetadata(props.favorite))

const resolveAssetIdsToDataUrls = async (assetIds: string[]): Promise<string[]> => {
  const storageCandidates = getReadStorageCandidates()
  if (storageCandidates.length === 0 || assetIds.length === 0) return []

  const resolved: string[] = []

  for (const assetId of assetIds) {
    if (!assetId) continue
    if (assetDataUrlCache.has(assetId)) {
      resolved.push(assetDataUrlCache.get(assetId) as string)
      continue
    }

    for (const storageService of storageCandidates) {
      try {
        const dataUrl = await resolveAssetIdToDataUrl(assetId, storageService)
        if (dataUrl) {
          assetDataUrlCache.set(assetId, dataUrl)
          resolved.push(dataUrl)
          break
        }
      } catch (error) {
        console.warn('[FavoriteMediaPreview] Failed to resolve asset id:', assetId, error)
      }
    }
  }

  return resolved
}

const refreshDisplayImages = async () => {
  const media = mediaMetadata.value
  if (!media) {
    displayImages.value = []
    return
  }

  const currentSequence = ++resolveSequence
  const images: string[] = []

  if (media.coverUrl) {
    images.push(media.coverUrl)
  }

  if (media.coverAssetId) {
    const resolvedCover = await resolveAssetIdsToDataUrls([media.coverAssetId])
    images.push(...resolvedCover)
  }

  const resolvedAssets = await resolveAssetIdsToDataUrls(media.assetIds)
  images.push(...resolvedAssets)
  images.push(...media.urls)

  if (currentSequence !== resolveSequence) return
  displayImages.value = Array.from(new Set(images.filter(Boolean)))
}

watch(
  () => props.favorite,
  () => {
    void refreshDisplayImages()
  },
  { immediate: true },
)

watch(
  () => [services?.value?.favoriteImageStorageService, services?.value?.imageStorageService],
  () => {
    void refreshDisplayImages()
  },
)
</script>
