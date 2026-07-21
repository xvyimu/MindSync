import { getEnvVar, type FavoritePrompt } from '@mindsync/core'
import type { Component } from 'vue'

export interface FavoritePreviewPlugin {
  id: string
  envFlag: string
  order?: number
  match: (favorite: FavoritePrompt) => boolean
  component: Component
}

type FavoritePreviewModule = {
  favoritePreviewPlugin?: FavoritePreviewPlugin
}

const discoveredFavoritePreviewModules = import.meta.glob<FavoritePreviewModule>(
  './*.favorite-preview.ts'
)

const isEnvEnabled = (value: unknown): boolean => {
  return value === '1' || value === 'true'
}

let favoritePreviewPluginsCache: FavoritePreviewPlugin[] | null = null

/**
 * Loads favorite preview plugins lazily and filters by env flag.
 */
export const loadEnabledFavoritePreviewPlugins = async (): Promise<FavoritePreviewPlugin[]> => {
  if (favoritePreviewPluginsCache) {
    return favoritePreviewPluginsCache
  }

  const modules = Object.values(discoveredFavoritePreviewModules)
  const loaded = await Promise.all(
    modules.map(async (loader) => {
      try {
        return await loader()
      } catch (error) {
        console.error('[FavoritePreviewPlugins] Failed to load plugin module', error)
        return null
      }
    }),
  )

  const plugins = loaded
    .map((mod) => mod?.favoritePreviewPlugin)
    .filter((plugin): plugin is FavoritePreviewPlugin => {
      if (!plugin) return false
      return isEnvEnabled(getEnvVar(plugin.envFlag))
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  favoritePreviewPluginsCache = plugins
  return plugins
}
