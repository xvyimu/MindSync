import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createMockStreamTransport,
  DESKTOP_STREAM_COMMANDS,
  DESKTOP_STREAM_COMMAND_LIST,
  DESKTOP_STREAM_EVENT_PREFIXES,
  generateDesktopStreamId,
  isValidDesktopStreamId,
  streamEventName,
} from '../../../src/desktop'

describe('desktop stream command map (M4)', () => {
  it('exposes demo + cancel command names aligned with Electron cancel channel', () => {
    expect(DESKTOP_STREAM_COMMAND_LIST).toEqual([
      'desktop-stream-demo',
      'stream-cancel',
    ])
    expect(DESKTOP_STREAM_COMMANDS.STREAM_CANCEL).toBe('stream-cancel')
    expect(DESKTOP_STREAM_EVENT_PREFIXES.content).toBe('stream-content')
    expect(DESKTOP_STREAM_EVENT_PREFIXES.finish).toBe('stream-finish')
    expect(DESKTOP_STREAM_EVENT_PREFIXES.error).toBe('stream-error')
  })

  it('stream id helpers match Electron STREAM_ID_PATTERN', () => {
    const id = generateDesktopStreamId()
    expect(id).toMatch(/^stream_\d+_[a-z0-9]+$/)
    expect(isValidDesktopStreamId(id)).toBe(true)
    expect(isValidDesktopStreamId('')).toBe(false)
    expect(isValidDesktopStreamId('bad id')).toBe(false)
    expect(streamEventName('stream-content', 'stream_1')).toBe(
      'stream-content-stream_1',
    )
  })
})

describe('desktop mock stream transport: start → abort → no further chunks', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('completes a full demo stream when not aborted', async () => {
    const transport = createMockStreamTransport({
      chunkCount: 4,
      intervalMs: 5,
    })
    const tokens: string[] = []
    let finished: { content: string } | null = null

    await transport.client.runDemoStream({
      streamId: 'stream_full_demo',
      chunkCount: 4,
      intervalMs: 5,
      onContent: (t) => tokens.push(t),
      onFinish: (r) => {
        finished = r
      },
    })

    expect(tokens).toEqual(['chunk-0', 'chunk-1', 'chunk-2', 'chunk-3'])
    expect(finished).toEqual({
      content: 'chunk-0chunk-1chunk-2chunk-3',
    })
    expect(transport.state.finished.has('stream_full_demo')).toBe(true)
    expect(transport.state.cancelled.has('stream_full_demo')).toBe(false)
  })

  it('AbortSignal cancels mid-stream and rejects with IPC_STREAM_CANCELLED; no more chunks after abort', async () => {
    const transport = createMockStreamTransport({
      chunkCount: 20,
      intervalMs: 25,
    })
    const tokens: string[] = []
    const controller = new AbortController()

    const pending = transport.client.runDemoStream({
      streamId: 'stream_abort_demo',
      chunkCount: 20,
      intervalMs: 25,
      signal: controller.signal,
      onContent: (t) => {
        tokens.push(t)
        // Abort after the first content chunk so later chunks must not arrive.
        if (tokens.length === 1) {
          controller.abort()
        }
      },
    })

    await expect(pending).rejects.toMatchObject({
      code: 'IPC_STREAM_CANCELLED',
      message: 'IPC stream was cancelled',
    })

    const countAtReject = tokens.length
    expect(countAtReject).toBeGreaterThanOrEqual(1)
    expect(countAtReject).toBeLessThan(20)
    expect(transport.state.cancelled.has('stream_abort_demo')).toBe(true)
    expect(transport.state.finished.has('stream_abort_demo')).toBe(false)

    // Wait longer than remaining chunk schedule; no additional content may arrive.
    await new Promise((r) => setTimeout(r, 200))
    expect(tokens.length).toBe(countAtReject)
  })

  it('pre-aborted signal rejects without starting shell work', async () => {
    const transport = createMockStreamTransport()
    const controller = new AbortController()
    controller.abort()

    await expect(
      transport.client.runDemoStream({
        streamId: 'stream_pre_abort',
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: 'IPC_STREAM_CANCELLED' })

    expect(transport.state.active.size).toBe(0)
    expect(transport.state.emittedContent.has('stream_pre_abort')).toBe(false)
  })

  it('cancelStream invokes stream-cancel command', async () => {
    const transport = createMockStreamTransport({ intervalMs: 50 })
    // Start without waiting so we can cancel mid-flight via cancelStream API.
    const started = transport.invoke(DESKTOP_STREAM_COMMANDS.DESKTOP_STREAM_DEMO, {
      streamId: 'stream_manual_cancel',
      chunkCount: 10,
      intervalMs: 40,
    })

    await new Promise((r) => setTimeout(r, 20))
    const result = await transport.client.cancelStream('stream_manual_cancel')
    expect(result).toEqual({ cancelled: true })
    await started
    expect(transport.state.cancelled.has('stream_manual_cancel')).toBe(true)
  })
})
