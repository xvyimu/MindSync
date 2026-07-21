import type { FavoritePrompt } from '@mindsync/core'

export type GardenSnapshotPreviewVariable = {
  name: string
  description?: string
  type?: 'string' | 'number' | 'boolean' | 'enum'
  required: boolean
  defaultValue?: string
  options: string[]
  source?: string
}

export type GardenSnapshotPreviewAsset = {
  id?: string
  text?: string
  description?: string
  url?: string
  images: string[]
  imageAssetIds: string[]
  inputImages: string[]
  inputImageAssetIds: string[]
  parameters: Record<string, string>
}

export type GardenSnapshotPreviewMeta = {
  title?: string
  description?: string
  tags: string[]
}

export type GardenSnapshotPreview = {
  schema?: string
  schemaVersion?: number
  importCode?: string
  gardenBaseUrl?: string
  importedAt?: string
  meta: GardenSnapshotPreviewMeta
  variables: GardenSnapshotPreviewVariable[]
  coverUrl?: string
  coverAssetId?: string
  showcases: GardenSnapshotPreviewAsset[]
  examples: GardenSnapshotPreviewAsset[]
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => asTrimmedString(item))
    .filter((item): item is string => Boolean(item))
}

const parseParameters = (value: unknown): Record<string, string> => {
  if (!isPlainObject(value)) return {}

  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value)) {
    const normalizedKey = key.trim()
    if (!normalizedKey) continue
    if (raw === undefined || raw === null) continue
    out[normalizedKey] = String(raw)
  }

  return out
}

const dedupeStrings = (list: string[]): string[] => {
  const out: string[] = []
  const seen = new Set<string>()

  for (const item of list) {
    if (!item || seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }

  return out
}

const parseAsset = (value: unknown): GardenSnapshotPreviewAsset | null => {
  if (!isPlainObject(value)) return null

  const url = asTrimmedString(value.url)
  const images = dedupeStrings([
    ...(url ? [url] : []),
    ...asStringArray(value.images),
  ])

  const asset: GardenSnapshotPreviewAsset = {
    id: asTrimmedString(value.id),
    text: asTrimmedString(value.text),
    description: asTrimmedString(value.description),
    url,
    images,
    imageAssetIds: dedupeStrings(asStringArray(value.imageAssetIds)),
    inputImages: dedupeStrings(asStringArray(value.inputImages)),
    inputImageAssetIds: dedupeStrings(asStringArray(value.inputImageAssetIds)),
    parameters: parseParameters(value.parameters),
  }

  const hasData = Boolean(
    asset.id ||
      asset.text ||
      asset.description ||
      asset.url ||
      asset.images.length > 0 ||
      asset.imageAssetIds.length > 0 ||
      asset.inputImages.length > 0 ||
      asset.inputImageAssetIds.length > 0 ||
      Object.keys(asset.parameters).length > 0,
  )

  return hasData ? asset : null
}

const parseAssets = (value: unknown): GardenSnapshotPreviewAsset[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => parseAsset(item))
    .filter((item): item is GardenSnapshotPreviewAsset => Boolean(item))
}

const parseVariables = (value: unknown): GardenSnapshotPreviewVariable[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((item): GardenSnapshotPreviewVariable | null => {
      if (!isPlainObject(item)) return null
      const name = asTrimmedString(item.name)
      if (!name) return null

      const type =
        item.type === 'string' ||
        item.type === 'number' ||
        item.type === 'boolean' ||
        item.type === 'enum'
          ? item.type
          : undefined

      return {
        name,
        description: asTrimmedString(item.description),
        type,
        required: item.required === true,
        defaultValue: asTrimmedString(item.defaultValue),
        options: dedupeStrings(asStringArray(item.options)),
        source: asTrimmedString(item.source),
      }
    })
    .filter((item): item is GardenSnapshotPreviewVariable => Boolean(item))
}

export const parseGardenSnapshotPreview = (value: unknown): GardenSnapshotPreview | null => {
  if (!isPlainObject(value)) return null

  const assets = isPlainObject(value.assets) ? value.assets : {}
  const meta = isPlainObject(value.meta) ? value.meta : {}
  const cover = isPlainObject(assets.cover) ? assets.cover : {}

  const snapshot: GardenSnapshotPreview = {
    schema: asTrimmedString(value.schema),
    schemaVersion: typeof value.schemaVersion === 'number' ? value.schemaVersion : undefined,
    importCode: asTrimmedString(value.importCode),
    gardenBaseUrl: asTrimmedString(value.gardenBaseUrl),
    importedAt: asTrimmedString(value.importedAt),
    meta: {
      title: asTrimmedString(meta.title),
      description: asTrimmedString(meta.description),
      tags: dedupeStrings(asStringArray(meta.tags)),
    },
    variables: parseVariables(value.variables),
    coverUrl: asTrimmedString(cover.url),
    coverAssetId: asTrimmedString(cover.assetId),
    showcases: parseAssets(assets.showcases),
    examples: parseAssets(assets.examples),
  }

  const hasMeaningfulContent = Boolean(
    snapshot.importCode ||
      snapshot.gardenBaseUrl ||
      snapshot.meta.title ||
      snapshot.meta.description ||
      snapshot.meta.tags.length > 0 ||
      snapshot.coverUrl ||
      snapshot.coverAssetId ||
      snapshot.variables.length > 0 ||
      snapshot.showcases.length > 0 ||
      snapshot.examples.length > 0 ||
      snapshot.showcases.some((asset) => asset.imageAssetIds.length > 0 || asset.inputImageAssetIds.length > 0) ||
      snapshot.examples.some((asset) => asset.imageAssetIds.length > 0 || asset.inputImageAssetIds.length > 0),
  )

  return hasMeaningfulContent ? snapshot : null
}

export const parseFavoriteGardenSnapshotPreview = (
  favorite: FavoritePrompt | null | undefined,
): GardenSnapshotPreview | null => {
  if (!favorite) return null
  if (!isPlainObject(favorite.metadata)) return null
  return parseGardenSnapshotPreview(favorite.metadata.gardenSnapshot)
}
