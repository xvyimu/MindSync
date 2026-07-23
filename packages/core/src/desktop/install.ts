import type { DesktopP0API, InstallDesktopApiOptions } from './types'

type DesktopWindow = Window & {
  desktopAPI?: DesktopP0API
  electronAPI?: DesktopP0API & Record<string, unknown>
}

function getWindow(): DesktopWindow | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  return window as DesktopWindow
}

/**
 * Resolve the active desktop bridge.
 * Preference order: `desktopAPI` (canonical) → `electronAPI` (legacy alias).
 */
export function resolveDesktopApi(): DesktopP0API | null {
  const w = getWindow()
  if (!w) return null

  if (isP0Bridge(w.desktopAPI)) {
    return w.desktopAPI
  }
  if (isP0Bridge(w.electronAPI)) {
    return w.electronAPI as DesktopP0API
  }
  return null
}

function isP0Bridge(value: unknown): value is DesktopP0API {
  if (!value || typeof value !== 'object') return false
  const api = value as DesktopP0API
  return (
    typeof api.app?.getVersion === 'function' &&
    typeof api.preference?.get === 'function' &&
    typeof api.preference?.set === 'function' &&
    typeof api.shell?.openExternal === 'function'
  )
}

/**
 * Install a P0 (or fuller) API onto window for renderer consumption.
 * By default mirrors onto both `desktopAPI` and `electronAPI` so proxies
 * that still read `window.electronAPI` keep working under Tauri/mock.
 */
export function installDesktopApi(
  api: DesktopP0API,
  options: InstallDesktopApiOptions = {},
): void {
  const w = getWindow()
  if (!w) {
    throw new Error('installDesktopApi requires a browser/renderer window')
  }

  const aliasDesktop = options.aliasDesktopAPI !== false
  const aliasElectron = options.aliasElectronAPI !== false

  if (aliasDesktop) {
    w.desktopAPI = api
  }
  if (aliasElectron) {
    // Preserve any extra Electron namespaces already present when merging.
    const existing = w.electronAPI
    w.electronAPI = existing
      ? ({ ...existing, ...api } as DesktopWindow['electronAPI'])
      : (api as DesktopWindow['electronAPI'])
  }
}

/** Test helper: strip both aliases. */
export function uninstallDesktopApi(): void {
  const w = getWindow()
  if (!w) return
  try {
    delete w.desktopAPI
  } catch {
    w.desktopAPI = undefined
  }
  try {
    delete w.electronAPI
  } catch {
    w.electronAPI = undefined
  }
}
