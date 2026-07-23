/**
 * Desktop facade types (P0 surface).
 *
 * Goal: UI / core proxies talk to a stable desktop API shape. Electron keeps
 * exposing `window.electronAPI`; Tauri (and tests) may expose `window.desktopAPI`
 * with the same P0 methods, optionally aliased to `electronAPI` so existing
 * Electron*Proxy classes keep working with zero Vue churn.
 */

/** Which shell implemented the backend. */
export type DesktopShellKind = 'electron' | 'tauri' | 'mock' | 'unknown'

/**
 * P0 app info. Mirrors preload `electronAPI.app` subset.
 * Full Electron surface may add setLocale etc. later without breaking this.
 */
export interface DesktopAppAPI {
  getVersion(): Promise<string>
}

/**
 * Non-secret preference get/set only (P0).
 * Full preference manager (delete/keys/clear/export…) stays on the Electron
 * preload surface and later batches; do not put secrets through this path.
 */
export interface DesktopPreferenceP0API {
  get<T>(key: string, defaultValue: T): Promise<T>
  set<T>(key: string, value: T): Promise<void>
}

/** Shell helpers. P0: openExternal only. */
export interface DesktopShellAPI {
  openExternal(url: string): Promise<unknown>
}

/** Result of `desktop-ping`. */
export interface DesktopPingResult {
  ok: true
  shell: DesktopShellKind
  ts: number
}

/**
 * Minimal desktop bridge that both Electron and Tauri must satisfy for M2.
 * Extra namespaces (llm, model, …) may exist on the same object at runtime;
 * they are intentionally not required here.
 */
export interface DesktopP0API {
  /** Marker so detect / wait helpers can distinguish a real bridge. */
  isDesktop?: true
  /** Legacy Electron marker kept for preload parity. */
  isElectron?: boolean
  /** Optional shell tag for diagnostics. */
  shellKind?: DesktopShellKind
  app: DesktopAppAPI
  preference: DesktopPreferenceP0API
  shell: DesktopShellAPI
  /** Health check; may be absent on older Electron preload until aliased. */
  ping?: () => Promise<DesktopPingResult>
}

/**
 * Transport used by shell adapters (Tauri `invoke`, mock map, optional
 * thin Electron shim). Returns unwrapped business data (not `{success,data}`).
 */
export interface DesktopCommandBackend {
  invoke<T = unknown>(command: string, ...args: unknown[]): Promise<T>
  readonly shellKind?: DesktopShellKind
}

export interface CreateDesktopApiOptions {
  shellKind?: DesktopShellKind
}

export interface InstallDesktopApiOptions {
  /**
   * When true (default), also assign `window.electronAPI` if missing so
   * existing Electron*Proxy + UI code keeps working.
   */
  aliasElectronAPI?: boolean
  /**
   * When true (default), also assign `window.desktopAPI` if missing.
   */
  aliasDesktopAPI?: boolean
}
