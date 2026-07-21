import type { FavoriteCategory, IFavoriteManager } from '@mindsync/core'

export type FavoriteCategoryPathManager = Pick<IFavoriteManager, 'getCategories' | 'addCategory'>

const normalizeCategorySegment = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

const normalizeCategoryKey = (value: unknown): string => normalizeCategorySegment(value).toLowerCase()

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export const normalizeFavoriteCategoryPath = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeCategorySegment(item))
    .filter(Boolean)
}

export const deriveFavoriteCategoryPathFromGardenMeta = (snapshotMeta: unknown): string[] => {
  if (!isRecord(snapshotMeta)) return []

  const fromCategoryPath = normalizeFavoriteCategoryPath(snapshotMeta.categoryPath)
  if (fromCategoryPath.length > 0) return fromCategoryPath

  const fromCategoryPathKey = normalizeFavoriteCategoryPath(snapshotMeta.categoryPathKey)
  if (fromCategoryPathKey.length > 0) return fromCategoryPathKey

  const category = normalizeCategorySegment(snapshotMeta.category)
  const subcategory = normalizeCategorySegment(snapshotMeta.subcategory)
  const legacyPath = [category, subcategory].filter(Boolean)
  if (legacyPath.length > 0) return legacyPath

  const categoryKey = normalizeCategorySegment(snapshotMeta.categoryKey)
  return categoryKey ? [categoryKey] : []
}

const findCategoryInParent = (
  categories: FavoriteCategory[],
  parentId: string | undefined,
  name: string,
): FavoriteCategory | undefined => {
  const normalizedParentId = normalizeCategorySegment(parentId)
  const normalizedName = normalizeCategoryKey(name)

  return categories.find((category) => {
    if (normalizeCategorySegment(category.parentId) !== normalizedParentId) return false
    return normalizeCategoryKey(category.name) === normalizedName
  })
}

export const resolveFavoriteCategoryPathLeafId = (
  categories: FavoriteCategory[],
  path: string[],
): string | undefined => {
  const normalizedPath = normalizeFavoriteCategoryPath(path)
  if (normalizedPath.length === 0) return undefined

  let parentId: string | undefined
  for (const segment of normalizedPath) {
    const matched = findCategoryInParent(categories, parentId, segment)
    if (!matched) return undefined
    parentId = matched.id
  }

  return parentId
}

export const loadFavoriteCategoryPathLeafId = async (
  manager: FavoriteCategoryPathManager,
  path: string[],
): Promise<string | undefined> => {
  const normalizedPath = normalizeFavoriteCategoryPath(path)
  if (normalizedPath.length === 0) return undefined

  const categories = await manager.getCategories()
  return resolveFavoriteCategoryPathLeafId(categories, normalizedPath)
}

export const ensureFavoriteCategoryPath = async (
  manager: FavoriteCategoryPathManager,
  path: string[],
): Promise<string | undefined> => {
  const normalizedPath = normalizeFavoriteCategoryPath(path)
  if (normalizedPath.length === 0) return undefined

  let categories = await manager.getCategories()
  let parentId: string | undefined

  for (const segment of normalizedPath) {
    const existing = findCategoryInParent(categories, parentId, segment)
    if (existing) {
      parentId = existing.id
      continue
    }

    try {
      const newId = await manager.addCategory({
        name: segment,
        parentId,
        sortOrder: 0,
      })

      categories = [
        ...categories,
        {
          id: newId,
          name: segment,
          parentId,
          createdAt: Date.now(),
          sortOrder: 0,
        },
      ]
      parentId = newId
    } catch {
      categories = await manager.getCategories()
      const retryMatch = findCategoryInParent(categories, parentId, segment)
      if (!retryMatch) return undefined
      parentId = retryMatch.id
    }
  }

  return parentId
}
