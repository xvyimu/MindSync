import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { isDarkThemeRef } = vi.hoisted(() => {
  // plain ref-like; glass-shell only reads .value in getter / sync
  return {
    isDarkThemeRef: { value: true as boolean },
  }
})

vi.mock('../../src/config/naive-theme', () => ({
  isDarkTheme: isDarkThemeRef,
}))

import {
  isGlassShellEnabled,
  applyGlassShellDocumentClass,
  syncGlassShellScheme,
  GLASS_SHELL_STORAGE_KEY,
} from '../../src/config/glass-shell'

describe('isGlassShellEnabled (Fluent glass flag)', () => {
  const originalLocation = window.location

  beforeEach(() => {
    window.localStorage.removeItem(GLASS_SHELL_STORAGE_KEY)
    document.documentElement.classList.remove('glass-shell-on')
    document.documentElement.removeAttribute('data-glass-scheme')
    isDarkThemeRef.value = true
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, search: '' },
    })
  })

  afterEach(() => {
    applyGlassShellDocumentClass(false)
    window.localStorage.removeItem(GLASS_SHELL_STORAGE_KEY)
    document.documentElement.classList.remove('glass-shell-on')
    document.documentElement.removeAttribute('data-glass-scheme')
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('defaults to false', () => {
    expect(isGlassShellEnabled()).toBe(false)
  })

  it('reads localStorage ui:glass-shell=1', () => {
    window.localStorage.setItem(GLASS_SHELL_STORAGE_KEY, '1')
    expect(isGlassShellEnabled()).toBe(true)
  })

  it('enables from ?glassShell=1 and persists to localStorage', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, search: '?glassShell=1' },
    })
    expect(isGlassShellEnabled()).toBe(true)
    expect(window.localStorage.getItem(GLASS_SHELL_STORAGE_KEY)).toBe('1')
  })

  it('disables from ?glassShell=0 and clears storage', () => {
    window.localStorage.setItem(GLASS_SHELL_STORAGE_KEY, '1')
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, search: '?glassShell=0' },
    })
    expect(isGlassShellEnabled()).toBe(false)
    expect(window.localStorage.getItem(GLASS_SHELL_STORAGE_KEY)).toBeNull()
  })

  it('toggles documentElement class and scheme from product theme', () => {
    isDarkThemeRef.value = true
    applyGlassShellDocumentClass(true)
    expect(document.documentElement.classList.contains('glass-shell-on')).toBe(true)
    expect(document.documentElement.dataset.glassScheme).toBe('dark')

    isDarkThemeRef.value = false
    syncGlassShellScheme()
    expect(document.documentElement.dataset.glassScheme).toBe('light')

    applyGlassShellDocumentClass(false)
    expect(document.documentElement.classList.contains('glass-shell-on')).toBe(false)
    expect(document.documentElement.dataset.glassScheme).toBeUndefined()
  })
})
