import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EvaluationPanel from '../../../src/components/evaluation/EvaluationPanel.vue'

vi.mock('@mindsync/core', () => ({
  createCompareService: vi.fn(() => ({
    compareTexts: vi.fn(() => ({
      fragments: [],
    })),
  })),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const naiveStubs = {
  NDrawer: {
    name: 'NDrawer',
    template: '<div v-if="show" class="n-drawer"><slot /></div>',
    props: ['show', 'width', 'placement', 'onUpdateShow'],
  },
  NDrawerContent: {
    name: 'NDrawerContent',
    template: '<section class="n-drawer-content"><slot /><slot name="footer" /></section>',
    props: ['title', 'closable'],
  },
  NSpace: {
    name: 'NSpace',
    template: '<div class="n-space"><slot /></div>',
    props: ['vertical', 'size', 'justify', 'align'],
  },
  NCard: {
    name: 'NCard',
    template: '<div class="n-card"><slot /><slot name="header" /></div>',
    props: ['title', 'size', 'embedded', 'bordered'],
  },
  NText: {
    name: 'NText',
    template: '<span><slot /></span>',
    props: ['depth', 'type'],
  },
  NButton: {
    name: 'NButton',
    template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['type', 'disabled', 'loading', 'quaternary'],
    emits: ['click'],
  },
  NIcon: {
    name: 'NIcon',
    template: '<span class="n-icon"><slot /></span>',
    props: ['size', 'depth'],
  },
  NProgress: {
    name: 'NProgress',
    template: '<div class="n-progress" />',
    props: ['percentage', 'status', 'showIndicator', 'height'],
  },
  NResult: {
    name: 'NResult',
    template: '<div class="n-result"><slot /><slot name="footer" /></div>',
    props: ['status', 'title'],
  },
  NSpin: {
    name: 'NSpin',
    template: '<div class="n-spin" />',
    props: ['size'],
  },
  NScrollbar: {
    name: 'NScrollbar',
    template: '<div class="n-scrollbar"><slot /></div>',
  },
  NEmpty: {
    name: 'NEmpty',
    template: '<div class="n-empty"><slot /><slot name="icon" /></div>',
    props: ['description'],
  },
  NAlert: {
    name: 'NAlert',
    template: '<div class="n-alert"><slot /></div>',
    props: ['type', 'bordered'],
  },
  NList: {
    name: 'NList',
    template: '<div class="n-list"><slot /></div>',
  },
  NListItem: {
    name: 'NListItem',
    template: '<div class="n-list-item"><slot /></div>',
  },
  NTag: {
    name: 'NTag',
    template: '<span class="n-tag"><slot /></span>',
    props: ['type', 'size', 'round', 'bordered'],
  },
  NTooltip: {
    name: 'NTooltip',
    template: '<div class="n-tooltip"><slot name="trigger" /><slot /></div>',
    props: ['trigger', 'disabled'],
  },
}

const baseResult = {
  type: 'compare',
  score: {
    overall: 85,
    dimensions: [
      { key: 'goal', label: '目标达成度', score: 90 },
    ],
  },
  summary: 'summary',
  improvements: [],
  patchPlan: [],
}

describe('EvaluationPanel stale state', () => {
  it('shows stale warning when detail result is outdated', () => {
    const wrapper = mount(EvaluationPanel, {
      props: {
        show: true,
        isEvaluating: false,
        currentType: 'compare',
        result: baseResult,
        streamContent: '',
        error: null,
        scoreLevel: 'good',
        stale: true,
        staleMessage: '当前测试配置或工作区内容已变更，这份对比评估基于旧快照。',
      },
      global: {
        stubs: {
          ...naiveStubs,
          InlineDiff: { name: 'InlineDiff', template: '<div class="inline-diff" />' },
          FeedbackEditor: { name: 'FeedbackEditor', template: '<div class="feedback-editor" />' },
          ChartBar: { name: 'ChartBar', template: '<svg />' },
          CompareHelpButton: { name: 'CompareHelpButton', template: '<div class="compare-help-button" />' },
        },
      },
    })

    expect(wrapper.text()).toContain('当前测试配置或工作区内容已变更，这份对比评估基于旧快照。')
    expect(wrapper.find('.n-alert').exists()).toBe(true)
  })

  it('disables feedback and re-evaluate actions when detail is stale and not re-runnable', async () => {
    const wrapper = mount(EvaluationPanel, {
      props: {
        show: true,
        isEvaluating: false,
        currentType: 'compare',
        result: baseResult,
        streamContent: '',
        error: null,
        scoreLevel: 'good',
        stale: true,
        staleMessage: '当前测试配置或工作区内容已变更，这份对比评估基于旧快照。',
        disableEvaluate: true,
      },
      global: {
        stubs: {
          ...naiveStubs,
          InlineDiff: { name: 'InlineDiff', template: '<div class="inline-diff" />' },
          FeedbackEditor: {
            name: 'FeedbackEditor',
            template: '<div class="feedback-editor" :data-disabled="String(disabled)" />',
            props: ['modelValue', 'showActions', 'disabled'],
          },
          ChartBar: { name: 'ChartBar', template: '<svg />' },
          CompareHelpButton: { name: 'CompareHelpButton', template: '<div class="compare-help-button" />' },
        },
      },
    })

    const reEvaluateButton = wrapper.get('[data-testid="evaluation-panel-re-evaluate"]')
    expect(reEvaluateButton.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.feedback-editor').attributes('data-disabled')).toBe('true')

    await reEvaluateButton.trigger('click')
    expect(wrapper.emitted('re-evaluate')).toBeFalsy()
    expect(wrapper.emitted('evaluate-with-feedback')).toBeFalsy()
  })

  it('shows the disabled compare reason when re-evaluate is unavailable', () => {
    const wrapper = mount(EvaluationPanel, {
      props: {
        show: true,
        isEvaluating: false,
        currentType: 'compare',
        result: baseResult,
        streamContent: '',
        error: null,
        scoreLevel: 'good',
        disableEvaluate: true,
        disableEvaluateReason: '对比评估至少需要一个工作区测试结果。',
      },
      global: {
        stubs: {
          ...naiveStubs,
          InlineDiff: { name: 'InlineDiff', template: '<div class="inline-diff" />' },
          FeedbackEditor: { name: 'FeedbackEditor', template: '<div class="feedback-editor" />' },
          ChartBar: { name: 'ChartBar', template: '<svg />' },
          CompareHelpButton: { name: 'CompareHelpButton', template: '<div class="compare-help-button" />' },
        },
      },
    })

    expect(wrapper.text()).toContain('对比评估至少需要一个工作区测试结果。')
  })

  it('renders structured compare metadata when compare stop signals are present', async () => {
    const wrapper = mount(EvaluationPanel, {
      props: {
        show: true,
        isEvaluating: false,
        currentType: 'compare',
        result: {
          ...baseResult,
          improvements: ['Keep the explicit task decomposition.'],
          metadata: {
            compareMode: 'structured',
            snapshotRoles: {
              a: 'target',
              b: 'baseline',
              c: 'reference',
            },
            compareStopSignals: {
              targetVsBaseline: 'improved',
              targetVsReferenceGap: 'minor',
              improvementHeadroom: 'low',
              overfitRisk: 'low',
              stopRecommendation: 'continue',
              stopReasons: ['headroom remains'],
            },
            compareJudgements: [
              {
                pairKey: 'target-vs-baseline',
                pairType: 'targetBaseline',
                pairLabel: 'Target vs Baseline',
                leftSnapshotId: 'a',
                leftSnapshotLabel: 'A',
                leftRole: 'target',
                rightSnapshotId: 'b',
                rightSnapshotLabel: 'B',
                rightRole: 'baseline',
                verdict: 'left-better',
                winner: 'left',
                confidence: 'high',
                pairSignal: 'improved',
                analysis: 'Target clearly improves on baseline.',
                evidence: ['Target keeps the requested structure.'],
                learnableSignals: ['Keep the explicit task decomposition.'],
                overfitWarnings: ['Do not add sample-specific rules.'],
              },
            ],
            compareInsights: {
              progressSummary: {
                pairKey: 'target-vs-baseline',
                pairType: 'targetBaseline',
                pairLabel: 'Target vs Baseline',
                pairSignal: 'improved',
                verdict: 'left-better',
                confidence: 'high',
                analysis: 'Target clearly improves on baseline.',
              },
              pairHighlights: [
                {
                  pairKey: 'target-vs-baseline',
                  pairType: 'targetBaseline',
                  pairLabel: 'Target vs Baseline',
                  pairSignal: 'improved',
                  verdict: 'left-better',
                  confidence: 'high',
                  analysis: 'Target clearly improves on baseline.',
                },
              ],
              evidenceHighlights: ['Target keeps the requested structure.'],
              learnableSignals: ['Keep the explicit task decomposition.'],
              overfitWarnings: ['Do not add sample-specific rules.'],
              conflictSignals: ['sampleOverfitRiskVisible'],
            },
          },
        },
        streamContent: '',
        error: null,
        scoreLevel: 'good',
      },
      global: {
        stubs: {
          ...naiveStubs,
          InlineDiff: { name: 'InlineDiff', template: '<div class="inline-diff" />' },
          FeedbackEditor: { name: 'FeedbackEditor', template: '<div class="feedback-editor" />' },
          ChartBar: { name: 'ChartBar', template: '<svg />' },
          CompareHelpButton: { name: 'CompareHelpButton', template: '<div class="compare-help-button" />' },
        },
      },
    })

    expect(wrapper.text()).toContain('Iteration Advice')
    expect(wrapper.text()).toContain('Keep Iterating')
    expect(wrapper.text()).toContain('The optimization target is moving in the right direction, but there is still actionable improvement headroom.')
    expect(wrapper.text()).toContain('summary')
    expect(wrapper.get('[data-testid="evaluation-panel-summary-card"]').text()).toBe('summary')
    expect(wrapper.get('[data-testid="evaluation-panel-compare-secondary-headline"]').text())
      .toContain('The optimization target is moving in the right direction')
    expect(wrapper.find('.score-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Previous')
    expect(wrapper.text()).toContain('Teacher')
    expect(wrapper.text()).not.toContain('Stability and Overfit Risk')
    expect(wrapper.text()).toContain('Keep the explicit task decomposition.')
    expect(wrapper.find('[data-testid="evaluation-panel-compare-context"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="evaluation-panel-compare-metadata"]').exists()).toBe(false)
    const roleText = wrapper.find('[data-testid="evaluation-panel-compare-context-roles"]').text()
    expect(roleText).toContain('Optimization Target')
    expect(roleText).toContain('Previous Version')
    expect(roleText).toContain('Teacher')
    expect(roleText.indexOf('A')).toBeLessThan(roleText.indexOf('B'))
    expect(roleText.indexOf('B')).toBeLessThan(roleText.indexOf('C'))
    expect(wrapper.text()).not.toContain('Comparison Mode')
    expect(wrapper.text()).not.toContain('Smart Compare')
    expect(wrapper.find('[data-testid="evaluation-panel-compare-metadata-stop-signals"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="evaluation-panel-compare-insights"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="evaluation-panel-compare-judgements"]').exists()).toBe(false)
  })

  it('surfaces a review-oriented compare decision when the target regresses', () => {
    const wrapper = mount(EvaluationPanel, {
      props: {
        show: true,
        isEvaluating: false,
        currentType: 'compare',
        result: {
          ...baseResult,
          metadata: {
            compareMode: 'structured',
            compareStopSignals: {
              targetVsBaseline: 'regressed',
              targetVsReferenceGap: 'major',
              improvementHeadroom: 'medium',
              overfitRisk: 'high',
              stopRecommendation: 'continue',
              stopReasons: ['the latest rewrite removed a required structure boundary'],
            },
            compareInsights: {
              progressSummary: {
                pairKey: 'target-vs-baseline',
                pairType: 'targetBaseline',
                pairLabel: 'Target vs Baseline',
                pairSignal: 'regressed',
                verdict: 'right-better',
                confidence: 'high',
                analysis: 'The previous version follows the required structure more consistently.',
              },
              overfitWarnings: ['The latest rewrite adds a sample-specific logistics rule.'],
              pairHighlights: [],
            },
          },
        },
        streamContent: '',
        error: null,
        scoreLevel: 'poor',
      },
      global: {
        stubs: {
          ...naiveStubs,
          InlineDiff: { name: 'InlineDiff', template: '<div class="inline-diff" />' },
          FeedbackEditor: { name: 'FeedbackEditor', template: '<div class="feedback-editor" />' },
          ChartBar: { name: 'ChartBar', template: '<svg />' },
          CompareHelpButton: { name: 'CompareHelpButton', template: '<div class="compare-help-button" />' },
        },
      },
    })

    expect(wrapper.text()).toContain('Iteration Advice')
    expect(wrapper.text()).toContain('Needs Review')
    expect(wrapper.text()).toContain('The optimization target appears to have regressed relative to the previous version; do not accept this rewrite directly.')
    expect(wrapper.get('[data-testid="evaluation-panel-summary-card"]').text()).toBe('summary')
    expect(wrapper.get('[data-testid="evaluation-panel-compare-secondary-headline"]').text())
      .toContain('The optimization target appears to have regressed relative to the previous version')
    expect(wrapper.find('.score-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Previous')
    expect(wrapper.text()).not.toContain('Teacher')
    expect(wrapper.text()).not.toContain('Stability and Overfit Risk')
  })

  it('hides teacher-gap UI when compare metadata has no reference role', () => {
    const wrapper = mount(EvaluationPanel, {
      props: {
        show: true,
        isEvaluating: false,
        currentType: 'compare',
        result: {
          ...baseResult,
          metadata: {
            compareMode: 'generic',
            snapshotRoles: {
              a: 'baseline',
              b: 'target',
            },
            compareStopSignals: {
              targetVsBaseline: 'improved',
              targetVsReferenceGap: 'minor',
              overfitRisk: 'medium',
              stopRecommendation: 'review',
            },
          },
        },
        streamContent: '',
        error: null,
        scoreLevel: 'good',
      },
      global: {
        stubs: {
          ...naiveStubs,
          InlineDiff: { name: 'InlineDiff', template: '<div class="inline-diff" />' },
          FeedbackEditor: { name: 'FeedbackEditor', template: '<div class="feedback-editor" />' },
          ChartBar: { name: 'ChartBar', template: '<svg />' },
          CompareHelpButton: { name: 'CompareHelpButton', template: '<div class="compare-help-button" />' },
        },
      },
    })

    const decisionCard = wrapper.get('[data-testid="evaluation-panel-compare-decision"]')

    expect(decisionCard.text()).toContain('Previous: Improved')
    expect(decisionCard.text()).not.toContain('Teacher Gap')
    expect(decisionCard.text()).not.toContain('Teacher')
  })

  it('adds a prompt-validity action when compare conflict signals show unsupported reference evidence', async () => {
    const wrapper = mount(EvaluationPanel, {
      props: {
        show: true,
        isEvaluating: false,
        currentType: 'compare',
        result: {
          ...baseResult,
          metadata: {
            compareMode: 'structured',
            compareStopSignals: {
              targetVsBaseline: 'improved',
              targetVsReferenceGap: 'minor',
              improvementHeadroom: 'medium',
              overfitRisk: 'low',
              stopRecommendation: 'review',
              stopReasons: ['reference-side validation is missing'],
            },
            compareInsights: {
              progressSummary: {
                pairKey: 'target-vs-baseline',
                pairType: 'targetBaseline',
                pairLabel: 'Target vs Baseline',
                pairSignal: 'improved',
                verdict: 'left-better',
                confidence: 'high',
                analysis: 'The target is stronger than the previous version.',
              },
              promptChangeSummary: {
                pairKey: 'reference-vs-reference-baseline',
                pairType: 'referenceBaseline',
                pairLabel: 'Reference vs Reference Baseline',
                pairSignal: 'unsupported',
                verdict: 'right-better',
                confidence: 'medium',
                analysis: 'The same prompt change is not supported on the reference side.',
              },
              pairHighlights: [],
              conflictSignals: ['improvementNotSupportedOnReference'],
            },
          },
        },
        streamContent: '',
        error: null,
        scoreLevel: 'good',
      },
      global: {
        stubs: {
          ...naiveStubs,
          InlineDiff: { name: 'InlineDiff', template: '<div class="inline-diff" />' },
          FeedbackEditor: { name: 'FeedbackEditor', template: '<div class="feedback-editor" />' },
          ChartBar: { name: 'ChartBar', template: '<svg />' },
          CompareHelpButton: { name: 'CompareHelpButton', template: '<div class="compare-help-button" />' },
        },
      },
    })

    expect(wrapper.find('[data-testid="evaluation-panel-compare-context"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="evaluation-panel-compare-metadata"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="evaluation-panel-compare-insights"]').exists()).toBe(false)
  })

  it('emits rewrite-from-evaluation when the rewrite action is clicked', async () => {
    const wrapper = mount(EvaluationPanel, {
      props: {
        show: true,
        isEvaluating: false,
        currentType: 'compare',
        result: baseResult,
        streamContent: '',
        error: null,
        scoreLevel: 'good',
        canRewriteFromEvaluation: true,
      },
      global: {
        stubs: {
          ...naiveStubs,
          InlineDiff: { name: 'InlineDiff', template: '<div class="inline-diff" />' },
          FeedbackEditor: { name: 'FeedbackEditor', template: '<div class="feedback-editor" />' },
          ChartBar: { name: 'ChartBar', template: '<svg />' },
          CompareHelpButton: { name: 'CompareHelpButton', template: '<div class="compare-help-button" />' },
        },
      },
    })

    await wrapper.get('[data-testid="evaluation-panel-rewrite-from-evaluation"]').trigger('click')

    expect(wrapper.emitted('rewrite-from-evaluation')).toEqual([
      [
        {
          result: baseResult,
          type: 'compare',
        },
      ],
    ])
  })

  it('disables rewrite-from-evaluation when the current result is stale', () => {
    const wrapper = mount(EvaluationPanel, {
      props: {
        show: true,
        isEvaluating: false,
        currentType: 'compare',
        result: baseResult,
        streamContent: '',
        error: null,
        scoreLevel: 'good',
        stale: true,
        canRewriteFromEvaluation: true,
      },
      global: {
        stubs: {
          ...naiveStubs,
          InlineDiff: { name: 'InlineDiff', template: '<div class="inline-diff" />' },
          FeedbackEditor: { name: 'FeedbackEditor', template: '<div class="feedback-editor" />' },
          ChartBar: { name: 'ChartBar', template: '<svg />' },
          CompareHelpButton: { name: 'CompareHelpButton', template: '<div class="compare-help-button" />' },
        },
      },
    })

    expect(
      wrapper.get('[data-testid="evaluation-panel-rewrite-from-evaluation"]').attributes('disabled')
    ).toBeDefined()
  })

  it('does not render rewrite-from-evaluation when the parent disables the rewrite entry', () => {
    const wrapper = mount(EvaluationPanel, {
      props: {
        show: true,
        isEvaluating: false,
        currentType: 'compare',
        result: baseResult,
        streamContent: '',
        error: null,
        scoreLevel: 'good',
        canRewriteFromEvaluation: false,
      },
      global: {
        stubs: {
          ...naiveStubs,
          InlineDiff: { name: 'InlineDiff', template: '<div class="inline-diff" />' },
          FeedbackEditor: { name: 'FeedbackEditor', template: '<div class="feedback-editor" />' },
          ChartBar: { name: 'ChartBar', template: '<svg />' },
          CompareHelpButton: { name: 'CompareHelpButton', template: '<div class="compare-help-button" />' },
        },
      },
    })

    expect(wrapper.find('[data-testid="evaluation-panel-rewrite-from-evaluation"]').exists()).toBe(false)
  })
})
