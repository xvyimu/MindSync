import type { FavoritePrompt } from '@mindsync/core'

import PromptGardenFavoritePreviewPanel from '../components/PromptGardenFavoritePreviewPanel.vue'
import { parseFavoriteGardenSnapshotPreview } from '../utils/garden-snapshot-preview'
import type { FavoritePreviewPlugin } from './favoritePreviewPlugins'

export const favoritePreviewPlugin: FavoritePreviewPlugin = {
  id: 'prompt-garden-preview',
  envFlag: 'VITE_ENABLE_PROMPT_GARDEN_IMPORT',
  order: 100,
  match: (favorite: FavoritePrompt) => {
    return Boolean(parseFavoriteGardenSnapshotPreview(favorite))
  },
  component: PromptGardenFavoritePreviewPanel,
}
