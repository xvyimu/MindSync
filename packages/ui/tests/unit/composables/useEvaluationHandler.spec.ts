import { beforeEach, describe, it, expect, vi } from 'vitest'
import { computed, nextTick, reactive, ref } from 'vue'
import { useEvaluationHandler } from '../../../src/composables/prompt/useEvaluationHandler'
import type {
  ScoreLevel,
  SingleEvaluationState,
  UseEvaluationReturn,
} from '../../../src/composables/prompt/useEvaluation'
import type { PersistedEvaluationResults } from '../../../src/types/evaluation'
import type {
  EvaluationContentBlock,
  EvaluationResponse,
  EvaluationType,
  ProEvaluationContext,
  ResultEvaluationRequest,
} from '@mindsync/core'
import { buildRewritePayload, buildRewritePromptFromEvaluation } from '@mindsync/core'

const toast = {
  info: vi.fn(),
}

vi.mock('@mindsync/core', () => ({
  buildRewritePayload: vi.fn(() => ({
    compressedEvaluation: {
      rewriteGuidance: {
        recommendation: 'rewrite',
      },
    },
  })),
  buildRewritePromptFromEvaluation: vi.fn(() => 'mock rewrite input'),
  normalizeRewriteLocaleLanguage: vi.fn(() => 'zh'),
}))

vi.mock('../../../src/composables/ui/useToast', () => ({
  useToast: () => toast,
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({
      locale: { value: 'zh-CN' },
      t: (key: string) => key,
    }),
  }
})

const createEvaluationResponse = (
  overall: number,
  type: EvaluationType = 'result'
): EvaluationResponse => ({
  type,
  score: {
    overall,
    dimensions: [
      {
        key: 'overall',
        label: 'Overall',
        score: overall,
      },
    ],
  },
  improvements: [],
  summary: `score-${overall}`,
  patchPlan: [],
})

const createSingleState = (result: EvaluationResponse | null = null): SingleEvaluationState =>
  reactive({
    isEvaluating: false,
    result,
    streamContent: '',
    error: null,
  }) as SingleEvaluationState

const toScoreLevel = (score: number | null): ScoreLevel | null => {
  if (score === null) return null
  if (score >= 90) return 'excellent'
  if (score >= 80) return 'good'
  if (score >= 60) return 'acceptable'
  if (score >= 40) return 'poor'
  return 'very-poor'
}

const createMockEvaluation = (
  seed: Partial<PersistedEvaluationResults> & {
    result?: Record<string, EvaluationResponse | null>
  } = {},
): UseEvaluationReturn => {
  const resultState = reactive<Record<string, SingleEvaluationState>>({})
  const ensureResultState = (variantId: string): SingleEvaluationState => {
    if (!resultState[variantId]) {
      resultState[variantId] = createSingleState(seed.result?.[variantId] ?? null)
    }
    return resultState[variantId]
  }

  Object.keys(seed.result || {}).forEach((variantId) => {
    ensureResultState(variantId)
  })

  const state = reactive({
    result: resultState,
    compare: createSingleState(seed.compare ?? null),
    'prompt-only': createSingleState(seed['prompt-only'] ?? null),
    'prompt-iterate': createSingleState(seed['prompt-iterate'] ?? null),
    activeDetail: null as { type: EvaluationType; variantId?: string } | null,
  })

  const isPanelVisible = ref(false)

  const getTargetState = (type: EvaluationType, variantId?: string): SingleEvaluationState | null => {
    if (type === 'result') {
      if (!variantId) return null
      return ensureResultState(variantId)
    }
    return state[type]
  }

  return {
    state,
    isPanelVisible,
    compareScore: computed(() => state.compare.result?.score?.overall ?? null),
    compareLevel: computed(() => toScoreLevel(state.compare.result?.score?.overall ?? null)),
    isEvaluatingCompare: computed(() => state.compare.isEvaluating),
    hasCompareResult: computed(() => state.compare.result !== null),
    compareMode: computed(() => state.compare.result?.metadata?.compareMode ?? null),
    compareStopSignals: computed(() => state.compare.result?.metadata?.compareStopSignals ?? null),
    compareSnapshotRoles: computed(() => state.compare.result?.metadata?.snapshotRoles ?? null),
    promptOnlyScore: computed(() => state['prompt-only'].result?.score?.overall ?? null),
    promptOnlyLevel: computed(() => toScoreLevel(state['prompt-only'].result?.score?.overall ?? null)),
    isEvaluatingPromptOnly: computed(() => state['prompt-only'].isEvaluating),
    hasPromptOnlyResult: computed(() => state['prompt-only'].result !== null),
    promptIterateScore: computed(() => state['prompt-iterate'].result?.score?.overall ?? null),
    promptIterateLevel: computed(() => toScoreLevel(state['prompt-iterate'].result?.score?.overall ?? null)),
    isEvaluatingPromptIterate: computed(() => state['prompt-iterate'].isEvaluating),
    hasPromptIterateResult: computed(() => state['prompt-iterate'].result !== null),
    isAnyEvaluating: computed(() => false),
    activeResult: computed(() => {
      const active = state.activeDetail
      if (!active) return null
      return getTargetState(active.type, active.variantId)?.result ?? null
    }),
    activeStreamContent: computed(() => {
      const active = state.activeDetail
      if (!active) return ''
      return getTargetState(active.type, active.variantId)?.streamContent ?? ''
    }),
    activeError: computed(() => {
      const active = state.activeDetail
      if (!active) return null
      return getTargetState(active.type, active.variantId)?.error ?? null
    }),
    activeScoreLevel: computed(() => {
      const active = state.activeDetail
      if (!active) return null
      const score = getTargetState(active.type, active.variantId)?.result?.score?.overall ?? null
      return toScoreLevel(score)
    }),
    evaluateResult: vi.fn(async () => {}),
    evaluateCompare: vi.fn(async () => {}),
    evaluatePromptOnly: vi.fn(async () => {}),
    evaluatePromptIterate: vi.fn(async () => {}),
    clearResult: vi.fn((type: EvaluationType, variantId?: string) => {
      const target = getTargetState(type, variantId)
      if (!target) return
      target.result = null
      target.streamContent = ''
      target.error = null
      target.isEvaluating = false
    }),
    clearAllResults: vi.fn(),
    showDetail: vi.fn((type: EvaluationType, variantId?: string) => {
      state.activeDetail = { type, variantId }
      isPanelVisible.value = true
    }),
    closePanel: vi.fn(() => {
      isPanelVisible.value = false
    }),
    getScoreLevel: (score: number | null) => toScoreLevel(score),
    getResultState: ensureResultState,
    getResultScore: (variantId: string) => ensureResultState(variantId).result?.score?.overall ?? null,
    getResultLevel: (variantId: string) =>
      toScoreLevel(ensureResultState(variantId).result?.score?.overall ?? null),
    isEvaluatingResult: (variantId: string) => ensureResultState(variantId).isEvaluating,
    hasResultEvaluation: (variantId: string) => ensureResultState(variantId).result !== null,
  } as UseEvaluationReturn
}

const stringifyContext = (context: ProEvaluationContext | undefined): string =>
  context ? JSON.stringify(context, null, 2) : ''

const createDesignContext = (
  context: ProEvaluationContext | undefined,
  label: string
): EvaluationContentBlock | undefined => {
  const content = stringifyContext(context)
  if (!content) return undefined
  return {
    kind: 'json',
    label,
    content,
  }
}

const createVariableDesignContext = (
  names: string[],
): EvaluationContentBlock | undefined => {
  const normalized = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)))
  if (!normalized.length) return undefined
  return {
    kind: 'variables',
    label: 'Variable Structure',
    summary: 'This block describes the template variable structure only. It does not include test values.',
    content: `Variables: ${normalized.join(', ')}`,
  }
}

const createConversationDesignContext = (
  role: string,
  messages: Array<{ role: string; content: string }>,
): EvaluationContentBlock => ({
  kind: 'conversation',
  label: 'Conversation Design Context',
  summary: `The current analysis target is the ${role} message. This position is marked as "[Current workspace prompt under optimization]" in the conversation.`,
  content: [
    `Target message role: ${role}`,
    'Conversation context:',
    ...messages.map((message) => `- ${message.role}: ${message.content}`),
  ].join('\n'),
})

const createResultTarget = (overrides: Partial<ResultEvaluationRequest> = {}) => ({
  variantId: 'a',
  target: {
    workspacePrompt: 'Workspace prompt',
    ...(overrides.type === 'result' ? overrides.target : {}),
  },
  testCase: {
    id: 'tc-a',
    input: {
      kind: 'text' as const,
      label: 'Test Input',
      content: 'Input A',
    },
    ...(overrides.type === 'result' ? overrides.testCase : {}),
  },
  snapshot: {
    id: 'snap-a',
    label: 'A',
    testCaseId: 'tc-a',
    promptRef: { kind: 'workspace' as const, label: 'Workspace' },
    promptText: 'Prompt A',
    output: 'Output A',
    ...(overrides.type === 'result' ? overrides.snapshot : {}),
  },
})

describe('useEvaluationHandler', () => {
  beforeEach(() => {
    toast.info.mockReset()
  })

  it('routes result, compare, and prompt analysis requests with the right context', async () => {
    const analysisContext: ProEvaluationContext = {
      variables: [{ name: 'schemaOnly', source: 'temporary' }],
      rawPrompt: 'analysis raw',
    }

    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Current prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('pro'),
      subMode: ref('variable'),
      analysisContext: ref(analysisContext),
      resultTargets: ref({
        a: createResultTarget(),
      }),
      comparePayload: ref({
        target: {
          workspacePrompt: 'Workspace prompt',
        },
        testCases: [
          {
            id: 'tc-1',
            input: {
              kind: 'text',
              label: 'Shared Input',
              content: 'Input A',
            },
          },
        ],
        snapshots: [
          {
            id: 'a',
            label: 'A',
            testCaseId: 'tc-1',
            promptRef: { kind: 'workspace' },
            promptText: 'Prompt A',
            output: 'Output A',
          },
          {
            id: 'b',
            label: 'B',
            testCaseId: 'tc-1',
            promptRef: { kind: 'version', version: 1 },
            promptText: 'Prompt B',
            output: 'Output B',
          },
        ],
        compareHints: {
          hasSharedTestCases: true,
          hasSamePromptSnapshots: false,
          hasCrossModelComparison: false,
        },
      }),
      currentIterateRequirement: ref(''),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('result', {
      variantId: 'a',
      userFeedback: '  make it stricter  ',
    })
    expect(mockEvaluation.evaluateResult).toHaveBeenCalledWith({
      variantId: 'a',
      target: {
        workspacePrompt: 'Workspace prompt',
      },
      testCase: {
        id: 'tc-a',
        input: {
          kind: 'text',
          label: 'Test Input',
          content: 'Input A',
        },
      },
      snapshot: {
        id: 'snap-a',
        label: 'A',
        testCaseId: 'tc-a',
        promptRef: { kind: 'workspace', label: 'Workspace' },
        promptText: 'Prompt A',
        output: 'Output A',
      },
      focus: 'make it stricter',
    })

    await handler.handleEvaluate('compare', {
      userFeedback: '  compare carefully  ',
    })
    expect(mockEvaluation.evaluateCompare).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Workspace prompt',
      },
      testCases: [
        {
          id: 'tc-1',
          input: {
            kind: 'text',
            label: 'Shared Input',
            content: 'Input A',
          },
        },
      ],
      snapshots: [
        {
          id: 'a',
          label: 'A',
          testCaseId: 'tc-1',
          promptRef: { kind: 'workspace' },
          promptText: 'Prompt A',
          output: 'Output A',
        },
        {
          id: 'b',
          label: 'B',
          testCaseId: 'tc-1',
          promptRef: { kind: 'version', version: 1 },
          promptText: 'Prompt B',
          output: 'Output B',
        },
      ],
      compareHints: {
        hasSharedTestCases: true,
        hasSamePromptSnapshots: false,
        hasCrossModelComparison: false,
      },
      focus: 'compare carefully',
    })

    await handler.handleEvaluate('prompt-only')
    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Current prompt',
        designContext: createVariableDesignContext(['schemaOnly']),
      },
      focus: undefined,
    })
  })

  it('uses workspace prompt only and falls back to global analysis context', async () => {
    const globalContext: ProEvaluationContext = {
      variables: [{ name: 'global', source: 'temporary', value: '1' }],
      rawPrompt: 'global raw',
    }

    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Optimized prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('user'),
      proContext: ref(globalContext),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('prompt-only', {
      userFeedback: '  tighten the scope  ',
    })

    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized prompt',
        designContext: undefined,
      },
      focus: 'tighten the scope',
    })
  })

  it('allows prompt-only analysis targets to inject image-specific reference evidence', async () => {
    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Optimized image prompt'),
      analysisTargetResolver: (defaultTarget) => ({
        ...defaultTarget,
        referencePrompt: 'Original image intent',
      }),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('image'),
      subMode: ref('text2image'),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('prompt-only')

    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized image prompt',
        referencePrompt: 'Original image intent',
        designContext: undefined,
      },
      focus: undefined,
    })
  })

  it('routes prompt-iterate to prompt-only when requirement is empty and to prompt-iterate when present', async () => {
    const mockEvaluation = createMockEvaluation()
    const iterateRequirement = ref('   ')

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Optimized prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('user'),
      currentIterateRequirement: iterateRequirement,
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('prompt-iterate')

    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized prompt',
        designContext: undefined,
      },
      focus: undefined,
    })
    expect(mockEvaluation.evaluatePromptIterate).not.toHaveBeenCalled()

    iterateRequirement.value = '  add an explicit JSON schema  '

    await handler.handleEvaluate('prompt-iterate', {
      userFeedback: '  keep the tone concise  ',
    })

    expect(mockEvaluation.evaluatePromptIterate).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized prompt',
        designContext: undefined,
      },
      iterateRequirement: 'add an explicit JSON schema',
      focus: 'keep the tone concise',
    })
  })

  it('allows image prompt-iterate analysis targets to inject reference evidence', async () => {
    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Optimized image prompt'),
      analysisTargetResolver: (defaultTarget) => ({
        ...defaultTarget,
        referencePrompt: 'Original image intent',
      }),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('image'),
      subMode: ref('text2image'),
      currentIterateRequirement: ref('  make the composition more cinematic  '),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('prompt-iterate')

    expect(mockEvaluation.evaluatePromptIterate).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized image prompt',
        referencePrompt: 'Original image intent',
        designContext: undefined,
      },
      iterateRequirement: 'make the composition more cinematic',
      focus: undefined,
    })
  })

  it('passes analysis variables only to prompt analysis requests', async () => {
    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Original input prompt'),
      analysisVariables: ref({
        analysisStage: 'original-input',
      }),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('image'),
      subMode: ref('text2image'),
      currentIterateRequirement: ref('  make it softer  '),
      externalEvaluation: mockEvaluation,
      comparePayload: ref({
        target: {
          workspacePrompt: 'workspace prompt',
        },
        testCases: [],
        snapshots: [],
      }),
    })

    await handler.handleEvaluate('prompt-only')
    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Original input prompt',
        designContext: undefined,
      },
      focus: undefined,
      variables: {
        analysisStage: 'original-input',
      },
    })

    await handler.handleEvaluate('prompt-iterate')
    expect(mockEvaluation.evaluatePromptIterate).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Original input prompt',
        designContext: undefined,
      },
      iterateRequirement: 'make it softer',
      focus: undefined,
      variables: {
        analysisStage: 'original-input',
      },
    })

    await handler.handleEvaluate('compare')
    expect(mockEvaluation.evaluateCompare).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'workspace prompt',
      },
      testCases: [],
      snapshots: [],
      compareHints: undefined,
      focus: undefined,
    })
  })

  it('formats pro-variable analysis context as minimal variable structure', async () => {
    const analysisContext: ProEvaluationContext = {
      variables: [
        { name: 'schemaOnly', source: 'temporary' },
        { name: 'audience', source: 'global' },
      ],
      rawPrompt: 'analysis raw',
    }

    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Current prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('pro'),
      subMode: ref('variable'),
      analysisContext: ref(analysisContext),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('prompt-only')

    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Current prompt',
        designContext: createVariableDesignContext(['schemaOnly', 'audience']),
      },
      focus: undefined,
    })
  })

  it('formats pro-multi analysis context as a minimal conversation summary', async () => {
    const analysisContext: ProEvaluationContext = {
      targetMessage: {
        role: 'system',
        content: 'Ask clarifying questions first',
        originalContent: 'Give advice directly',
      },
      conversationMessages: [
        { role: 'system', content: 'Ask clarifying questions first', isTarget: true },
        { role: 'user', content: 'I need a team wiki for a fast-growing startup team.', isTarget: false },
        { role: 'assistant', content: 'You should first clarify team size and collaboration style.', isTarget: false },
      ],
    }

    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Optimized system prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('pro'),
      subMode: ref('multi'),
      analysisContext: ref(analysisContext),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('prompt-only')

    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized system prompt',
        designContext: createConversationDesignContext('system', [
          { role: 'system', content: '[Current workspace prompt under optimization]' },
          { role: 'user', content: 'I need a team wiki for a fast-growing startup team.' },
          { role: 'assistant', content: 'You should first clarify team size and collaboration style.' },
        ]),
      },
      focus: undefined,
    })
  })

  it('keeps the target marker visible when pro-multi conversation context is long', async () => {
    const analysisContext: ProEvaluationContext = {
      targetMessage: {
        role: 'system',
        content: 'Ask clarifying questions first',
        originalContent: 'Give advice directly',
      },
      conversationMessages: [
        { role: 'user', content: 'm1', isTarget: false },
        { role: 'assistant', content: 'm2', isTarget: false },
        { role: 'user', content: 'm3', isTarget: false },
        { role: 'assistant', content: 'm4', isTarget: false },
        { role: 'user', content: 'm5', isTarget: false },
        { role: 'system', content: 'Ask clarifying questions first', isTarget: true },
        { role: 'user', content: 'm7', isTarget: false },
        { role: 'assistant', content: 'm8', isTarget: false },
      ],
    }

    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Optimized system prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('pro'),
      subMode: ref('multi'),
      analysisContext: ref(analysisContext),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('prompt-only')

    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized system prompt',
        designContext: createConversationDesignContext('system', [
          { role: 'user', content: 'm3' },
          { role: 'assistant', content: 'm4' },
          { role: 'user', content: 'm5' },
          { role: 'system', content: '[Current workspace prompt under optimization]' },
          { role: 'user', content: 'm7' },
          { role: 'assistant', content: 'm8' },
        ]),
      },
      focus: undefined,
    })
  })

  it('uses minimal input for basic-system prompt analysis as well', async () => {
    const globalContext: ProEvaluationContext = {
      targetMessage: {
        role: 'system',
        content: 'System prompt',
      },
      conversationMessages: [
        {
          role: 'user',
          content: 'User question',
        },
      ],
    }

    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Optimized system prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('system'),
      proContext: ref(globalContext),
      currentIterateRequirement: ref('  strengthen no-chain-of-thought rule  '),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('prompt-only', {
      userFeedback: '  suppress reasoning traces  ',
    })

    expect(mockEvaluation.evaluatePromptOnly).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized system prompt',
        designContext: undefined,
      },
      focus: 'suppress reasoning traces',
    })

    await handler.handleEvaluate('prompt-iterate')

    expect(mockEvaluation.evaluatePromptIterate).toHaveBeenCalledWith({
      target: {
        workspacePrompt: 'Optimized system prompt',
        designContext: undefined,
      },
      iterateRequirement: 'strengthen no-chain-of-thought rule',
      focus: undefined,
    })
  })

  it('short-circuits missing result/compare targets and re-evaluates the active detail target', async () => {
    const mockEvaluation = createMockEvaluation()

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('user'),
      resultTargets: ref({
        a: createResultTarget(),
      }),
      comparePayload: ref(null),
      externalEvaluation: mockEvaluation,
    })

    await handler.handleEvaluate('result', { variantId: 'missing' })
    await handler.handleEvaluate('compare')

    expect(mockEvaluation.evaluateResult).not.toHaveBeenCalled()
    expect(mockEvaluation.evaluateCompare).not.toHaveBeenCalled()

    mockEvaluation.state.activeDetail = {
      type: 'result',
      variantId: 'a',
    }
    await handler.handleReEvaluate()

    expect(mockEvaluation.evaluateResult).toHaveBeenCalledWith({
      variantId: 'a',
      target: {
        workspacePrompt: 'Workspace prompt',
      },
      testCase: {
        id: 'tc-a',
        input: {
          kind: 'text',
          label: 'Test Input',
          content: 'Input A',
        },
      },
      snapshot: {
        id: 'snap-a',
        label: 'A',
        testCaseId: 'tc-a',
        promptRef: { kind: 'workspace', label: 'Workspace' },
        promptText: 'Prompt A',
        output: 'Output A',
      },
      focus: undefined,
    })

    mockEvaluation.state.activeDetail = {
      type: 'result',
      variantId: 'a',
    }
    await handler.handleEvaluateActiveWithFeedback('  focus on factual accuracy  ')

    expect(mockEvaluation.evaluateResult).toHaveBeenLastCalledWith({
      variantId: 'a',
      target: {
        workspacePrompt: 'Workspace prompt',
      },
      testCase: {
        id: 'tc-a',
        input: {
          kind: 'text',
          label: 'Test Input',
          content: 'Input A',
        },
      },
      snapshot: {
        id: 'snap-a',
        label: 'A',
        testCaseId: 'tc-a',
        promptRef: { kind: 'workspace', label: 'Workspace' },
        promptText: 'Prompt A',
        output: 'Output A',
      },
      focus: 'focus on factual accuracy',
    })
  })

  it('re-evaluates the active compare detail with trimmed feedback', async () => {
    const mockEvaluation = createMockEvaluation()

    const comparePayload = {
      target: {
        workspacePrompt: 'Workspace prompt',
      },
      testCases: [
        {
          id: 'tc-1',
          input: {
            kind: 'text' as const,
            label: 'Shared Input',
            content: 'Input A',
          },
        },
      ],
      snapshots: [
        {
          id: 'a',
          label: 'A',
          testCaseId: 'tc-1',
          promptRef: { kind: 'workspace' as const },
          promptText: 'Prompt A',
          output: 'Output A',
        },
        {
          id: 'b',
          label: 'B',
          testCaseId: 'tc-1',
          promptRef: { kind: 'version' as const, version: 1 },
          promptText: 'Prompt B',
          output: 'Output B',
        },
      ],
      compareHints: {
        hasSharedTestCases: true,
        hasSamePromptSnapshots: false,
        hasCrossModelComparison: false,
      },
    }

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('user'),
      comparePayload: ref(comparePayload),
      externalEvaluation: mockEvaluation,
    })

    mockEvaluation.state.activeDetail = {
      type: 'compare',
    }
    await handler.handleReEvaluate()

    expect(mockEvaluation.evaluateCompare).toHaveBeenCalledWith({
      ...comparePayload,
      focus: undefined,
    })

    mockEvaluation.state.activeDetail = {
      type: 'compare',
    }
    await handler.handleEvaluateActiveWithFeedback('  compare consistency only  ')

    expect(mockEvaluation.evaluateCompare).toHaveBeenLastCalledWith({
      ...comparePayload,
      focus: 'compare consistency only',
    })
  })

  it('hydrates and syncs persisted evaluation buckets by variant id', async () => {
    const persistedResults = ref<PersistedEvaluationResults>({
      result: {
        a: createEvaluationResponse(81),
      },
      compare: createEvaluationResponse(82, 'compare'),
      'prompt-only': createEvaluationResponse(83, 'prompt-only'),
      'prompt-iterate': createEvaluationResponse(84, 'prompt-iterate'),
    })

    const mockEvaluation = createMockEvaluation()

    useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('user'),
      externalEvaluation: mockEvaluation,
      persistedResults,
    })

    expect(mockEvaluation.getResultState('a').result?.score.overall).toBe(81)
    expect(mockEvaluation.state.compare.result?.score.overall).toBe(82)
    expect(mockEvaluation.state['prompt-only'].result?.score.overall).toBe(83)
    expect(mockEvaluation.state['prompt-iterate'].result?.score.overall).toBe(84)

    mockEvaluation.getResultState('a').result = createEvaluationResponse(91)
    mockEvaluation.getResultState('b').result = createEvaluationResponse(77)
    mockEvaluation.state.compare.result = createEvaluationResponse(79, 'compare')
    await nextTick()

    expect(persistedResults.value.result).toEqual({
      a: createEvaluationResponse(91),
      b: createEvaluationResponse(77),
    })
    expect(persistedResults.value.compare?.score.overall).toBe(79)
  })

  it('clears all result buckets before a new test run', () => {
    const mockEvaluation = createMockEvaluation({
      result: {
        a: createEvaluationResponse(71),
        b: createEvaluationResponse(72),
      },
      compare: createEvaluationResponse(73, 'compare'),
    })

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('user'),
      externalEvaluation: mockEvaluation,
    })

    handler.clearBeforeTest()

    expect(mockEvaluation.clearResult).toHaveBeenCalledWith('result', 'a')
    expect(mockEvaluation.clearResult).toHaveBeenCalledWith('result', 'b')
    expect(mockEvaluation.clearResult).toHaveBeenCalledWith('compare')
  })

  it('exposes compare rewrite guidance through panel props', () => {
    vi.mocked(buildRewritePayload).mockReturnValueOnce({
      compressedEvaluation: {
        rewriteGuidance: {
          recommendation: 'skip',
          reasons: ['Keep the current structure stable first.'],
        },
      },
    } as ReturnType<typeof buildRewritePayload>)

    const mockEvaluation = createMockEvaluation({
      compare: createEvaluationResponse(84, 'compare'),
    })
    mockEvaluation.state.activeDetail = {
      type: 'compare',
    }
    mockEvaluation.isPanelVisible.value = true

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('system'),
      comparePayload: ref({
        target: {
          workspacePrompt: 'Workspace prompt from compare target',
          referencePrompt: 'Previous prompt from compare target',
        },
        testCases: [],
        snapshots: [],
      }),
      externalEvaluation: mockEvaluation,
    })

    expect(handler.panelProps.value.rewriteRecommendation).toBe('skip')
    expect(handler.panelProps.value.rewriteReasons).toEqual([
      'Keep the current structure stable first.',
    ])
    expect(buildRewritePayload).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'compare',
        workspacePrompt: 'Workspace prompt from compare target',
        referencePrompt: 'Previous prompt from compare target',
      }),
    )
  })

  it('passes the evaluation result into the direct rewrite entry and closes the panel on success', () => {
    const mockEvaluation = createMockEvaluation()
    const runIterateWithInput = vi.fn(() => true)
    const promptPanelRef = ref({
      runIterateWithInput,
    })

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('system'),
      comparePayload: ref({
        target: {
          workspacePrompt: 'Workspace prompt from compare target',
          referencePrompt: 'Previous prompt from compare target',
        },
        testCases: [],
        snapshots: [],
      }),
      externalEvaluation: mockEvaluation,
    })

    const rewriteFromEvaluation = handler.createRewriteFromEvaluationHandler(promptPanelRef)

    rewriteFromEvaluation({
      type: 'compare',
      result: {
        ...createEvaluationResponse(88, 'compare'),
        summary: '当前版本比上一版本更稳定，但和参考模型相比还有轻微格式差距。',
        improvements: [
          '把输出结构约束写得更前置，并明确结尾不要附加解释。',
          '把输出结构约束写得更前置，并明确结尾不要附加解释。',
        ],
        patchPlan: [
          {
            op: 'replace',
            instruction: '将输出格式要求前置，并保留禁止附加说明的边界。',
            oldText: '请回答问题。',
            newText: '请先按固定结构回答，并且不要附加解释。',
          },
        ],
        metadata: {
          compareStopSignals: {
            targetVsBaseline: 'improved',
            targetVsReferenceGap: 'minor',
            improvementHeadroom: 'low',
            overfitRisk: 'medium',
            stopRecommendation: 'continue',
            stopReasons: ['still trailing the reference on format consistency'],
          },
          compareInsights: {
            progressSummary: {
              pairLabel: 'Target vs Previous',
              pairSignal: 'improved',
              verdict: 'left-better',
              confidence: 'high',
              analysis: '当前版本结构更清晰，漏项更少。',
            },
            pairHighlights: [
              {
                pairKey: 'target-vs-baseline',
                pairType: 'targetBaseline',
                pairLabel: 'Target vs Previous',
                pairSignal: 'improved',
                verdict: 'left-better',
                confidence: 'high',
                analysis: '当前版本结构更清晰，漏项更少。',
              },
            ],
            learnableSignals: [
              '保留显式步骤结构。',
              '保留显式步骤结构。',
            ],
            overfitWarnings: [
              '不要为了这条样例单独添加领域规则。',
              '不要为了这条样例单独添加领域规则。',
            ],
          },
        },
      },
    })

    expect(runIterateWithInput).toHaveBeenCalledTimes(1)
    expect(buildRewritePayload).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'compare',
        workspacePrompt: 'Workspace prompt from compare target',
        referencePrompt: 'Previous prompt from compare target',
      }),
    )
    expect(buildRewritePromptFromEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'compare',
        workspacePrompt: 'Workspace prompt from compare target',
        referencePrompt: 'Previous prompt from compare target',
      }),
    )
    expect(runIterateWithInput).toHaveBeenCalledWith(expect.any(String))
    expect(mockEvaluation.closePanel).toHaveBeenCalledTimes(1)
  })

  it('keeps the evaluation panel open when direct rewrite cannot start', () => {
    const mockEvaluation = createMockEvaluation()
    const runIterateWithInput = vi.fn(() => false)
    const promptPanelRef = ref({
      runIterateWithInput,
    })

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('user'),
      externalEvaluation: mockEvaluation,
    })

    const rewriteFromEvaluation = handler.createRewriteFromEvaluationHandler(promptPanelRef)

    rewriteFromEvaluation({
      type: 'prompt-only',
      result: createEvaluationResponse(76, 'prompt-only'),
    })

    expect(runIterateWithInput).toHaveBeenCalledTimes(1)
    expect(mockEvaluation.closePanel).not.toHaveBeenCalled()
  })

  it('short-circuits compare direct rewrite when rewrite guidance recommends skip', () => {
    const payloadCallCountBefore = vi.mocked(buildRewritePayload).mock.calls.length
    const promptCallCountBefore = vi.mocked(buildRewritePromptFromEvaluation).mock.calls.length

    vi.mocked(buildRewritePayload).mockReturnValueOnce({
      compressedEvaluation: {
        rewriteGuidance: {
          recommendation: 'skip',
        },
      },
    } as ReturnType<typeof buildRewritePayload>)

    const mockEvaluation = createMockEvaluation()
    const runIterateWithInput = vi.fn(() => true)
    const promptPanelRef = ref({
      runIterateWithInput,
    })

    const handler = useEvaluationHandler({
      services: ref(null),
      analysisOptimizedPrompt: ref('Prompt'),
      evaluationModelKey: ref('eval-model'),
      functionMode: ref('basic'),
      subMode: ref('system'),
      comparePayload: ref({
        target: {
          workspacePrompt: 'Workspace prompt from compare target',
          referencePrompt: 'Previous prompt from compare target',
        },
        testCases: [],
        snapshots: [],
      }),
      externalEvaluation: mockEvaluation,
    })

    const rewriteFromEvaluation = handler.createRewriteFromEvaluationHandler(promptPanelRef)

    rewriteFromEvaluation({
      type: 'compare',
      result: createEvaluationResponse(82, 'compare'),
    })

    expect(vi.mocked(buildRewritePayload).mock.calls.length).toBe(payloadCallCountBefore + 1)
    expect(vi.mocked(buildRewritePromptFromEvaluation).mock.calls.length).toBe(promptCallCountBefore)
    expect(runIterateWithInput).not.toHaveBeenCalled()
    expect(mockEvaluation.closePanel).not.toHaveBeenCalled()
    expect(toast.info).toHaveBeenCalledWith('evaluation.rewriteSkipped')
  })
})
