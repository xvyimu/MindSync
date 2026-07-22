import { describe, it, expect } from 'vitest'
import { naiveThemeConfigs } from '../../src/config/naive-theme'

/** R1 design constitution structural / paper token guards. */
describe('redesign R1 tokens', () => {
  it('paper text colors and radii match design constitution §4.8', () => {
    const common = naiveThemeConfigs.paper.themeOverrides.common!
    expect(String(common.textColor2).toLowerCase()).toBe('#64748b')
    expect(String(common.textColor3).toLowerCase()).toBe('#94a3b8')
    expect(common.borderRadius).toBe('8px')
    expect(common.borderRadiusSmall).toBe('4px')
    expect(common.fontSize).toBe('14px')
    expect(common.fontSizeHuge).toBe('18px')
    expect(common.fontSizeLarge).toBe('16px')
    expect(common.fontSizeTiny).toBe('12px')
  })

  it('every theme shares structural radius + type scale', () => {
    for (const theme of Object.values(naiveThemeConfigs)) {
      const common = theme.themeOverrides.common ?? {}
      expect(common.borderRadius, theme.id).toBe('8px')
      expect(common.borderRadiusSmall, theme.id).toBe('4px')
      expect(common.fontSize, theme.id).toBe('14px')
      expect(common.fontSizeHuge, theme.id).toBe('18px')
      expect(common.fontSizeLarge, theme.id).toBe('16px')
      expect(common.fontSizeTiny, theme.id).toBe('12px')
    }
  })

  it('every theme forces button radius 4px (Naive copies common otherwise)', () => {
    for (const theme of Object.values(naiveThemeConfigs)) {
      const button = theme.themeOverrides.Button ?? {}
      expect(button.borderRadiusTiny, theme.id).toBe('4px')
      expect(button.borderRadiusSmall, theme.id).toBe('4px')
      expect(button.borderRadiusMedium, theme.id).toBe('4px')
      expect(button.borderRadiusLarge, theme.id).toBe('4px')
    }
  })

  it('paper card uses hairline elevation (no multi-layer soft shadow)', () => {
    const card = naiveThemeConfigs.paper.themeOverrides.Card!
    expect(String(card.boxShadow)).toMatch(/0 0 0 1px/)
  })
})
