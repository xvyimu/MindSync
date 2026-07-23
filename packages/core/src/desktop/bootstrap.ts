/**
 * Renderer bootstrap helpers for desktop shells.
 *
 * Tauri path: detect runtime → create backend → install facade on window.
 * Electron path keeps using preload `electronAPI` (optional ping polyfill).
 */

import { createDesktopApiFromBackend } from './backend'
import { installDesktopApi } from './install'
import {
  createTauriDesktopBackend,
  isTauriRuntime,
} from './tauri-backend'
import type { DesktopP0API, InstallDesktopApiOptions } from './types'

export interface InstallTauriDesktopApiOptions extends InstallDesktopApiOptions {
  /**
   * When false, do not throw if Tauri is absent — return null instead.
   * Default true for explicit install; web entry uses soft mode.
   */
  requireTauri?: boolean
}

/**
 * If running under Tauri, install `desktopAPI` (+ electronAPI alias) from the
 * P0 Tauri command backend. Safe to call on Web/Electron — returns null when
 * no Tauri bridge is present.
 */
export function tryInstallTauriDesktopApi(
  options: InstallTauriDesktopApiOptions = {},
): DesktopP0API | null {
  if (!isTauriRuntime()) {
    if (options.requireTauri) {
      throw new Error('tryInstallTauriDesktopApi: not a Tauri runtime')
    }
    return null
  }

  const backend = createTauriDesktopBackend({ shellKind: 'tauri' })
  const api = createDesktopApiFromBackend(backend, { shellKind: 'tauri' })
  installDesktopApi(api, {
    aliasDesktopAPI: options.aliasDesktopAPI,
    aliasElectronAPI: options.aliasElectronAPI,
  })
  return api
}
