import type { FavoritePrompt } from '@mindsync/core'

export type FavoriteMediaMetadata = {
  coverAssetId?: string
  coverUrl?: string
  assetIds: string[]
  urls: string[]
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const next = value.trim()
  return next || undefined
}

const dedupeStrings = (items: string[]): string[] => {
  return Array.from(new Set(items.filter(Boolean)))
}

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

export const parseFavoriteMediaMetadata = (
  favorite: FavoritePrompt | null | undefined,
): FavoriteMediaMetadata | null => {
  if (!favorite || !isRecord(favorite.metadata)) return null
  const rawMedia = favorite.metadata.media
  if (!isRecord(rawMedia)) return null

  const coverAssetId = asTrimmedString(rawMedia.coverAssetId)
  const coverUrl = asTrimmedString(rawMedia.coverUrl)
  const assetIds = dedupeStrings(asStringArray(rawMedia.assetIds))
  const urls = dedupeStrings(asStringArray(rawMedia.urls))

  if (!coverAssetId && !coverUrl && assetIds.length === 0 && urls.length === 0) {
    return null
  }

  return {
    coverAssetId,
    coverUrl,
    assetIds,
    urls,
  }
}

export const buildFavoriteMediaMetadata = (input: {
  coverAssetId?: string
  coverUrl?: string
  assetIds?: string[]
  urls?: string[]
}): FavoriteMediaMetadata | null => {
  const coverAssetId = asTrimmedString(input.coverAssetId)
  const coverUrl = asTrimmedString(input.coverUrl)
  const assetIds = dedupeStrings(asStringArray(input.assetIds))
  const urls = dedupeStrings(asStringArray(input.urls))

  if (!coverAssetId && !coverUrl && assetIds.length === 0 && urls.length === 0) {
    return null
  }

  return {
    coverAssetId,
    coverUrl,
    assetIds,
    urls,
  }
}
