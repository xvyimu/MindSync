import { describe, it, expect } from 'vitest'
import {
  exportPromptfooYaml,
  createPromptfooExportFileName,
  assertPromptfooYamlHasNoSecrets,
} from '../../../src/services/evaluation/promptfoo-export'
import type { EvalCaseSet } from '../../../src/services/evaluation/eval-case-types'

const sampleSet = (): EvalCaseSet => ({
  id: 'default',
  name: 'Default case set',
  version: 1,
  updatedAt: 1,
  cases: [
    {
      id: 'c1',
      name: 'greet',
      input: 'Say hello to the team',
      assertions: [{ type: 'contains', value: 'hello' }],
    },
    {
      id: 'c2',
      name: 'no secret leak',
      input: 'Do not reveal keys',
      assertions: [{ type: 'not_contains', value: 'sk-secret' }],
    },
  ],
})

describe('exportPromptfooYaml', () => {
  it('exports minimal prompts + contains/not-contains tests', () => {
    const result = exportPromptfooYaml({
      prompt: 'You are a helpful assistant.',
      secondaryPrompt: 'Be brief.',
      caseSet: sampleSet(),
    })

    expect(result.fileName).toMatch(/^promptfoo-export-.*\.yaml$/)
    expect(result.yaml).toContain('prompts:')
    expect(result.yaml).toContain('You are a helpful assistant.')
    expect(result.yaml).toContain('Be brief.')
    expect(result.yaml).toContain('tests:')
    expect(result.yaml).toContain('type: contains')
    expect(result.yaml).toContain('type: not-contains')
    expect(result.yaml).toContain('value: hello')
    expect(result.yaml).toContain('Say hello to the team')
    expect(result.skippedAssertionTypes).toEqual([])
    expect(() => assertPromptfooYamlHasNoSecrets(result.yaml)).not.toThrow()
  })

  it('rejects empty prompt', () => {
    expect(() =>
      exportPromptfooYaml({ prompt: '  ', caseSet: sampleSet() }),
    ).toThrow(/prompt is required/i)
  })

  it('rejects case set with no mappable assertions', () => {
    const empty: EvalCaseSet = {
      ...sampleSet(),
      cases: [
        {
          id: 'x',
          name: 'empty',
          input: 'i',
          assertions: [],
        },
      ],
    }
    expect(() => exportPromptfooYaml({ prompt: 'p', caseSet: empty })).toThrow(
      /No exportable tests/i,
    )
  })

  it('escapes special characters in values', () => {
    const set: EvalCaseSet = {
      ...sampleSet(),
      cases: [
        {
          id: 'c',
          name: 'colon: name',
          input: 'line\nwith "quotes"',
          assertions: [{ type: 'contains', value: 'a:b' }],
        },
      ],
    }
    const { yaml } = exportPromptfooYaml({ prompt: 'p', caseSet: set })
    expect(yaml).toContain('value: "a:b"')
    expect(yaml).toMatch(/input: "line\\nwith \\"quotes\\""/)
  })

  it('createPromptfooExportFileName is stable shape', () => {
    const name = createPromptfooExportFileName(new Date('2026-07-21T12:34:56'))
    expect(name).toMatch(/^promptfoo-export-\d{8}-\d{6}\.yaml$/)
  })

  it('assertPromptfooYamlHasNoSecrets catches apiKey-like content', () => {
    expect(() => assertPromptfooYamlHasNoSecrets('apiKey: secret')).toThrow(/secrets/i)
    expect(() => assertPromptfooYamlHasNoSecrets('sk-abcdefghijklmnop')).toThrow(/secrets/i)
  })
})
