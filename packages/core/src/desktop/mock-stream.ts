/**
 * In-process mock stream transport for unit tests (no real Tauri / API keys).
 *
 * Proves: start → abort → no further content chunks after cancel.
 */

import {
  DESKTOP_STREAM_COMMANDS,
  DESKTOP_STREAM_EVENT_PREFIXES,
} from './commands'
import {
  createDesktopStreamClient,
  isValidDesktopStreamId,
  streamEventName,
  type DesktopStreamClient,
  type DesktopStreamUnlisten,
} from './stream'

export interface MockStreamTransportState {
  /** Content tokens emitted per streamId (including those before cancel). */
  emittedContent: Map<string, string[]>
  /** streamIds that received finish. */
  finished: Set<string>
  /** streamIds that were cancelled. */
  cancelled: Set<string>
  /** Active abort flags. */
  active: Map<string, { aborted: boolean }>
}

export interface CreateMockStreamTransportOptions {
  /** Default chunk count for demo streams. */
  chunkCount?: number
  /** Default interval between chunks (ms). */
  intervalMs?: number
}

export interface MockStreamTransport {
  state: MockStreamTransportState
  client: DesktopStreamClient
  /** Low-level invoke used by the client (also testable alone). */
  invoke: <T = unknown>(
    command: string,
    args?: Record<string, unknown>,
  ) => Promise<T>
}

/**
 * Create a mock shell stream bus + client.
 */
export function createMockStreamTransport(
  options: CreateMockStreamTransportOptions = {},
): MockStreamTransport {
  const defaultChunks = options.chunkCount ?? 8
  const defaultInterval = options.intervalMs ?? 15

  const state: MockStreamTransportState = {
    emittedContent: new Map(),
    finished: new Set(),
    cancelled: new Set(),
    active: new Map(),
  }

  type Handler = (payload: unknown) => void
  const listeners = new Map<string, Set<Handler>>()

  const listen = (
    event: string,
    handler: Handler,
  ): DesktopStreamUnlisten => {
    let set = listeners.get(event)
    if (!set) {
      set = new Set()
      listeners.set(event, set)
    }
    set.add(handler)
    return () => {
      set!.delete(handler)
      if (set!.size === 0) listeners.delete(event)
    }
  }

  const emit = (event: string, payload: unknown) => {
    const set = listeners.get(event)
    if (!set) return
    for (const handler of [...set]) {
      handler(payload)
    }
  }

  const invoke = async <T = unknown>(
    command: string,
    args: Record<string, unknown> = {},
  ): Promise<T> => {
    if (command === DESKTOP_STREAM_COMMANDS.STREAM_CANCEL) {
      const streamId = String(args.streamId ?? '')
      if (!isValidDesktopStreamId(streamId)) {
        const err = new Error('Invalid IPC stream identifier') as Error & {
          code: string
        }
        err.code = 'IPC_INVALID_STREAM_ID'
        throw err
      }
      const entry = state.active.get(streamId)
      if (!entry) {
        const err = new Error('IPC stream was not found') as Error & {
          code: string
        }
        err.code = 'IPC_STREAM_NOT_FOUND'
        throw err
      }
      entry.aborted = true
      state.active.delete(streamId)
      state.cancelled.add(streamId)
      return { cancelled: true } as T
    }

    if (command === DESKTOP_STREAM_COMMANDS.DESKTOP_STREAM_DEMO) {
      const streamId = String(args.streamId ?? '')
      if (!isValidDesktopStreamId(streamId)) {
        const err = new Error('Invalid IPC stream identifier') as Error & {
          code: string
        }
        err.code = 'IPC_INVALID_STREAM_ID'
        throw err
      }
      if (state.active.has(streamId)) {
        const err = new Error('IPC stream identifier is already active') as Error & {
          code: string
        }
        err.code = 'IPC_STREAM_ALREADY_EXISTS'
        throw err
      }

      const chunks =
        typeof args.chunkCount === 'number' && args.chunkCount > 0
          ? Math.min(64, Math.floor(args.chunkCount))
          : defaultChunks
      const interval =
        typeof args.intervalMs === 'number' && args.intervalMs > 0
          ? Math.min(2_000, Math.floor(args.intervalMs))
          : defaultInterval

      const entry = { aborted: false }
      state.active.set(streamId, entry)
      state.emittedContent.set(streamId, [])

      const contentEvent = streamEventName(
        DESKTOP_STREAM_EVENT_PREFIXES.content,
        streamId,
      )
      const finishEvent = streamEventName(
        DESKTOP_STREAM_EVENT_PREFIXES.finish,
        streamId,
      )

      let assembled = ''
      for (let i = 0; i < chunks; i += 1) {
        if (entry.aborted) {
          return null as T
        }
        const token = `chunk-${i}`
        assembled += token
        state.emittedContent.get(streamId)!.push(token)
        emit(contentEvent, token)
        await new Promise((r) => setTimeout(r, interval))
      }

      if (entry.aborted) {
        return null as T
      }

      state.finished.add(streamId)
      state.active.delete(streamId)
      emit(finishEvent, { content: assembled })
      return null as T
    }

    throw new Error(`MockStreamTransport: unknown command "${command}"`)
  }

  const client = createDesktopStreamClient({ invoke, listen })

  return { state, client, invoke }
}
