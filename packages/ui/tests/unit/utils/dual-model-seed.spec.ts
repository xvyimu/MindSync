import { describe, it, expect } from 'vitest'
import { seedDualModelKeys, isDualModelActive } from '../../../src/utils/dual-model-seed'

describe('seedDualModelKeys (C1)', () => {
  it('returns no-models when list empty', () => {
    const r = seedDualModelKeys({
      currentA: '',
      currentB: '',
      availableModelKeys: [],
    })
    expect(r.isDual).toBe(false)
    expect(r.reason).toBe('no-models')
    expect(r.modelA).toBe('')
  })

  it('falls back to single model when only one available', () => {
    const r = seedDualModelKeys({
      currentA: 'm1',
      currentB: '',
      availableModelKeys: ['m1'],
    })
    expect(r.modelA).toBe('m1')
    expect(r.modelB).toBe('m1')
    expect(r.isDual).toBe(false)
    expect(r.reason).toBe('need-two-models')
  })

  it('picks next distinct model as B', () => {
    const r = seedDualModelKeys({
      currentA: 'm1',
      currentB: 'm1',
      availableModelKeys: ['m1', 'm2', 'm3'],
    })
    expect(r.modelA).toBe('m1')
    expect(r.modelB).toBe('m2')
    expect(r.isDual).toBe(true)
  })

  it('keeps existing B when already dual', () => {
    const r = seedDualModelKeys({
      currentA: 'm1',
      currentB: 'm3',
      availableModelKeys: ['m1', 'm2', 'm3'],
    })
    expect(r.modelA).toBe('m1')
    expect(r.modelB).toBe('m3')
    expect(r.isDual).toBe(true)
  })

  it('prefers preferredPrimary when valid', () => {
    const r = seedDualModelKeys({
      currentA: 'm1',
      currentB: '',
      availableModelKeys: ['m1', 'm2', 'm3'],
      preferredPrimary: 'm2',
    })
    expect(r.modelA).toBe('m2')
    expect(r.modelB).toBe('m3')
    expect(r.isDual).toBe(true)
  })
})

describe('isDualModelActive', () => {
  it('requires two distinct non-empty keys', () => {
    expect(isDualModelActive('a', 'b')).toBe(true)
    expect(isDualModelActive('a', 'a')).toBe(false)
    expect(isDualModelActive('', 'b')).toBe(false)
  })
})
