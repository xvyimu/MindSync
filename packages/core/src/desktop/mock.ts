import { DESKTOP_P0_COMMANDS } from './commands'
import type { DesktopCommandBackend, DesktopPingResult, DesktopShellKind } from './types'

export interface MockDesktopBackendState {
  version: string
  preferences: Map<string, unknown>
  openedExternalUrls: string[]
  shellKind: DesktopShellKind
}

export interface CreateMockDesktopBackendOptions {
  version?: string
  preferences?: Record<string, unknown>
  shellKind?: DesktopShellKind
}

/**
 * In-memory backend for unit tests and local facade smoke without a real shell.
 */
export function createMockDesktopBackend(
  options: CreateMockDesktopBackendOptions = {},
): DesktopCommandBackend & { state: MockDesktopBackendState } {
  const state: MockDesktopBackendState = {
    version: options.version ?? '0.0.0-mock',
    preferences: new Map(Object.entries(options.preferences ?? {})),
    openedExternalUrls: [],
    shellKind: options.shellKind ?? 'mock',
  }

  const backend: DesktopCommandBackend & { state: MockDesktopBackendState } = {
    shellKind: state.shellKind,
    state,
    async invoke<T = unknown>(command: string, ...args: unknown[]): Promise<T> {
      switch (command) {
        case DESKTOP_P0_COMMANDS.APP_GET_VERSION:
          return state.version as T

        case DESKTOP_P0_COMMANDS.PREFERENCE_GET: {
          const [key, defaultValue] = args as [string, unknown]
          if (state.preferences.has(key)) {
            return state.preferences.get(key) as T
          }
          return defaultValue as T
        }

        case DESKTOP_P0_COMMANDS.PREFERENCE_SET: {
          const [key, value] = args as [string, unknown]
          state.preferences.set(key, value)
          return undefined as T
        }

        case DESKTOP_P0_COMMANDS.DESKTOP_PING: {
          const result: DesktopPingResult = {
            ok: true,
            shell: state.shellKind,
            ts: Date.now(),
          }
          return result as T
        }

        case DESKTOP_P0_COMMANDS.SHELL_OPEN_EXTERNAL: {
          const [url] = args as [string]
          if (typeof url !== 'string' || !url) {
            throw new Error('shell-openExternal requires a non-empty url string')
          }
          state.openedExternalUrls.push(url)
          return true as T
        }

        default:
          throw new Error(`MockDesktopBackend: unknown command "${command}"`)
      }
    },
  }

  return backend
}
