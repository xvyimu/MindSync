import type { InjectionKey } from 'vue'
import type { FavoritePrompt } from '@mindsync/core'

export interface FavoritesPageActions {
  useFavorite: (favorite: FavoritePrompt, options?: { applyExample?: boolean; exampleId?: string; exampleIndex?: number }) => Promise<boolean>
  returnToWorkspace: () => void
}

export const favoritesPageActionsKey: InjectionKey<FavoritesPageActions> = Symbol('favoritesPageActions')
