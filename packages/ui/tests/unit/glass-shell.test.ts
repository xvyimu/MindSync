import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isGlassShellEnabled,
  applyGlassShellDocumentClass,
  GLASS_SHELL_STORAGE_KEY,
} from '../../src/config/glass-shell'

describe('isGlassShellEnabled (Fluent glass flag)', () => {
  const originalLocation = window.location

  beforeEach(() => {
    window.localStorage.removeItem(GLASS_SHELL_STORAGE_KEY)
    document.documentElement.classList.remove('glass-shell-on')
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, search: '' },
    })
  })

  afterEach(() => {
    window.localStorage.removeItem(GLASS_SHELL_STORAGE_KEY)
    document.documentElement.classList.remove('glass-shell-on')
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

  it('toggles documentElement class glass-shell-on', () => {
    applyGlassShellDocumentClass(true)
    expect(document.documentElement.classList.contains('glass-shell-on')).toBe(true)
    expect(document.documentElement.dataset.glassScheme === 'dark' || document.documentElement.dataset.glassScheme === 'light').toBe(true)
    applyGlassShellDocumentClass(false)
    expect(document.documentElement.classList.contains('glass-shell-on')).toBe(false)
    expect(document.documentElement.dataset.glassScheme).toBeUndefined()
  })
})
