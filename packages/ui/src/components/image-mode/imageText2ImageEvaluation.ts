import {
  isImageRef,
  type CompareAnalysisHints,
  type EvaluationContentBlock,
  type EvaluationMediaItem,
  type EvaluationSnapshot,
  type EvaluationTarget,
  type EvaluationTestCase,
  type ImageResult,
} from '@mindsync/core'
import type { ResultEvaluationTarget } from '../../composables/prompt/useEvaluationHandler'
import {
  hasWorkspaceCompareSnapshot,
  type CompareEvaluationPayload,
} from '../../composables/prompt/compareEvaluation'
import {
  buildTestPanelVersionPromptRef,
  formatTestPanelVersionSelectionLabel,
  type ResolvedTestPanelVersionSelection,
  type TestPanelVersionLabels,
} from '../../utils/testPanelVersion'

export interface ImageText2ImageEvaluationVariant {
  id: string
  label: string
  resolvedPrompt: ResolvedTestPanelVersionSelection
  promptText: string
  modelKey?: string
  result: ImageResult | null
}

export interface ImageText2ImageEvaluationContext {
  originalIntent: string
  workspacePrompt: string
  referencePrompt?: string
  versionLabels: TestPanelVersionLabels
}

const TEST_CASE_ID = 'image-text2image-intent'
const TEST_CASE_LABEL = 'Generation Intent'
const OUTPUT_BLOCK_LABEL = 'Generated Output'

const normalizeInlineText = (value: string | undefined): string =>
  (value || '').replace(/\s+/gu, ' ').trim()

const buildTarget = (
  context: ImageText2ImageEvaluationContext
): EvaluationTarget | null => {
  const workspacePrompt = context.workspacePrompt.trim()
  if (!workspacePrompt) {
    return null
  }

  const referencePrompt = context.referencePrompt?.trim() || ''
  return {
    workspacePrompt,
    referencePrompt: referencePrompt || undefined,
  }
}

const buildTestCase = (
  context: ImageText2ImageEvaluationContext
): EvaluationTestCase | null => {
  const originalIntent = context.originalIntent.trim()
  if (!originalIntent) {
    return null
  }

  return {
    id: TEST_CASE_ID,
    label: TEST_CASE_LABEL,
    input: {
      kind: 'text',
      label: TEST_CASE_LABEL,
      content: originalIntent,
    },
  }
}

const toEvaluationMediaItem = (
  image: ImageResult['images'][number] | null | undefined,
  label: string
): EvaluationMediaItem | null => {
  if (!image) return null

  if (isImageRef(image)) {
    return {
      label,
      assetId: image.id,
    }
  }

  const b64 = image.b64?.trim() || ''
  if (!b64) {
    return null
  }

  return {
    label,
    b64,
    mimeType: image.mimeType?.trim() || 'image/png',
  }
}

const buildOutputBlock = (
  variant: ImageText2ImageEvaluationVariant
): EvaluationContentBlock | undefined => {
  const media = (variant.result?.images || [])
    .map((image, index) => toEvaluationMediaItem(image, `${variant.label}-${index + 1}`))
    .filter((item): item is EvaluationMediaItem => !!item)

  if (!media.length) {
    return undefined
  }

  return {
    kind: 'image',
    label: OUTPUT_BLOCK_LABEL,
    content: `Show the generated image result for column ${variant.label}.`,
    media,
  }
}

const buildSnapshot = (
  variant: ImageText2ImageEvaluationVariant,
  versionLabels: TestPanelVersionLabels,
): EvaluationSnapshot | null => {
  const promptText = normalizeInlineText(variant.promptText)
  if (!promptText) {
    return null
  }

  const outputBlock = buildOutputBlock(variant)
  if (!outputBlock) {
    return null
  }

  return {
    id: variant.id,
    label: variant.label,
    testCaseId: TEST_CASE_ID,
    promptRef: buildTestPanelVersionPromptRef(variant.resolvedPrompt, versionLabels),
    promptText,
    output: `Show the generated image result for column ${variant.label}.`,
    outputBlock,
    modelKey: variant.modelKey?.trim() || undefined,
    versionLabel: formatTestPanelVersionSelectionLabel(
      variant.resolvedPrompt.selection,
      variant.resolvedPrompt.resolvedVersion,
      versionLabels
    ),
  }
}

const buildCompareHints = (
  snapshots: EvaluationSnapshot[]
): CompareAnalysisHints => {
  const promptCount = new Set(snapshots.map((snapshot) => snapshot.promptText.trim())).size
  const modelCount = new Set(
    snapshots
      .map((snapshot) => (snapshot.modelKey || '').trim())
      .filter(Boolean)
  ).size

  return {
    mode: 'generic',
    hasSharedTestCases: true,
    hasSamePromptSnapshots: promptCount === 1,
    hasCrossModelComparison: promptCount === 1 && modelCount > 1,
  }
}

export const buildImageText2ImageResultEvaluationTargets = (params: {
  context: ImageText2ImageEvaluationContext
  variants: ImageText2ImageEvaluationVariant[]
}): Record<string, ResultEvaluationTarget> => {
  const target = buildTarget(params.context)
  const testCase = buildTestCase(params.context)

  if (!target || !testCase) {
    return {}
  }

  return params.variants.reduce<Record<string, ResultEvaluationTarget>>((accumulator, variant) => {
    const snapshot = buildSnapshot(variant, params.context.versionLabels)
    if (!snapshot) {
      return accumulator
    }

    accumulator[variant.id] = {
      variantId: variant.id,
      target,
      testCase,
      snapshot,
    }
    return accumulator
  }, {})
}

export const buildImageText2ImageComparePayload = (params: {
  context: ImageText2ImageEvaluationContext
  variants: ImageText2ImageEvaluationVariant[]
}): CompareEvaluationPayload | null => {
  const target = buildTarget(params.context)
  const testCase = buildTestCase(params.context)

  if (!target || !testCase) {
    return null
  }

  const snapshots = params.variants
    .map((variant) => buildSnapshot(variant, params.context.versionLabels))
    .filter((snapshot): snapshot is EvaluationSnapshot => !!snapshot)

  if (snapshots.length < 2) {
    return null
  }

  if (!hasWorkspaceCompareSnapshot(snapshots)) {
    return null
  }

  return {
    target,
    testCases: [testCase],
    snapshots,
    compareHints: buildCompareHints(snapshots),
  }
}

export const shouldShowImageText2ImageResultAction = (
  variantId: string,
  targets: Record<string, ResultEvaluationTarget>,
  hasExistingEvaluation = false,
): boolean => !!targets[variantId] || hasExistingEvaluation

export const canEvaluateImageText2ImageResult = (
  variantId: string,
  targets: Record<string, ResultEvaluationTarget>,
  hasImageRecognitionModel: boolean,
): boolean => !!targets[variantId] && hasImageRecognitionModel

export const shouldShowImageText2ImageCompareAction = (
  payload: CompareEvaluationPayload | null,
  hasExistingEvaluation = false,
  hasCompareCandidates = false,
): boolean => !!payload || hasExistingEvaluation || hasCompareCandidates

export const canEvaluateImageText2ImageCompare = (
  payload: CompareEvaluationPayload | null,
  hasImageRecognitionModel: boolean,
): boolean => !!payload && hasImageRecognitionModel
