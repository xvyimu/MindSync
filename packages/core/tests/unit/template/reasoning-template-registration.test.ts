import { describe, expect, it } from 'vitest'

import { ALL_TEMPLATES } from '../../../src/services/template/default-templates'
import { StaticLoader } from '../../../src/services/template/static-loader'
import { Template } from '../../../src/services/template/types'

const getTemplateVariants = (id: string) =>
  Object.values(ALL_TEMPLATES).filter((template) => template.id === id)

const getMessageContents = (template: Template): string[] =>
  Array.isArray(template.content) ? template.content.map((message) => message.content) : [template.content]

describe('Reasoning-enhanced template registration', () => {
  it('registers zh/en optimize variants in static loader', () => {
    const loader = new StaticLoader()
    const templates = loader.loadTemplates()

    expect(templates.byType.optimize.zh['grok-reasoning-optimize']).toBeDefined()
    expect(templates.byType.optimize.en['grok-reasoning-optimize']).toBeDefined()
    expect(templates.byType.optimize.zh['grok-reasoning-optimize'].name).toBe('推理增强优化')
    expect(templates.byType.optimize.en['grok-reasoning-optimize'].name).toBe('Reasoning-Enhanced Optimization')
  })

  it('stays model-agnostic and keeps variable preservation + CoT contract', () => {
    const variants = getTemplateVariants('grok-reasoning-optimize')
    expect(variants).toHaveLength(2)

    for (const template of variants) {
      expect(template.isBuiltin).toBe(true)
      expect(template.metadata.templateType).toBe('optimize')
      expect(Array.isArray(template.content)).toBe(true)

      const contents = getMessageContents(template).join('\n')

      // model-agnostic: no exclusive Grok product binding in user-facing name/description path
      expect(template.name.toLowerCase()).not.toContain('grok')
      expect(template.metadata.description?.toLowerCase() || '').not.toMatch(/only.*grok|grok only|仅.*grok/)

      // core contracts
      expect(contents).toMatch(/Chain-of-Thought|思维步骤|thinking scaffold|推理/)
      expect(contents).toMatch(/自检|self-check|Self-check/)
      expect(contents).toMatch(/\{\{variable/)
      expect(contents).toContain('originalPrompt')
      expect(contents).toMatch(/模型无关|model-agnostic|vendor\/model-agnostic|各类大模型|general-purpose/)
    }
  })
})
