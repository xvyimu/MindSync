import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  analyzeLine,
  analyzeContent,
  LEGAL_SPACING_PX,
  LEGAL_FONT_PX,
  scanRepo,
  loadExceptions,
  filterActionable,
  summarize,
} from '../../scripts/audit-design-tokens.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UI_ROOT = path.resolve(__dirname, '../..')
const PAPER_CSS = path.join(UI_ROOT, 'src/styles/paper.css')

describe('redesign R5 token audit harness', () => {
  it('legal spacing / font sets match design constitution', () => {
    expect([...LEGAL_SPACING_PX].sort((a, b) => a - b)).toEqual([0, 4, 8, 16, 24, 32])
    expect([...LEGAL_FONT_PX].sort((a, b) => a - b)).toEqual([12, 14, 16, 18])
  })

  it('flags illegal spacing and accepts legal spacing', () => {
    const bad = analyzeLine('  padding: 12px;', 1, 'x.vue')
    expect(bad.some((f) => f.kind === 'illegal-spacing' && f.value === '12px')).toBe(true)

    const gap = analyzeLine('  gap: 12px;', 2, 'x.vue')
    expect(gap.some((f) => f.value === '12px')).toBe(true)

    const ok = analyzeLine('  padding: 8px; margin: 16px; gap: 4px;', 3, 'x.vue')
    expect(ok.filter((f) => f.kind === 'illegal-spacing')).toHaveLength(0)

    const hairline = analyzeLine('  border: 1px solid #eee; outline: 2px solid blue;', 4, 'x.vue')
    expect(hairline).toHaveLength(0)

    // off-screen / extreme absolute layout tricks are ignored
    const offscreen = analyzeLine("  textarea.style.left = '-9999px'", 5, 'x.vue')
    expect(offscreen).toHaveLength(0)
  })

  it('flags illegal font-size and accepts type scale', () => {
    const bad = analyzeLine('  font-size: 13px;', 1, 'x.vue')
    expect(bad.some((f) => f.kind === 'illegal-font-size' && f.value === '13px')).toBe(true)

    const ok = analyzeLine("  font-size: 12px; style=\"font-size: 14px\"", 2, 'x.vue')
    expect(ok.filter((f) => f.kind === 'illegal-font-size')).toHaveLength(0)
  })

  it('does not treat font-size:12px as illegal spacing', () => {
    const onlyFont = analyzeLine('  font-size: 12px;', 1, 'x.vue')
    expect(onlyFont.filter((f) => f.kind === 'illegal-spacing')).toHaveLength(0)
  })

  it('analyzeContent aggregates multi-line samples', () => {
    const sample = `
.foo {
  margin-bottom: 12px;
  font-size: 11px;
  padding: 8px;
}
`
    const findings = analyzeContent(sample, 'sample.css')
    expect(findings.some((f) => f.kind === 'illegal-spacing' && f.value === '12px')).toBe(true)
    expect(findings.some((f) => f.kind === 'illegal-font-size' && f.value === '11px')).toBe(true)
    expect(findings.some((f) => f.value === '8px')).toBe(false)
  })

  it('paper.css :root spacing vars only use legal steps', () => {
    const css = fs.readFileSync(PAPER_CSS, 'utf8')
    const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/)
    expect(rootMatch).toBeTruthy()
    const rootBlock = rootMatch![1]
    const spaceVars = [...rootBlock.matchAll(/--paper-space-\d+:\s*([^;]+);/g)]
    expect(spaceVars.length).toBeGreaterThanOrEqual(6)
    for (const [, val] of spaceVars) {
      const v = val.trim()
      if (v === '0') continue
      const m = v.match(/^(\d+)px$/)
      expect(m, `unexpected space var ${v}`).toBeTruthy()
      expect(LEGAL_SPACING_PX.has(Number(m![1])), v).toBe(true)
    }
  })

  it('repo scan runs and exception filter is stable', () => {
    const raw = scanRepo(path.join(UI_ROOT, 'src'))
    const exceptions = loadExceptions()
    const actionable = filterActionable(raw, exceptions)
    const summary = summarize(raw)

    // Inventory must be non-trivial on this codebase (guards against empty scan path).
    expect(summary.total).toBeGreaterThan(0)
    expect(actionable.length).toBeLessThanOrEqual(raw.length)

    // Soft gate for step-1: document debt, do not fail CI on historical violations.
    // Strict zero-debt gate is enabled in a later R5 commit after bulk normalize.
    expect(Array.isArray(actionable)).toBe(true)
  })
})
