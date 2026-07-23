/**
 * Fluent glass shell atmosphere (visual pack 2026-07-23).
 *
 * Default OFF — does not change production Paper look.
 * Enable for preview only:
 *   - localStorage.setItem('ui:glass-shell', '1') then reload
 *   - or URL query ?glassShell=1
 *
 * Disable:
 *   - localStorage.removeItem('ui:glass-shell')
 *   - or ?glassShell=0
 *
 * Independent from redesign-shell (R0). Can combine: ?redesignShell=1&glassShell=1
 *
 * HTML sandbox parity: white-based L3/L2 fills, blur ≤20, solid main content.
 * See: D:\orca\.planning\portfolio-visual-fluent-glass-2026-07-23\
 */

import { watch, type WatchStopHandle } from 'vue'
import { isDarkTheme } from './naive-theme'

const STORAGE_KEY = 'ui:glass-shell'

const readQueryFlag = (): boolean | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = new URLSearchParams(window.location.search).get('glassShell')
    if (raw === '1' || raw === 'true') return true
    if (raw === '0' || raw === 'false') return false
  } catch {
    /* ignore */
  }
  return null
}

const readStorageFlag = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

const syncQueryToStorage = (enabled: boolean): void => {
  if (typeof window === 'undefined') return
  try {
    if (enabled) {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    /* ignore */
  }
}

/**
 * Whether Fluent glass atmosphere is active (modals / shell chrome only).
 * Default: false.
 */
export const isGlassShellEnabled = (): boolean => {
  const fromQuery = readQueryFlag()
  if (fromQuery !== null) {
    syncQueryToStorage(fromQuery)
    return fromQuery
  }
  return readStorageFlag()
}

const resolveGlassScheme = (): 'dark' | 'light' => {
  try {
    // Prefer product theme (Paper/dark/light/…) once Naive theme is live.
    if (isDarkTheme.value) return 'dark'
    return 'light'
  } catch {
    try {
      if (
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ) {
        return 'dark'
      }
    } catch {
      /* ignore */
    }
    return 'light'
  }
}

/** Sync data-glass-scheme from product theme (or system fallback). */
export const syncGlassShellScheme = (): void => {
  if (typeof document === 'undefined') return
  if (!document.documentElement.classList.contains('glass-shell-on')) return
  document.documentElement.dataset.glassScheme = resolveGlassScheme()
}

let schemeWatchStop: WatchStopHandle | null = null

/** Apply or remove documentElement marker for global Naive modal/drawer CSS. */
export const applyGlassShellDocumentClass = (enabled: boolean): void => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('glass-shell-on', enabled)
  if (!enabled) {
    document.documentElement.removeAttribute('data-glass-scheme')
    if (schemeWatchStop) {
      schemeWatchStop()
      schemeWatchStop = null
    }
    return
  }
  syncGlassShellScheme()
  if (!schemeWatchStop) {
    schemeWatchStop = watch(
      () => isDarkTheme.value,
      () => {
        syncGlassShellScheme()
      },
      { flush: 'post' },
    )
  }
}

export const GLASS_SHELL_STORAGE_KEY = STORAGE_KEY
