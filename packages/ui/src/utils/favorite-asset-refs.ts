import type { FavoritePrompt } from '@mindsync/core'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const collectStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

const collectPromptImageRefs = (
  refs: unknown,
  assetIds: Set<string>,
) => {
  if (!Array.isArray(refs)) return

  refs.forEach((ref) => {
    if (!isRecord(ref)) return
    if (ref.kind !== 'asset') return
    const assetId = typeof ref.assetId === 'string' ? ref.assetId.trim() : ''
    if (assetId) {
      assetIds.add(assetId)
    }
  })
}

const collectPromptAssetImageRefs = (
  promptAsset: unknown,
  assetIds: Set<string>,
) => {
  if (!isRecord(promptAsset)) return

  if (Array.isArray(promptAsset.versions)) {
    promptAsset.versions.forEach((version) => {
      if (!isRecord(version) || !isRecord(version.content)) return
      collectPromptImageRefs(version.content.images, assetIds)
    })
  }

  if (isRecord(promptAsset.content)) {
    collectPromptImageRefs(promptAsset.content.images, assetIds)
  }

  if (Array.isArray(promptAsset.examples)) {
    promptAsset.examples.forEach((example) => {
      if (!isRecord(example)) return
      const input = isRecord(example.input) ? example.input : null
      const output = isRecord(example.output) ? example.output : null
      collectPromptImageRefs(input?.images, assetIds)
      collectPromptImageRefs(output?.images, assetIds)
      collectStringArray(example.imageAssetIds).forEach((id) => assetIds.add(id))
      collectStringArray(example.inputImageAssetIds).forEach((id) => assetIds.add(id))
    })
  }
}

const collectFromExampleItems = (
  items: unknown,
  assetIds: Set<string>,
) => {
  if (!Array.isArray(items)) return

  items.forEach((item) => {
    if (!isRecord(item)) return

    collectStringArray(item.imageAssetIds).forEach((id) => assetIds.add(id))
    collectStringArray(item.inputImageAssetIds).forEach((id) => assetIds.add(id))
  })
}

export const collectFavoriteAssetIds = (
  favorite: FavoritePrompt | null | undefined,
): Set<string> => {
  const assetIds = new Set<string>()
  if (!favorite || !isRecord(favorite.metadata)) {
    return assetIds
  }

  const media = isRecord(favorite.metadata.media) ? favorite.metadata.media : null
  if (media) {
    const coverAssetId = typeof media.coverAssetId === 'string' ? media.coverAssetId.trim() : ''
    if (coverAssetId) {
      assetIds.add(coverAssetId)
    }

    collectStringArray(media.assetIds).forEach((id) => assetIds.add(id))
  }

  collectPromptAssetImageRefs(favorite.metadata.promptAsset, assetIds)

  const gardenSnapshot = isRecord(favorite.metadata.gardenSnapshot)
    ? favorite.metadata.gardenSnapshot
    : null

  if (gardenSnapshot && isRecord(gardenSnapshot.assets)) {
    const cover = isRecord(gardenSnapshot.assets.cover) ? gardenSnapshot.assets.cover : null
    if (cover) {
      const coverAssetId = typeof cover.assetId === 'string' ? cover.assetId.trim() : ''
      if (coverAssetId) {
        assetIds.add(coverAssetId)
      }
    }

    collectFromExampleItems(gardenSnapshot.assets.showcases, assetIds)
    collectFromExampleItems(gardenSnapshot.assets.examples, assetIds)
  }

  const reproducibility = isRecord(favorite.metadata.reproducibility)
    ? favorite.metadata.reproducibility
    : null
  if (reproducibility) {
    collectFromExampleItems(reproducibility.examples, assetIds)
  }

  collectFromExampleItems(favorite.metadata.examples, assetIds)

  return assetIds
}

export const collectFavoritesAssetIds = (
  favorites: FavoritePrompt[],
): string[] => {
  const assetIds = new Set<string>()
  favorites.forEach((favorite) => {
    collectFavoriteAssetIds(favorite).forEach((id) => assetIds.add(id))
  })
  return Array.from(assetIds)
}
