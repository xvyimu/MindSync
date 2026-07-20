import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryStorageProvider } from '../../../src/services/storage/memoryStorageProvider'
import {
  EvalCaseSetRepository,
  createEvalCaseSetRepository,
  createEmptyEvalCaseSet,
  createEvalCaseId,
  isEvalCaseSet,
} from '../../../src/services/evaluation/eval-case-repository'
import {
  evaluateAssertions,
  runEvalCaseSet,
  serializeEvalEvidenceBundle,
  createEvalEvidenceFileName,
} from '../../../src/services/evaluation/eval-case-runner'
import type { EvalCaseSet } from '../../../src/services/evaluation/eval-case-types'
import { CORE_SERVICE_KEYS } from '../../../src/constants/storage-keys'

describe('EvalCaseSetRepository', () => {
  let storage: MemoryStorageProvider
  let repo: EvalCaseSetRepository

  beforeEach(() => {
    storage = new MemoryStorageProvider()
    repo = createEvalCaseSetRepository(storage)
  })

  it('returns empty default case set when nothing stored', async () => {
    const loaded = await repo.load()
    expect(loaded.version).toBe(1)
    expect(loaded.cases).toEqual([])
    expect(loaded.id).toBe('default')
  })

  it('saves and loads a case set (round-trip)', async () => {
    const caseSet: EvalCaseSet = {
      id: 'default',
      name: 'My set',
      version: 1,
      updatedAt: 1,
      cases: [
        {
          id: createEvalCaseId(),
          name: 'hello',
          input: 'Say hi',
          assertions: [{ type: 'contains', value: 'hi' }],
        },
      ],
    }

    const saved = await repo.save(caseSet)
    expect(saved.updatedAt).toBeGreaterThanOrEqual(caseSet.updatedAt)
    expect(saved.cases).toHaveLength(1)

    const loaded = await repo.load()
    expect(loaded.name).toBe('My set')
    expect(loaded.cases[0].input).toBe('Say hi')
    expect(loaded.cases[0].assertions[0]).toEqual({ type: 'contains', value: 'hi' })

    const raw = await storage.getItem(CORE_SERVICE_KEYS.EVAL_CASE_SET)
    expect(raw).toBeTruthy()
    expect(isEvalCaseSet(JSON.parse(raw!))).toBe(true)
  })

  it('rejects invalid payload on save', async () => {
    await expect(
      repo.save({
        id: 'default',
        name: 'bad',
        version: 1,
        updatedAt: Date.now(),
        cases: [{ id: 'x', name: 'n', input: 'i', assertions: [] as any }],
      } as EvalCaseSet),
    ).rejects.toThrow(/Invalid|validation/i)
  })

  it('createEmptyEvalCaseSet produces valid shape', () => {
    const empty = createEmptyEvalCaseSet()
    expect(isEvalCaseSet(empty)).toBe(true)
  })
})

describe('evaluateAssertions', () => {
  it('contains: pass when output includes value', () => {
    const results = evaluateAssertions('Hello World', [
      { type: 'contains', value: 'World' },
    ])
    expect(results).toHaveLength(1)
    expect(results[0].passed).toBe(true)
  })

  it('contains: fail when missing', () => {
    const results = evaluateAssertions('Hello', [
      { type: 'contains', value: 'World' },
    ])
    expect(results[0].passed).toBe(false)
    expect(results[0].detail).toMatch(/contain/)
  })

  it('not_contains: pass when absent', () => {
    const results = evaluateAssertions('Hello', [
      { type: 'not_contains', value: 'World' },
    ])
    expect(results[0].passed).toBe(true)
  })

  it('not_contains: fail when present', () => {
    const results = evaluateAssertions('Hello World', [
      { type: 'not_contains', value: 'World' },
    ])
    expect(results[0].passed).toBe(false)
  })

  it('respects caseSensitive flag', () => {
    const insensitive = evaluateAssertions('Hello', [
      { type: 'contains', value: 'hello', caseSensitive: false },
    ])
    expect(insensitive[0].passed).toBe(true)

    const sensitive = evaluateAssertions('Hello', [
      { type: 'contains', value: 'hello', caseSensitive: true },
    ])
    expect(sensitive[0].passed).toBe(false)
  })
})

describe('runEvalCaseSet', () => {
  it('runs two cases and produces summary.total === 2', async () => {
    const llmService = {
      sendMessage: vi
        .fn()
        .mockResolvedValueOnce('alpha response with PASS_TOKEN')
        .mockResolvedValueOnce('beta response without token'),
    }

    const caseSet: EvalCaseSet = {
      id: 'default',
      name: 'Suite',
      version: 1,
      updatedAt: Date.now(),
      cases: [
        {
          id: 'c1',
          name: 'case-1',
          input: 'q1',
          assertions: [{ type: 'contains', value: 'PASS_TOKEN' }],
        },
        {
          id: 'c2',
          name: 'case-2',
          input: 'q2',
          assertions: [{ type: 'contains', value: 'PASS_TOKEN' }],
        },
      ],
    }

    const bundle = await runEvalCaseSet(caseSet, {
      llmService,
      modelKey: 'test-model',
    })

    expect(bundle.summary.total).toBe(2)
    expect(bundle.summary.passed).toBe(1)
    expect(bundle.summary.failed).toBe(1)
    expect(bundle.results[0].passed).toBe(true)
    expect(bundle.results[1].passed).toBe(false)
    expect(bundle.modelKey).toBe('test-model')
    expect(llmService.sendMessage).toHaveBeenCalledTimes(2)
  })

  it('records per-case error without aborting the batch', async () => {
    const llmService = {
      sendMessage: vi
        .fn()
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce('ok PASS'),
    }

    const caseSet: EvalCaseSet = {
      id: 'default',
      name: 'Suite',
      version: 1,
      updatedAt: Date.now(),
      cases: [
        {
          id: 'c1',
          name: 'fail-call',
          input: 'q1',
          assertions: [{ type: 'contains', value: 'PASS' }],
        },
        {
          id: 'c2',
          name: 'ok-call',
          input: 'q2',
          assertions: [{ type: 'contains', value: 'PASS' }],
        },
      ],
    }

    const bundle = await runEvalCaseSet(caseSet, {
      llmService,
      modelKey: 'm',
    })

    expect(bundle.summary.total).toBe(2)
    expect(bundle.results[0].error).toMatch(/network down/)
    expect(bundle.results[0].passed).toBe(false)
    expect(bundle.results[1].passed).toBe(true)
  })

  it('aborts when signal is aborted mid-run', async () => {
    const controller = new AbortController()
    const llmService = {
      sendMessage: vi.fn().mockImplementation(async () => {
        controller.abort()
        return 'never used second'
      }),
    }

    const caseSet: EvalCaseSet = {
      id: 'default',
      name: 'Suite',
      version: 1,
      updatedAt: Date.now(),
      cases: [
        {
          id: 'c1',
          name: 'first',
          input: 'q1',
          assertions: [{ type: 'contains', value: 'x' }],
        },
        {
          id: 'c2',
          name: 'second',
          input: 'q2',
          assertions: [{ type: 'contains', value: 'x' }],
        },
      ],
    }

    await expect(
      runEvalCaseSet(caseSet, {
        llmService,
        modelKey: 'm',
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('serializes evidence bundle to valid JSON with required fields', async () => {
    const bundle = await runEvalCaseSet(
      {
        id: 'default',
        name: 'Suite',
        version: 1,
        updatedAt: Date.now(),
        cases: [
          {
            id: 'c1',
            name: 'n',
            input: 'i',
            assertions: [{ type: 'contains', value: 'ok' }],
          },
        ],
      },
      {
        llmService: { sendMessage: vi.fn().mockResolvedValue('ok') },
        modelKey: 'model-a',
      },
    )

    const json = serializeEvalEvidenceBundle(bundle)
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.modelKey).toBe('model-a')
    expect(Array.isArray(parsed.results)).toBe(true)
    expect(createEvalEvidenceFileName(new Date('2026-07-21T12:34:56'))).toMatch(
      /^eval-evidence-\d{8}-\d{6}\.json$/,
    )
  })
})
