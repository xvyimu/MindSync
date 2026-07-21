import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isRedesignShellEnabled,
  REDESIGN_SHELL_STORAGE_KEY,
} from '../../src/config/redesign-shell'

describe('isRedesignShellEnabled (R0 flag)', () => {
  const originalLocation = window.location

  beforeEach(() => {
    window.localStorage.removeItem(REDESIGN_SHELL_STORAGE_KEY)
    // reset location search
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, search: '' },
    })
  })

  afterEach(() => {
    window.localStorage.removeItem(REDESIGN_SHELL_STORAGE_KEY)
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('defaults to false', () => {
    expect(isRedesignShellEnabled()).toBe(false)
  })

  it('reads localStorage ui:redesign-shell=1', () => {
    window.localStorage.setItem(REDESIGN_SHELL_STORAGE_KEY, '1')
    expect(isRedesignShellEnabled()).toBe(true)
  })

  it('enables from ?redesignShell=1 and persists to localStorage', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, search: '?redesignShell=1' },
    })
    expect(isRedesignShellEnabled()).toBe(true)
    expect(window.localStorage.getItem(REDESIGN_SHELL_STORAGE_KEY)).toBe('1')
  })

  it('disables from ?redesignShell=0 and clears storage', () => {
    window.localStorage.setItem(REDESIGN_SHELL_STORAGE_KEY, '1')
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, search: '?redesignShell=0' },
    })
    expect(isRedesignShellEnabled()).toBe(false)
    expect(window.localStorage.getItem(REDESIGN_SHELL_STORAGE_KEY)).toBeNull()
  })
})
