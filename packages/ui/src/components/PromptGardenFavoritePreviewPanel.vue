<template>
  <GardenSnapshotPreview
    v-if="snapshot"
    :snapshot="snapshot"
    editable
    :busy="isSaving"
    :hidden-sections="gardenSnapshotHiddenSections"
    :source-only="gardenSnapshotSourceOnly"
    @upload-cover="handleGardenCoverUpload"
    @append-showcase-images="handleGardenShowcaseUpload"
  />
</template>

<script setup lang="ts">
import { computed, inject, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FavoritePrompt } from '@mindsync/core'

import { useToast } from '../composables/ui/useToast'
import type { AppServices } from '../types/services'
import {
  parseFavoriteGardenSnapshotPreview,
  type GardenSnapshotPreview as GardenSnapshotPreviewModel,
  type GardenSnapshotPreviewAsset,
} from '../utils/garden-snapshot-preview'
import {
  persistImageSourceAsAssetId,
  resolveAssetIdToDataUrl,
} from '../utils/image-asset-storage'
import { getI18nErrorMessage } from '../utils/error'
import GardenSnapshotPreview from './GardenSnapshotPreview.vue'

const props = defineProps<{
  favorite: FavoritePrompt
  gardenSnapshotHiddenSections?: Array<'basicInfo' | 'metaInfo' | 'cover' | 'showcases' | 'examples' | 'variables'>
  gardenSnapshotSourceOnly?: boolean
}>()

const emit = defineEmits<{
  'favorite-updated': [favoriteId: string]
}>()

const { t } = useI18n()
const message = useToast()

const services = inject<Ref<AppServices | null> | null>('services', null)
const isSaving = ref(false)
const resolvedSnapshot = ref<GardenSnapshotPreviewModel | null>(null)
const assetDataUrlCache = new Map<string, string>()
let snapshotResolveSequence = 0

const getFavoriteStorageService = () => services?.value?.favoriteImageStorageService || null
const getLegacyStorageService = () => services?.value?.imageStorageService || null
const getPreferredWriteStorageService = () => getFavoriteStorageService() || getLegacyStorageService()

const getReadStorageCandidates = () => {
  const favoriteStorage = getFavoriteStorageService()
  const legacyStorage = getLegacyStorageService()

  if (favoriteStorage && legacyStorage && favoriteStorage !== legacyStorage) {
    return [favoriteStorage, legacyStorage]
  }

  if (favoriteStorage) return [favoriteStorage]
  if (legacyStorage) return [legacyStorage]
  return []
}

const baseSnapshot = computed(() => {
  return parseFavoriteGardenSnapshotPreview(props.favorite)
})

const snapshot = computed(() => resolvedSnapshot.value)

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

const dedupeStrings = (items: string[]): string[] => {
  return Array.from(new Set(items.filter(Boolean)))
}

const isDataUrl = (value: string): boolean => /^data:/iu.test(String(value || '').trim())

const cloneAsset = (asset: GardenSnapshotPreviewAsset): GardenSnapshotPreviewAsset => {
  return {
    ...asset,
    images: [...asset.images],
    imageAssetIds: [...asset.imageAssetIds],
    inputImages: [...asset.inputImages],
    inputImageAssetIds: [...asset.inputImageAssetIds],
    parameters: { ...asset.parameters },
  }
}

const cloneSnapshot = (snapshotModel: GardenSnapshotPreviewModel): GardenSnapshotPreviewModel => {
  return {
    ...snapshotModel,
    meta: {
      ...snapshotModel.meta,
      tags: [...snapshotModel.meta.tags],
    },
    variables: snapshotModel.variables.map((variable) => ({
      ...variable,
      options: [...variable.options],
    })),
    showcases: snapshotModel.showcases.map(cloneAsset),
    examples: snapshotModel.examples.map(cloneAsset),
  }
}

const resolveAssetIdsToDataUrls = async (assetIds: string[]): Promise<string[]> => {
  const storageCandidates = getReadStorageCandidates()
  if (storageCandidates.length === 0 || assetIds.length === 0) return []

  const resolved: string[] = []
  for (const assetId of dedupeStrings(assetIds)) {
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
        console.warn('[PromptGardenPreview] Failed to resolve asset id:', assetId, error)
      }
    }
  }

  return resolved
}

const hydrateSnapshotForDisplay = async (
  snapshotModel: GardenSnapshotPreviewModel,
): Promise<GardenSnapshotPreviewModel> => {
  const next = cloneSnapshot(snapshotModel)

  if (getReadStorageCandidates().length === 0) {
    return next
  }

  if (!next.coverUrl && next.coverAssetId) {
    const resolvedCover = await resolveAssetIdsToDataUrls([next.coverAssetId])
    if (resolvedCover.length > 0) {
      next.coverUrl = resolvedCover[0]
    }
  }

  const hydrateAsset = async (asset: GardenSnapshotPreviewAsset): Promise<GardenSnapshotPreviewAsset> => {
    const nextAsset = cloneAsset(asset)

    const resolvedImages = await resolveAssetIdsToDataUrls(nextAsset.imageAssetIds)
    if (resolvedImages.length > 0) {
      nextAsset.images = dedupeStrings([...resolvedImages, ...nextAsset.images])
      if (!nextAsset.url) {
        nextAsset.url = nextAsset.images[0]
      }
    }

    const resolvedInputImages = await resolveAssetIdsToDataUrls(nextAsset.inputImageAssetIds)
    if (resolvedInputImages.length > 0) {
      nextAsset.inputImages = dedupeStrings([...resolvedInputImages, ...nextAsset.inputImages])
    }

    return nextAsset
  }

  next.showcases = await Promise.all(next.showcases.map((asset) => hydrateAsset(asset)))
  next.examples = await Promise.all(next.examples.map((asset) => hydrateAsset(asset)))

  return next
}

const refreshSnapshot = async () => {
  const raw = baseSnapshot.value
  if (!raw) {
    resolvedSnapshot.value = null
    return
  }

  const currentSequence = ++snapshotResolveSequence
  const hydrated = await hydrateSnapshotForDisplay(raw)
  if (currentSequence !== snapshotResolveSequence) return
  resolvedSnapshot.value = hydrated
}

watch(
  () => props.favorite,
  () => {
    void refreshSnapshot()
  },
  { immediate: true },
)

watch(
  () => [services?.value?.favoriteImageStorageService, services?.value?.imageStorageService],
  () => {
    void refreshSnapshot()
  },
)

const persistSourcesToAssetIdsWithFallback = async (sources: string[]): Promise<{
  assetIds: string[]
  fallbackSources: string[]
}> => {
  const storageService = getPreferredWriteStorageService()
  const normalizedSources = dedupeStrings(sources.map((item) => String(item || '').trim()).filter(Boolean))
  if (!storageService || normalizedSources.length === 0) {
    return {
      assetIds: [],
      fallbackSources: normalizedSources,
    }
  }

  const assetIds: string[] = []
  const fallbackSources: string[] = []

  for (const source of normalizedSources) {
    try {
      const assetId = await persistImageSourceAsAssetId({
        source,
        storageService,
        sourceType: 'uploaded',
      })

      if (assetId) {
        assetIds.push(assetId)
      } else {
        fallbackSources.push(source)
      }
    } catch (error) {
      console.warn('[PromptGardenPreview] Failed to persist uploaded source:', source, error)
      fallbackSources.push(source)
    }
  }

  return {
    assetIds: dedupeStrings(assetIds),
    fallbackSources,
  }
}

const updateGardenSnapshot = async (
  updater: (snapshotRecord: Record<string, unknown>) => void,
) => {
  if (isSaving.value) return

  const favoriteManager = services?.value?.favoriteManager
  if (!favoriteManager) {
    message.warning(t('favorites.manager.messages.unavailable'))
    return
  }

  const metadata = isRecord(props.favorite.metadata) ? { ...props.favorite.metadata } : {}
  const snapshotRecord = isRecord(metadata.gardenSnapshot) ? { ...metadata.gardenSnapshot } : {}

  updater(snapshotRecord)
  metadata.gardenSnapshot = snapshotRecord

  isSaving.value = true
  try {
    await favoriteManager.updateFavorite(props.favorite.id, { metadata })
    message.success(t('favorites.manager.preview.garden.saveSnapshotSuccess'))
    emit('favorite-updated', props.favorite.id)
  } catch (error) {
    const errorMessage = getI18nErrorMessage(error, t('common.error'))
    message.error(`${t('favorites.manager.preview.garden.saveSnapshotFailed')}: ${errorMessage}`)
  } finally {
    isSaving.value = false
  }
}

const handleGardenCoverUpload = async (coverDataUrl: string) => {
  if (!coverDataUrl) return

  const persistedCover = await persistSourcesToAssetIdsWithFallback([coverDataUrl])
  const coverAssetId = persistedCover.assetIds[0]
  const fallbackCover = persistedCover.fallbackSources[0]

  await updateGardenSnapshot((snapshotRecord) => {
    const assets = isRecord(snapshotRecord.assets) ? { ...snapshotRecord.assets } : {}
    const cover = isRecord(assets.cover) ? { ...assets.cover } : {}

    if (coverAssetId) {
      cover.assetId = coverAssetId
      delete cover.url
    } else {
      cover.url = fallbackCover || coverDataUrl
      delete cover.assetId
    }

    assets.cover = cover
    snapshotRecord.assets = assets
  })
}

const handleGardenShowcaseUpload = async (showcaseImages: string[]) => {
  const imageList = dedupeStrings(showcaseImages || [])
  if (imageList.length === 0) return

  const persisted = await persistSourcesToAssetIdsWithFallback(imageList)

  await updateGardenSnapshot((snapshotRecord) => {
    const assets = isRecord(snapshotRecord.assets) ? { ...snapshotRecord.assets } : {}
    const showcasesRaw = Array.isArray(assets.showcases) ? [...assets.showcases] : []

    const firstShowcase: Record<string, unknown> = isRecord(showcasesRaw[0])
      ? { ...showcasesRaw[0] }
      : {
          id: `local-showcase-${Date.now()}`,
          images: [] as string[],
        }

    const mergedImageAssetIds = dedupeStrings([
      ...asStringArray(firstShowcase.imageAssetIds),
      ...persisted.assetIds,
    ])

    const mergedFallbackImages = dedupeStrings([
      ...asStringArray(firstShowcase.images).filter((url) => !isDataUrl(url)),
      ...persisted.fallbackSources,
    ])

    firstShowcase.imageAssetIds = mergedImageAssetIds
    firstShowcase.images = mergedFallbackImages

    if (mergedFallbackImages.length > 0) {
      firstShowcase.url = mergedFallbackImages[0]
    } else if (mergedImageAssetIds.length > 0) {
      delete firstShowcase.url
    }

    showcasesRaw[0] = firstShowcase
    assets.showcases = showcasesRaw
    snapshotRecord.assets = assets
  })
}
</script>
