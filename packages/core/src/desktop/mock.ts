import { DESKTOP_P0_COMMANDS, DESKTOP_SYSTEM_COMMANDS } from './commands'
import type {
  DesktopCommandBackend,
  DesktopLogPaths,
  DesktopPingResult,
  DesktopShellKind,
} from './types'

export interface MockDesktopBackendState {
  version: string
  preferences: Map<string, unknown>
  openedExternalUrls: string[]
  publicEnv: Record<string, string>
  locale: string | null
  logPaths: DesktopLogPaths
  openedLogDirectory: boolean
  shellKind: DesktopShellKind
}

export interface CreateMockDesktopBackendOptions {
  version?: string
  preferences?: Record<string, unknown>
  publicEnv?: Record<string, string>
  logPaths?: Partial<DesktopLogPaths>
  shellKind?: DesktopShellKind
}

const DEFAULT_LOG_PATHS: DesktopLogPaths = {
  logDir: '/mock/userData/logs',
  main: '/mock/userData/logs/main.log',
  desktop: '/mock/userData/logs/desktop.log',
  updater: '/mock/userData/logs/updater.log',
  ipc: '/mock/userData/logs/ipc.log',
  error: '/mock/userData/logs/error.log',
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
    publicEnv: { ...(options.publicEnv ?? {}) },
    locale: null,
    logPaths: { ...DEFAULT_LOG_PATHS, ...(options.logPaths ?? {}) },
    openedLogDirectory: false,
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

        case DESKTOP_SYSTEM_COMMANDS.CONFIG_GET_ENVIRONMENT_VARIABLES:
          return { ...state.publicEnv } as T

        case DESKTOP_SYSTEM_COMMANDS.APP_SET_LOCALE: {
          const [locale] = args as [string]
          state.locale = typeof locale === 'string' ? locale : null
          return null as T
        }

        case DESKTOP_SYSTEM_COMMANDS.LOGS_GET_PATHS:
          return { ...state.logPaths } as T

        case DESKTOP_SYSTEM_COMMANDS.LOGS_OPEN_DIRECTORY:
          state.openedLogDirectory = true
          return true as T

        default:
          throw new Error(`MockDesktopBackend: unknown command "${command}"`)
      }
    },
  }

  return backend
}
