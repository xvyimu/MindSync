import type {
  FavoritePrompt,
  IFavoriteManager,
  IImageStorageService,
} from '@mindsync/core'

import { collectFavoriteAssetIds } from './favorite-asset-refs'

type FavoriteManagerForGc = Pick<
  IFavoriteManager,
  'getFavorites' | 'getFavorite' | 'updateFavorite' | 'deleteFavorite' | 'deleteFavorites' | 'importFavorites'
> &
  IFavoriteManager

type FavoriteAssetGcResult = {
  deletedIds: string[]
  referencedIds: string[]
}

const setsAreEqual = (left: Set<string>, right: Set<string>): boolean => {
  if (left.size !== right.size) return false
  for (const value of left) {
    if (!right.has(value)) return false
  }
  return true
}

const safeGetFavorite = async (
  favoriteManager: FavoriteManagerForGc,
  id: string,
): Promise<FavoritePrompt | null> => {
  try {
    return await favoriteManager.getFavorite(id)
  } catch {
    return null
  }
}

export const runFavoriteAssetGc = async (
  favoriteManager: Pick<IFavoriteManager, 'getFavorites'>,
  favoriteImageStorageService: Pick<IImageStorageService, 'listAllMetadata' | 'deleteImages'> | null | undefined,
): Promise<FavoriteAssetGcResult> => {
  if (!favoriteImageStorageService) {
    return {
      deletedIds: [],
      referencedIds: [],
    }
  }

  const favorites = await favoriteManager.getFavorites()
  const referencedIds = new Set<string>()
  favorites.forEach((favorite) => {
    collectFavoriteAssetIds(favorite).forEach((id) => referencedIds.add(id))
  })

  const allMetadata = await favoriteImageStorageService.listAllMetadata()
  const orphanIds = allMetadata
    .map((metadata) => metadata.id)
    .filter((id) => !referencedIds.has(id))

  if (orphanIds.length > 0) {
    await favoriteImageStorageService.deleteImages(orphanIds)
  }

  return {
    deletedIds: orphanIds,
    referencedIds: Array.from(referencedIds),
  }
}

export const attachFavoriteAssetGc = (
  favoriteManager: FavoriteManagerForGc,
  favoriteImageStorageService: Pick<IImageStorageService, 'listAllMetadata' | 'deleteImages'> | null | undefined,
): IFavoriteManager => {
  if (!favoriteImageStorageService) {
    return favoriteManager
  }

  return new Proxy(favoriteManager, {
    get(target, prop, receiver) {
      if (prop === 'deleteFavorite') {
        return async (id: string) => {
          await target.deleteFavorite(id)
          await runFavoriteAssetGc(target, favoriteImageStorageService)
        }
      }

      if (prop === 'deleteFavorites') {
        return async (ids: string[]) => {
          await target.deleteFavorites(ids)
          await runFavoriteAssetGc(target, favoriteImageStorageService)
        }
      }

      if (prop === 'updateFavorite') {
        return async (id: string, updates: Partial<FavoritePrompt>) => {
          const beforeFavorite = await safeGetFavorite(target, id)
          const beforeRefs = collectFavoriteAssetIds(beforeFavorite)

          await target.updateFavorite(id, updates)

          const afterFavorite = await safeGetFavorite(target, id)
          const afterRefs = collectFavoriteAssetIds(afterFavorite)

          if (!setsAreEqual(beforeRefs, afterRefs)) {
            await runFavoriteAssetGc(target, favoriteImageStorageService)
          }
        }
      }

      if (prop === 'importFavorites') {
        return async (...args: Parameters<IFavoriteManager['importFavorites']>) => {
          const result = await target.importFavorites(...args)
          await runFavoriteAssetGc(target, favoriteImageStorageService)
          return result
        }
      }

      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  }) as IFavoriteManager
}
