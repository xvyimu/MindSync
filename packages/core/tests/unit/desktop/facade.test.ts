import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createDesktopApiFromBackend,
  createMockDesktopBackend,
  DESKTOP_P0_COMMANDS,
  DESKTOP_P0_COMMAND_LIST,
  installDesktopApi,
  resolveDesktopApi,
  uninstallDesktopApi,
} from '../../../src/desktop'
import {
  isDesktopApiReady,
  isRunningInDesktop,
  isRunningInElectron,
  waitForDesktopApi,
} from '../../../src/utils/environment'

describe('desktop detection', () => {
  const originalPlatform = process.env.VITE_APP_PLATFORM

  beforeEach(() => {
    delete process.env.VITE_APP_PLATFORM
    vi.unstubAllGlobals()
    uninstallDesktopApi()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    if (originalPlatform === undefined) {
      delete process.env.VITE_APP_PLATFORM
    } else {
      process.env.VITE_APP_PLATFORM = originalPlatform
    }
    uninstallDesktopApi()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('Web: bare window must not be detected as desktop/electron', () => {
    vi.stubGlobal('window', {})

    expect(isRunningInDesktop()).toBe(false)
    expect(isRunningInElectron()).toBe(false)
    expect(isDesktopApiReady()).toBe(false)
    expect(resolveDesktopApi()).toBeNull()
  })

  it('Web: window without bridge + unrelated process must stay false', () => {
    vi.stubGlobal('window', {
      process: { type: 'browser' },
    })

    expect(isRunningInDesktop()).toBe(false)
    expect(isRunningInElectron()).toBe(false)
  })

  it('env VITE_APP_PLATFORM=web forces non-desktop even if electronAPI exists', () => {
    process.env.VITE_APP_PLATFORM = 'web'
    vi.stubGlobal('window', {
      electronAPI: {
        app: { getVersion: async () => '1.0.0' },
        preference: {
          get: async (_k: string, d: unknown) => d,
          set: async () => {},
        },
        shell: { openExternal: async () => true },
      },
    })

    expect(isRunningInDesktop()).toBe(false)
    expect(isRunningInElectron()).toBe(false)
  })

  it('env VITE_APP_PLATFORM=electron enables electron+desktop', () => {
    process.env.VITE_APP_PLATFORM = 'electron'
    vi.stubGlobal('window', {})

    expect(isRunningInDesktop()).toBe(true)
    expect(isRunningInElectron()).toBe(true)
  })

  it('env VITE_APP_PLATFORM=tauri is desktop but not electron', () => {
    process.env.VITE_APP_PLATFORM = 'tauri'
    vi.stubGlobal('window', {})

    expect(isRunningInDesktop()).toBe(true)
    expect(isRunningInElectron()).toBe(false)
  })

  it('auto-detect: electronAPI P0 surface marks desktop ready', () => {
    vi.stubGlobal('window', {
      electronAPI: {
        app: { getVersion: async () => '2.11.7' },
        preference: {
          get: async (_k: string, d: unknown) => d,
          set: async () => {},
        },
        shell: { openExternal: async () => true },
      },
    })

    expect(isRunningInDesktop()).toBe(true)
    expect(isRunningInElectron()).toBe(true)
    expect(isDesktopApiReady()).toBe(true)
  })

  it('auto-detect: desktopAPI only (Tauri-style) marks desktop ready', () => {
    vi.stubGlobal('window', {
      desktopAPI: {
        isDesktop: true as const,
        app: { getVersion: async () => '2.11.7' },
        preference: {
          get: async (_k: string, d: unknown) => d,
          set: async () => {},
        },
        shell: { openExternal: async () => true },
      },
    })

    expect(isRunningInDesktop()).toBe(true)
    // Without platform env, bridge presence keeps isRunningInElectron true for legacy paths
    expect(isRunningInElectron()).toBe(true)
    expect(isDesktopApiReady()).toBe(true)
    expect(resolveDesktopApi()).not.toBeNull()
  })

  it('waitForDesktopApi resolves when API is installed after start', async () => {
    const w: Record<string, unknown> = {}
    vi.stubGlobal('window', w)

    const waiting = waitForDesktopApi(1000)
    const backend = createMockDesktopBackend({ version: '9.9.9' })
    const api = createDesktopApiFromBackend(backend)
    // Install after a short delay so the poll path runs
    await new Promise((r) => setTimeout(r, 80))
    installDesktopApi(api)

    await expect(waiting).resolves.toBe(true)
    expect(isDesktopApiReady()).toBe(true)
  })
})

describe('desktop mock facade (P0)', () => {
  beforeEach(() => {
    delete process.env.VITE_APP_PLATFORM
    vi.unstubAllGlobals()
    vi.stubGlobal('window', {})
    uninstallDesktopApi()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    uninstallDesktopApi()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('exposes the P0 command name table for shell/commands wt', () => {
    expect(DESKTOP_P0_COMMAND_LIST).toEqual([
      'app-get-version',
      'preference-get',
      'preference-set',
      'desktop-ping',
      'shell-openExternal',
    ])
    expect(DESKTOP_P0_COMMANDS.APP_GET_VERSION).toBe('app-get-version')
    expect(DESKTOP_P0_COMMANDS.DESKTOP_PING).toBe('desktop-ping')
  })

  it('mock backend round-trips version, preference, ping, openExternal', async () => {
    const backend = createMockDesktopBackend({
      version: '2.11.7-mock',
      preferences: { theme: 'dark' },
    })
    const api = createDesktopApiFromBackend(backend, { shellKind: 'mock' })
    installDesktopApi(api)

    expect(isRunningInDesktop()).toBe(true)
    expect(isDesktopApiReady()).toBe(true)

    const resolved = resolveDesktopApi()
    expect(resolved).not.toBeNull()
    expect(await resolved!.app.getVersion()).toBe('2.11.7-mock')
    expect(await resolved!.preference.get('theme', 'light')).toBe('dark')
    expect(await resolved!.preference.get('missing', 'fallback')).toBe('fallback')
    await resolved!.preference.set('locale', 'zh-CN')
    expect(await resolved!.preference.get('locale', '')).toBe('zh-CN')

    const ping = await resolved!.ping!()
    expect(ping.ok).toBe(true)
    expect(ping.shell).toBe('mock')
    expect(typeof ping.ts).toBe('number')

    await resolved!.shell.openExternal('https://example.com/docs')
    expect(backend.state.openedExternalUrls).toEqual(['https://example.com/docs'])

    // electronAPI alias installed for legacy proxies
    expect((window as any).electronAPI.app.getVersion).toBeTypeOf('function')
    expect((window as any).desktopAPI.app.getVersion).toBeTypeOf('function')
  })

  it('rejects unknown commands on the mock backend', async () => {
    const backend = createMockDesktopBackend()
    await expect(backend.invoke('not-a-real-command')).rejects.toThrow(/unknown command/)
  })
})
