import type { Ref } from 'vue'
import type { Router } from 'vue-router'
import type {
  ConversationMessage,
  IFavoriteManager,
  IImageStorageService,
  PromptRecordChain,
} from '@mindsync/core'

import type { BasicSystemSessionApi } from '../stores/session/useBasicSystemSession'
import type { BasicUserSessionApi } from '../stores/session/useBasicUserSession'
import type { ProMultiMessageSessionApi } from '../stores/session/useProMultiMessageSession'
import type { ProVariableSessionApi } from '../stores/session/useProVariableSession'
import type { ImageText2ImageSessionApi } from '../stores/session/useImageText2ImageSession'
import type { ImageImage2ImageSessionApi } from '../stores/session/useImageImage2ImageSession'
import type { ImageMultiImageSessionApi } from '../stores/session/useImageMultiImageSession'

export interface SaveFavoriteDialogDraft {
  content: string
  originalContent?: string
  prefill?: {
    title?: string
    description?: string
    category?: string
    tags?: string[]
    functionMode?: 'basic' | 'context' | 'image'
    optimizationMode?: 'system' | 'user'
    imageSubMode?: 'text2image' | 'image2image' | 'multiimage'
    metadata?: Record<string, unknown>
  }
}

export interface OptionalIntegrationsContext {
  router: Pick<Router, 'currentRoute' | 'push' | 'replace'>
  hasRestoredInitialState: Ref<boolean>
  isLoadingExternalData: Ref<boolean>

  /**
   * Optimization context messages stored in the context repo.
   * Note: Pro-multi conversation messages are session-owned (see proMultiMessageSession).
   */
  optimizationContext: Ref<ConversationMessage[]>

  basicSystemSession: BasicSystemSessionApi
  basicUserSession: BasicUserSessionApi
  proMultiMessageSession: ProMultiMessageSessionApi
  proVariableSession: ProVariableSessionApi
  imageText2ImageSession: ImageText2ImageSessionApi
  imageImage2ImageSession: ImageImage2ImageSessionApi
  imageMultiImageSession: ImageMultiImageSessionApi
  optimizerCurrentVersions: Ref<PromptRecordChain['versions']>

  /** Lazy getter to avoid hard coupling optional integrations to app service lifecycle. */
  getFavoriteManager: () => IFavoriteManager | null
  /** Lazy getter for optional favorite image asset storage integration. */
  getFavoriteImageStorageService: () => IImageStorageService | null
  /** Optional callback to open save-favorite dialog after import. */
  openSaveFavoriteDialog?: (draft: SaveFavoriteDialogDraft) => void
}

export interface OptionalIntegration {
  /** Stable identifier for logging / debugging. */
  id: string
  /** Env var name used to enable the integration. */
  envFlag: string
  /** Register integration side-effects (watchers, listeners, etc.). */
  register: (ctx: OptionalIntegrationsContext) => void | Promise<void>
}
