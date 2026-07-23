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
