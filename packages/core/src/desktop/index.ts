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
  DESKTOP_SYSTEM_COMMANDS,
  DESKTOP_SYSTEM_COMMAND_LIST,
  DESKTOP_STREAM_COMMANDS,
  DESKTOP_STREAM_COMMAND_LIST,
  DESKTOP_STREAM_EVENT_PREFIXES,
  type DesktopP0CommandName,
  type DesktopSystemCommandName,
  type DesktopStreamCommandName,
} from './commands'

export type {
  CreateDesktopApiOptions,
  DesktopAppAPI,
  DesktopCommandBackend,
  DesktopConfigAPI,
  DesktopLogPaths,
  DesktopLogsAPI,
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
export {
  createTauriDesktopBackend,
  isTauriRuntime,
  type CreateTauriDesktopBackendOptions,
} from './tauri-backend'
export {
  tryInstallTauriDesktopApi,
  type InstallTauriDesktopApiOptions,
} from './bootstrap'
export {
  createDesktopStreamClient,
  createTauriDesktopStreamClient,
  generateDesktopStreamId,
  isValidDesktopStreamId,
  streamEventName,
  type CreateDesktopStreamClientOptions,
  type CreateTauriDesktopStreamClientOptions,
  type DesktopStreamClient,
  type DesktopStreamDemoCallbacks,
  type DesktopStreamInvokeBridge,
  type DesktopStreamListenBridge,
  type DesktopStreamUnlisten,
  type RunDesktopStreamDemoOptions,
} from './stream'
export {
  createMockStreamTransport,
  type CreateMockStreamTransportOptions,
  type MockStreamTransport,
  type MockStreamTransportState,
} from './mock-stream'
