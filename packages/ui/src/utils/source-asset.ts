import type {
  FavoritePrompt,
  PromptAssetBinding,
  PromptSessionOrigin,
} from '@mindsync/core'

import { resolveFavoritePromptAsset } from './favorite-reproducibility'

export type SourceAssetRef = {
  favoriteId?: string
  assetId?: string
  versionId?: string
  title?: string
}

const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export const resolveSourceAssetRef = (
  origin: PromptSessionOrigin | undefined,
  assetBinding: PromptAssetBinding | undefined,
): SourceAssetRef | null => {
  const metadata = isPlainObject(origin?.metadata) ? origin.metadata : {}
  const favoriteId = origin?.kind === 'favorite'
    ? asTrimmedString(origin.id)
    : asTrimmedString(metadata.favoriteId)
  const assetId =
    asTrimmedString(assetBinding?.assetId) ??
    asTrimmedString(metadata.assetId)
  const versionId =
    asTrimmedString(assetBinding?.versionId) ??
    asTrimmedString(metadata.versionId)
  const title = asTrimmedString(metadata.title)

  if (!favoriteId && !assetId && !versionId) return null
  return {
    ...(favoriteId ? { favoriteId } : {}),
    ...(assetId ? { assetId } : {}),
    ...(versionId ? { versionId } : {}),
    ...(title ? { title } : {}),
  }
}

export const findFavoriteBySourceAssetRef = (
  favorites: FavoritePrompt[],
  source: SourceAssetRef | null | undefined,
): FavoritePrompt | null => {
  if (!source) return null

  const favoriteId = asTrimmedString(source.favoriteId)
  if (favoriteId) {
    const found = favorites.find((favorite) => favorite.id === favoriteId)
    if (found) return found
  }

  const assetId = asTrimmedString(source.assetId)
  if (!assetId) return null

  return favorites.find((favorite) => {
    const asset = resolveFavoritePromptAsset(favorite)
    return asset?.id === assetId
  }) ?? null
}

export const buildFavoriteSessionBinding = (
  favorite: FavoritePrompt,
): {
  binding: PromptAssetBinding | undefined
  origin: PromptSessionOrigin
} => {
  const asset = resolveFavoritePromptAsset(favorite)
  const assetId = asTrimmedString(asset?.id)
  const versionId = asTrimmedString(asset?.currentVersionId)
  const metadata: Record<string, unknown> = {
    title: favorite.title,
    functionMode: favorite.functionMode,
    ...(favorite.optimizationMode ? { optimizationMode: favorite.optimizationMode } : {}),
    ...(favorite.imageSubMode ? { imageSubMode: favorite.imageSubMode } : {}),
    ...(assetId ? { assetId } : {}),
    ...(versionId ? { versionId } : {}),
  }

  return {
    binding: assetId
      ? {
          assetId,
          ...(versionId ? { versionId } : {}),
          status: 'linked',
        }
      : undefined,
    origin: {
      kind: 'favorite',
      id: favorite.id,
      metadata,
    },
  }
}
