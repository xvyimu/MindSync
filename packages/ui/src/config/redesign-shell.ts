/**
 * Redesign shell feature flag (R0).
 *
 * Default OFF — production and normal dev keep the legacy single-header layout.
 * Enable only for shell redesign work:
 *   - localStorage.setItem('ui:redesign-shell', '1')  then reload
 *   - or URL query  ?redesignShell=1
 *
 * Disable:
 *   - localStorage.removeItem('ui:redesign-shell')
 *   - or ?redesignShell=0
 *
 * Not persisted via PreferenceService on purpose (dev/preview gate only).
 */

const STORAGE_KEY = 'ui:redesign-shell'

const readQueryFlag = (): boolean | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = new URLSearchParams(window.location.search).get('redesignShell')
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

/** Sync query → storage so a single ?redesignShell=1 sticks for the session. */
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
 * Whether the Naive-UI-Admin-style shell (sider + thin header) is active.
 * Default: false.
 */
export const isRedesignShellEnabled = (): boolean => {
  const fromQuery = readQueryFlag()
  if (fromQuery !== null) {
    syncQueryToStorage(fromQuery)
    return fromQuery
  }
  return readStorageFlag()
}

export const REDESIGN_SHELL_STORAGE_KEY = STORAGE_KEY
