/**
 * Desktop stream client — AbortSignal → stream-cancel, chunk events by streamId.
 *
 * Aligns with Electron preload:
 * - client generates `stream_${ts}_${rand}`
 * - listen `stream-content|finish|error-${streamId}`
 * - invoke start command (demo or future llm-sendMessageStream)
 * - on AbortSignal → invoke `stream-cancel` + reject IPC_STREAM_CANCELLED
 *
 * UI must not import `@tauri-apps/api`; use global Tauri bridge or inject deps.
 */

import {
  DESKTOP_STREAM_COMMANDS,
  DESKTOP_STREAM_EVENT_PREFIXES,
} from './commands'

export type DesktopStreamUnlisten = () => void

export interface DesktopStreamListenBridge {
  /**
   * Subscribe to a Tauri/Electron-style event name.
   * Handler receives the business payload only (not the event envelope).
   */
  listen(
    event: string,
    handler: (payload: unknown) => void,
  ): DesktopStreamUnlisten | Promise<DesktopStreamUnlisten>
}

export interface DesktopStreamInvokeBridge {
  /**
   * Invoke a named command. Returns unwrapped business data when using
   * {@link createTauriDesktopBackend}; may also accept raw envelope if
   * `unwrapEnvelope` is provided by the factory.
   */
  invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T>
}

export interface DesktopStreamDemoCallbacks {
  onContent?: (token: string) => void
  onFinish?: (response: { content: string }) => void
  onError?: (error: Error) => void
}

export interface RunDesktopStreamDemoOptions extends DesktopStreamDemoCallbacks {
  /** Optional fixed id (tests); otherwise generated like Electron preload. */
  streamId?: string
  chunkCount?: number
  intervalMs?: number
  signal?: AbortSignal
}

export interface DesktopStreamClient {
  /** Generate a stream id matching Electron preload shape. */
  generateStreamId(): string
  /** Cancel by id (shell `stream-cancel`). */
  cancelStream(streamId: string): Promise<{ cancelled: boolean }>
  /**
   * Start mock stream demo, forward chunks, honor AbortSignal.
   * Rejects with `{ code: 'IPC_STREAM_CANCELLED' }` when aborted.
   */
  runDemoStream(options?: RunDesktopStreamDemoOptions): Promise<void>
}

export interface CreateDesktopStreamClientOptions {
  invoke: DesktopStreamInvokeBridge['invoke']
  listen: DesktopStreamListenBridge['listen']
}

/** Electron / facade stream id pattern (ipc-security STREAM_ID_PATTERN). */
const STREAM_ID_PATTERN = /^[A-Za-z0-9_-]{1,96}$/

export function isValidDesktopStreamId(streamId: string): boolean {
  return typeof streamId === 'string' && STREAM_ID_PATTERN.test(streamId)
}

export function generateDesktopStreamId(): string {
  return `stream_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export function streamEventName(
  prefix: (typeof DESKTOP_STREAM_EVENT_PREFIXES)[keyof typeof DESKTOP_STREAM_EVENT_PREFIXES],
  streamId: string,
): string {
  return `${prefix}-${streamId}`
}

function createStreamCancelledError(): Error & { code: string } {
  const error = new Error('IPC stream was cancelled') as Error & { code: string }
  error.code = 'IPC_STREAM_CANCELLED'
  return error
}

/**
 * Build a stream client over injectible invoke/listen (Tauri global or mock).
 */
export function createDesktopStreamClient(
  options: CreateDesktopStreamClientOptions,
): DesktopStreamClient {
  const { invoke, listen } = options

  async function cancelStream(streamId: string): Promise<{ cancelled: boolean }> {
    if (!isValidDesktopStreamId(streamId)) {
      const err = new Error('Invalid IPC stream identifier') as Error & { code: string }
      err.code = 'IPC_INVALID_STREAM_ID'
      throw err
    }
    return invoke<{ cancelled: boolean }>(DESKTOP_STREAM_COMMANDS.STREAM_CANCEL, {
      streamId,
    })
  }

  async function runDemoStream(
    runOptions: RunDesktopStreamDemoOptions = {},
  ): Promise<void> {
    const streamId = runOptions.streamId ?? generateDesktopStreamId()
    if (!isValidDesktopStreamId(streamId)) {
      const err = new Error('Invalid IPC stream identifier') as Error & { code: string }
      err.code = 'IPC_INVALID_STREAM_ID'
      throw err
    }

    const signal = runOptions.signal
    if (signal?.aborted) {
      throw createStreamCancelledError()
    }

    const unlisteners: DesktopStreamUnlisten[] = []
    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      for (const off of unlisteners) {
        try {
          off()
        } catch {
          /* ignore */
        }
      }
      unlisteners.length = 0
    }

    const contentEvent = streamEventName(
      DESKTOP_STREAM_EVENT_PREFIXES.content,
      streamId,
    )
    const finishEvent = streamEventName(
      DESKTOP_STREAM_EVENT_PREFIXES.finish,
      streamId,
    )
    const errorEvent = streamEventName(
      DESKTOP_STREAM_EVENT_PREFIXES.error,
      streamId,
    )

    const offContent = await listen(contentEvent, (payload) => {
      if (typeof payload === 'string') {
        runOptions.onContent?.(payload)
      } else if (payload != null) {
        runOptions.onContent?.(String(payload))
      }
    })
    unlisteners.push(offContent)

    const offFinish = await listen(finishEvent, (payload) => {
      const response =
        payload && typeof payload === 'object' && 'content' in (payload as object)
          ? (payload as { content: string })
          : { content: payload == null ? '' : String(payload) }
      runOptions.onFinish?.(response)
    })
    unlisteners.push(offFinish)

    const offError = await listen(errorEvent, (payload) => {
      const message =
        typeof payload === 'string'
          ? payload
          : payload instanceof Error
            ? payload.message
            : String(payload ?? 'stream error')
      runOptions.onError?.(new Error(message))
    })
    unlisteners.push(offError)

    let rejectAbort: ((reason: unknown) => void) | undefined
    let abortPromise: Promise<never> | null = null
    let abortListener: (() => void) | undefined

    if (signal) {
      abortPromise = new Promise<never>((_, reject) => {
        rejectAbort = reject
      })
      abortListener = () => {
        cleanup()
        void cancelStream(streamId)
          .catch(() => {})
          .finally(() => {
            rejectAbort?.(createStreamCancelledError())
          })
      }
      if (signal.aborted) {
        abortListener()
      } else {
        signal.addEventListener('abort', abortListener, { once: true })
      }
    }

    try {
      const request = invoke(DESKTOP_STREAM_COMMANDS.DESKTOP_STREAM_DEMO, {
        streamId,
        chunkCount: runOptions.chunkCount,
        intervalMs: runOptions.intervalMs,
      })
      if (abortPromise) {
        await Promise.race([request, abortPromise])
      } else {
        await request
      }
    } finally {
      cleanup()
      if (signal && abortListener) {
        signal.removeEventListener('abort', abortListener)
      }
    }
  }

  return {
    generateStreamId: generateDesktopStreamId,
    cancelStream,
    runDemoStream,
  }
}

type TauriEventListen = (
  event: string,
  handler: (event: { payload: unknown }) => void,
) => Promise<() => void> | (() => void)

function getTauriEventListen(): TauriEventListen | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    __TAURI__?: { event?: { listen?: TauriEventListen } }
  }
  const listen = w.__TAURI__?.event?.listen
  return typeof listen === 'function' ? listen.bind(w.__TAURI__!.event) : null
}

function getTauriInvoke():
  | ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>)
  | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    __TAURI__?: { core?: { invoke?: (c: string, a?: Record<string, unknown>) => Promise<unknown> } }
    __TAURI_INTERNALS__?: { invoke?: (c: string, a?: Record<string, unknown>) => Promise<unknown> }
  }
  if (typeof w.__TAURI__?.core?.invoke === 'function') {
    return w.__TAURI__.core.invoke.bind(w.__TAURI__.core)
  }
  if (typeof w.__TAURI_INTERNALS__?.invoke === 'function') {
    return w.__TAURI_INTERNALS__.invoke.bind(w.__TAURI_INTERNALS__)
  }
  return null
}

interface IpcEnvelope {
  success: boolean
  data?: unknown
  error?: { code?: string; message?: string } | string
}

function unwrapEnvelope(raw: unknown, command: string): unknown {
  if (!raw || typeof raw !== 'object' || !('success' in (raw as object))) {
    return raw
  }
  const envelope = raw as IpcEnvelope
  if (envelope.success) {
    return envelope.data
  }
  const err = envelope.error
  if (err && typeof err === 'object') {
    const failure = new Error(
      typeof err.message === 'string' && err.message
        ? err.message
        : `Tauri command failed: ${command}`,
    ) as Error & { code?: string }
    if (typeof err.code === 'string') failure.code = err.code
    throw failure
  }
  if (typeof err === 'string' && err) throw new Error(err)
  throw new Error(`Tauri command failed: ${command}`)
}

export interface CreateTauriDesktopStreamClientOptions {
  invoke?: DesktopStreamInvokeBridge['invoke']
  listen?: DesktopStreamListenBridge['listen']
}

/**
 * Stream client wired to the global Tauri bridge (`withGlobalTauri`).
 * Throws if bridge is missing unless injects are provided.
 */
export function createTauriDesktopStreamClient(
  options: CreateTauriDesktopStreamClientOptions = {},
): DesktopStreamClient {
  const rawInvoke = options.invoke
  const rawListen = options.listen

  const invoke: DesktopStreamInvokeBridge['invoke'] = async (command, args) => {
    if (rawInvoke) {
      return rawInvoke(command, args)
    }
    const inv = getTauriInvoke()
    if (!inv) {
      throw new Error(
        'createTauriDesktopStreamClient: Tauri invoke bridge not found',
      )
    }
    const raw = await inv(command, args)
    return unwrapEnvelope(raw, command)
  }

  const listen: DesktopStreamListenBridge['listen'] = (event, handler) => {
    if (rawListen) {
      return rawListen(event, handler)
    }
    const tauriListen = getTauriEventListen()
    if (!tauriListen) {
      throw new Error(
        'createTauriDesktopStreamClient: Tauri event.listen bridge not found',
      )
    }
    const result = tauriListen(event, (e) => handler(e.payload))
    return result
  }

  return createDesktopStreamClient({ invoke, listen })
}
