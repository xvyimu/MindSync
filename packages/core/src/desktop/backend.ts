import { DESKTOP_P0_COMMANDS, DESKTOP_SYSTEM_COMMANDS } from './commands'
import type {
  CreateDesktopApiOptions,
  DesktopCommandBackend,
  DesktopLogPaths,
  DesktopP0API,
  DesktopPingResult,
  DesktopShellKind,
} from './types'

/**
 * Build the P0 + B1 desktop API object from a command backend.
 * Shell/commands worktree implements the backend; this factory stays pure TS.
 */
export function createDesktopApiFromBackend(
  backend: DesktopCommandBackend,
  options: CreateDesktopApiOptions = {},
): DesktopP0API {
  const shellKind: DesktopShellKind =
    options.shellKind ?? backend.shellKind ?? 'unknown'

  const api: DesktopP0API = {
    isDesktop: true,
    isElectron: shellKind === 'electron',
    shellKind,
    app: {
      getVersion: () =>
        backend.invoke<string>(DESKTOP_P0_COMMANDS.APP_GET_VERSION),
      setLocale: async (locale: string) => {
        await backend.invoke(DESKTOP_SYSTEM_COMMANDS.APP_SET_LOCALE, locale)
      },
    },
    preference: {
      get: <T>(key: string, defaultValue: T) =>
        backend.invoke<T>(DESKTOP_P0_COMMANDS.PREFERENCE_GET, key, defaultValue),
      set: async <T>(key: string, value: T) => {
        await backend.invoke(DESKTOP_P0_COMMANDS.PREFERENCE_SET, key, value)
      },
    },
    shell: {
      openExternal: (url: string) =>
        backend.invoke(DESKTOP_P0_COMMANDS.SHELL_OPEN_EXTERNAL, url),
    },
    config: {
      getEnvironmentVariables: () =>
        backend.invoke<Record<string, string>>(
          DESKTOP_SYSTEM_COMMANDS.CONFIG_GET_ENVIRONMENT_VARIABLES,
        ),
    },
    logs: {
      getPaths: () =>
        backend.invoke<DesktopLogPaths>(DESKTOP_SYSTEM_COMMANDS.LOGS_GET_PATHS),
      openDirectory: () =>
        backend.invoke<boolean>(DESKTOP_SYSTEM_COMMANDS.LOGS_OPEN_DIRECTORY),
    },
    ping: () =>
      backend.invoke<DesktopPingResult>(DESKTOP_P0_COMMANDS.DESKTOP_PING),
  }

  return api
}
