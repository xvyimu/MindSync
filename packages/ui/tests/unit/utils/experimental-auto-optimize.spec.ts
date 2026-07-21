import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  EXPERIMENTAL_AUTO_OPTIMIZE_PREF_KEY,
  loadExperimentalAutoOptimizeSettings,
  saveExperimentalAutoOptimizeSettings,
} from '../../../src/utils/experimental-auto-optimize'

describe('experimental auto-optimize preference (D2)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads defaults when preference missing', async () => {
    const pref = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => {}),
    }
    const s = await loadExperimentalAutoOptimizeSettings(pref as any)
    expect(s.enabled).toBe(false)
    expect(pref.get).toHaveBeenCalledWith(EXPERIMENTAL_AUTO_OPTIMIZE_PREF_KEY, null)
  })

  it('normalizes enabled only on true when loading', async () => {
    const pref = {
      get: vi.fn(async () => ({ enabled: true, maxRounds: 2 })),
      set: vi.fn(async () => {}),
    }
    const s = await loadExperimentalAutoOptimizeSettings(pref as any)
    expect(s.enabled).toBe(true)
    expect(s.maxRounds).toBe(2)
  })

  it('save persists normalized settings', async () => {
    const pref = {
      get: vi.fn(),
      set: vi.fn(async () => {}),
    }
    const saved = await saveExperimentalAutoOptimizeSettings(pref as any, {
      enabled: true,
      maxRounds: 99,
      maxCharsBudget: 50,
    })
    expect(saved.enabled).toBe(true)
    expect(saved.maxRounds).toBe(10)
    expect(saved.maxCharsBudget).toBe(1000)
    expect(pref.set).toHaveBeenCalledWith(
      EXPERIMENTAL_AUTO_OPTIMIZE_PREF_KEY,
      expect.objectContaining({ enabled: true, maxRounds: 10 }),
    )
  })
})
