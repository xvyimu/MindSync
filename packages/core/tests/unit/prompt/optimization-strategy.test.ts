import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EXPERIMENTAL_AUTO_OPTIMIZE,
  EXPERIMENTAL_AUTO_OPTIMIZE_PREF_KEY,
  ExperimentalAutoOptimizationStrategy,
  TemplateOptimizationStrategy,
  createDefaultExperimentalAutoOptimizeSettings,
  normalizeExperimentalAutoOptimizeSettings,
  resolveOptimizationStrategy,
} from '../../../src/services/prompt/optimization-strategy'

describe('OptimizationStrategy (D1/D2)', () => {
  const ctx = {
    mode: 'user' as const,
    targetPrompt: 'hello',
    modelKey: 'm1',
    templateId: 'user-prompt-basic',
  }

  it('template strategy is default and non-experimental', () => {
    const s = new TemplateOptimizationStrategy()
    expect(s.kind).toBe('template')
    expect(s.isExperimental).toBe(false)
    const plan = s.plan(ctx)
    expect(plan.kind).toBe('template')
    expect(plan.templateId).toBe('user-prompt-basic')
  })

  it('template strategy requires templateId', () => {
    const s = new TemplateOptimizationStrategy()
    expect(() =>
      s.plan({ ...ctx, templateId: undefined }),
    ).toThrow(/templateId/i)
  })

  it('experimental auto strategy is marked experimental and budgeted', () => {
    const s = new ExperimentalAutoOptimizationStrategy({ maxRounds: 2, maxCharsBudget: 5000 })
    expect(s.isExperimental).toBe(true)
    const plan = s.plan({ ...ctx, templateId: undefined })
    expect(plan.kind).toBe('auto-experimental')
    expect(plan.maxRounds).toBe(2)
    expect(plan.maxCharsBudget).toBe(5000)
  })

  it('DEFAULT experimental settings are disabled (ADR-005)', () => {
    expect(DEFAULT_EXPERIMENTAL_AUTO_OPTIMIZE.enabled).toBe(false)
    expect(createDefaultExperimentalAutoOptimizeSettings().enabled).toBe(false)
    expect(EXPERIMENTAL_AUTO_OPTIMIZE_PREF_KEY).toContain('experimental')
  })

  it('normalize only enables on explicit true', () => {
    expect(normalizeExperimentalAutoOptimizeSettings(null).enabled).toBe(false)
    expect(normalizeExperimentalAutoOptimizeSettings({ enabled: false }).enabled).toBe(false)
    expect(normalizeExperimentalAutoOptimizeSettings({ enabled: 'yes' }).enabled).toBe(false)
    expect(normalizeExperimentalAutoOptimizeSettings({ enabled: true }).enabled).toBe(true)
    expect(
      normalizeExperimentalAutoOptimizeSettings({ enabled: true, maxRounds: 99 }).maxRounds,
    ).toBe(10)
  })

  it('resolveOptimizationStrategy never picks auto when disabled', () => {
    const s = resolveOptimizationStrategy({ enabled: false, maxRounds: 3, maxCharsBudget: 1000 })
    expect(s.kind).toBe('template')
    expect(s.isExperimental).toBe(false)
  })

  it('resolveOptimizationStrategy picks auto only when enabled', () => {
    const s = resolveOptimizationStrategy({ enabled: true, maxRounds: 2, maxCharsBudget: 8000 })
    expect(s.kind).toBe('auto-experimental')
    expect(s.isExperimental).toBe(true)
  })
})
