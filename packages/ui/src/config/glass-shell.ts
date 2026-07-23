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
 */

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

/** Apply or remove documentElement marker for global Naive modal/drawer CSS. */
export const applyGlassShellDocumentClass = (enabled: boolean): void => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('glass-shell-on', enabled)
  if (!enabled) {
    document.documentElement.removeAttribute('data-glass-scheme')
    return
  }
  // Prefer system scheme for L3 fill strength; product theme can refine later.
  try {
    const dark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.dataset.glassScheme = dark ? 'dark' : 'light'
  } catch {
    document.documentElement.dataset.glassScheme = 'dark'
  }
}

export const GLASS_SHELL_STORAGE_KEY = STORAGE_KEY
