/**
 * Desktop facade — stable renderer-facing API for Electron / Tauri shells.
 *
 * UI and domain proxies must not import `@tauri-apps/api` directly.
 * Shell/commands worktree implements {@link DesktopCommandBackend};
 * this package builds and installs the P0 surface.
 */

export {
  DESKTOP_P0_COMMANDS,
  DESKTOP_P0_COMMAND_LIST,
  type DesktopP0CommandName,
} from './commands'

export type {
  CreateDesktopApiOptions,
  DesktopAppAPI,
  DesktopCommandBackend,
  DesktopP0API,
  DesktopPingResult,
  DesktopPreferenceP0API,
  DesktopShellAPI,
  DesktopShellKind,
  InstallDesktopApiOptions,
} from './types'

export { createDesktopApiFromBackend } from './backend'
export {
  createMockDesktopBackend,
  type CreateMockDesktopBackendOptions,
  type MockDesktopBackendState,
} from './mock'
export {
  installDesktopApi,
  resolveDesktopApi,
  uninstallDesktopApi,
} from './install'
