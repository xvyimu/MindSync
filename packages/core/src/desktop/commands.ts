/**
 * Stable invoke command names for the desktop shell (Electron IPC / Tauri commands).
 *
 * Keep this map as the SSOT for the shell/commands worktree. Renderer code must
 * not hard-code raw channel strings outside this module (or the Electron preload
 * which historically inlined the same names).
 */

/** P0 command names required by M2 facade + first vertical slice. */
export const DESKTOP_P0_COMMANDS = {
  /** Read app version string (semver product version). */
  APP_GET_VERSION: 'app-get-version',
  /** Non-secret preference get: (key, defaultValue) → value */
  PREFERENCE_GET: 'preference-get',
  /** Non-secret preference set: (key, value) → void */
  PREFERENCE_SET: 'preference-set',
  /** Health probe: () → { ok, shell, ts } */
  DESKTOP_PING: 'desktop-ping',
  /** Open URL in system browser: (url) → void | data */
  SHELL_OPEN_EXTERNAL: 'shell-openExternal',
} as const

export type DesktopP0CommandName =
  (typeof DESKTOP_P0_COMMANDS)[keyof typeof DESKTOP_P0_COMMANDS]

/** Ordered list for shell/commands registration checklists. */
export const DESKTOP_P0_COMMAND_LIST: readonly DesktopP0CommandName[] = [
  DESKTOP_P0_COMMANDS.APP_GET_VERSION,
  DESKTOP_P0_COMMANDS.PREFERENCE_GET,
  DESKTOP_P0_COMMANDS.PREFERENCE_SET,
  DESKTOP_P0_COMMANDS.DESKTOP_PING,
  DESKTOP_P0_COMMANDS.SHELL_OPEN_EXTERNAL,
]

/**
 * B1 system + app channels (Electron `SYSTEM_CHANNELS` parity subset).
 * P0 already covers version / openExternal / desktop-ping.
 */
export const DESKTOP_SYSTEM_COMMANDS = {
  /** Public VITE_* whitelist: () → Record<string, string> */
  CONFIG_GET_ENVIRONMENT_VARIABLES: 'config-getEnvironmentVariables',
  /** Sync UI locale to shell chrome: (locale) → null */
  APP_SET_LOCALE: 'app-set-locale',
  /** Log path map under userData/logs */
  LOGS_GET_PATHS: 'logs-get-paths',
  /** Open log directory in OS file manager */
  LOGS_OPEN_DIRECTORY: 'logs-open-directory',
} as const

export type DesktopSystemCommandName =
  (typeof DESKTOP_SYSTEM_COMMANDS)[keyof typeof DESKTOP_SYSTEM_COMMANDS]

export const DESKTOP_SYSTEM_COMMAND_LIST: readonly DesktopSystemCommandName[] = [
  DESKTOP_SYSTEM_COMMANDS.CONFIG_GET_ENVIRONMENT_VARIABLES,
  DESKTOP_SYSTEM_COMMANDS.APP_SET_LOCALE,
  DESKTOP_SYSTEM_COMMANDS.LOGS_GET_PATHS,
  DESKTOP_SYSTEM_COMMANDS.LOGS_OPEN_DIRECTORY,
]

/**
 * M4 stream + Abort command names (Electron parity + Tauri mock demo).
 *
 * Electron uses `llm-sendMessageStream` + `stream-cancel` with the same
 * event channel prefixes. Tauri M4 proves cancel via `desktop-stream-demo`.
 */
export const DESKTOP_STREAM_COMMANDS = {
  /** Mock stream start: (streamId, chunkCount?, intervalMs?) → null */
  DESKTOP_STREAM_DEMO: 'desktop-stream-demo',
  /** Cancel active stream: (streamId) → { cancelled: true } */
  STREAM_CANCEL: 'stream-cancel',
} as const

export type DesktopStreamCommandName =
  (typeof DESKTOP_STREAM_COMMANDS)[keyof typeof DESKTOP_STREAM_COMMANDS]

export const DESKTOP_STREAM_COMMAND_LIST: readonly DesktopStreamCommandName[] = [
  DESKTOP_STREAM_COMMANDS.DESKTOP_STREAM_DEMO,
  DESKTOP_STREAM_COMMANDS.STREAM_CANCEL,
]

/**
 * Event channel prefixes (Electron `LLM_STREAM_CHANNELS` parity).
 * Full event name = `${prefix}-${streamId}` (e.g. `stream-content-stream_1`).
 */
export const DESKTOP_STREAM_EVENT_PREFIXES = {
  content: 'stream-content',
  thinking: 'stream-thinking',
  finish: 'stream-finish',
  error: 'stream-error',
} as const
