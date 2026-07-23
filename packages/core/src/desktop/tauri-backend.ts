/**
 * Tauri shell adapter for {@link DesktopCommandBackend}.
 *
 * Uses the global Tauri bridge (`withGlobalTauri` / `__TAURI_INTERNALS__`) so
 * UI packages never import `@tauri-apps/api`. Command names come from
 * {@link DESKTOP_P0_COMMANDS} / {@link DESKTOP_SYSTEM_COMMANDS}; payload is
 * adapted from positional facade args to Tauri's named-arg object. Responses
 * unwrap the Electron-compatible `{ success, data, error }` envelope produced
 * by the Rust commands.
 */

import {
  DESKTOP_P0_COMMANDS,
  DESKTOP_STREAM_COMMANDS,
  DESKTOP_SYSTEM_COMMANDS,
} from './commands'
import type { DesktopCommandBackend, DesktopShellKind } from './types'

type TauriInvoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>

interface IpcErrorBody {
  code?: string
  message?: string
}

interface IpcEnvelope {
  success: boolean
  data?: unknown
  error?: IpcErrorBody | string
}

function getTauriInvoke(): TauriInvoke | null {
  if (typeof window === 'undefined') {
    return null
  }
  const w = window as Window & {
    __TAURI__?: { core?: { invoke?: TauriInvoke } }
    __TAURI_INTERNALS__?: { invoke?: TauriInvoke }
  }

  const fromGlobal = w.__TAURI__?.core?.invoke
  if (typeof fromGlobal === 'function') {
    return fromGlobal.bind(w.__TAURI__!.core)
  }

  const fromInternals = w.__TAURI_INTERNALS__?.invoke
  if (typeof fromInternals === 'function') {
    return fromInternals.bind(w.__TAURI_INTERNALS__)
  }

  return null
}

/** True when a Tauri runtime bridge is present in the current window. */
export function isTauriRuntime(): boolean {
  return getTauriInvoke() !== null
}

/**
 * Map facade positional args → Tauri command payload object.
 * Keep in sync with Rust `#[tauri::command(rename_all = "camelCase")]` params.
 */
function toTauriPayload(
  command: string,
  args: unknown[],
): Record<string, unknown> | undefined {
  switch (command) {
    case DESKTOP_P0_COMMANDS.APP_GET_VERSION:
    case DESKTOP_P0_COMMANDS.DESKTOP_PING:
    case DESKTOP_SYSTEM_COMMANDS.CONFIG_GET_ENVIRONMENT_VARIABLES:
    case DESKTOP_SYSTEM_COMMANDS.LOGS_GET_PATHS:
    case DESKTOP_SYSTEM_COMMANDS.LOGS_OPEN_DIRECTORY:
      return undefined
    case DESKTOP_P0_COMMANDS.PREFERENCE_GET:
      return { key: args[0], defaultValue: args[1] }
    case DESKTOP_P0_COMMANDS.PREFERENCE_SET:
      return { key: args[0], value: args[1] }
    case DESKTOP_P0_COMMANDS.SHELL_OPEN_EXTERNAL:
      return { url: args[0] }
    case DESKTOP_SYSTEM_COMMANDS.APP_SET_LOCALE:
      return { locale: args[0] }
    case DESKTOP_STREAM_COMMANDS.DESKTOP_STREAM_DEMO:
      return {
        streamId: args[0],
        chunkCount: args[1],
        intervalMs: args[2],
      }
    case DESKTOP_STREAM_COMMANDS.STREAM_CANCEL:
      return { streamId: args[0] }
    default:
      // Forward as `{ args }` for future commands; known commands never hit this.
      return args.length > 0 ? { args } : undefined
  }
}

function unwrapEnvelope(raw: unknown, command: string): unknown {
  if (!raw || typeof raw !== 'object' || !('success' in (raw as object))) {
    // Allow raw returns for future non-envelope commands.
    return raw
  }

  const envelope = raw as IpcEnvelope
  if (envelope.success) {
    return envelope.data
  }

  const err = envelope.error
  if (err && typeof err === 'object') {
    const message =
      typeof err.message === 'string' && err.message
        ? err.message
        : `Tauri command failed: ${command}`
    const failure = new Error(message) as Error & { code?: string }
    if (typeof err.code === 'string') {
      failure.code = err.code
    }
    throw failure
  }

  if (typeof err === 'string' && err) {
    throw new Error(err)
  }

  throw new Error(`Tauri command failed: ${command}`)
}

export interface CreateTauriDesktopBackendOptions {
  shellKind?: DesktopShellKind
  /** Inject invoke for tests. */
  invoke?: TauriInvoke
}

/**
 * Build a {@link DesktopCommandBackend} that talks to Tauri commands.
 * Throws on `invoke` if no Tauri bridge is available (unless injected).
 */
export function createTauriDesktopBackend(
  options: CreateTauriDesktopBackendOptions = {},
): DesktopCommandBackend {
  const shellKind: DesktopShellKind = options.shellKind ?? 'tauri'
  const injected = options.invoke

  return {
    shellKind,
    async invoke<T = unknown>(command: string, ...args: unknown[]): Promise<T> {
      const invokeFn = injected ?? getTauriInvoke()
      if (!invokeFn) {
        throw new Error(
          'createTauriDesktopBackend: Tauri invoke bridge not found (is this a Tauri window?)',
        )
      }
      const payload = toTauriPayload(command, args)
      const raw = await invokeFn(command, payload)
      return unwrapEnvelope(raw, command) as T
    },
  }
}
