import type {
  CompareAnalysisHints,
  EvaluationContentBlock,
  EvaluationMediaItem,
  EvaluationSnapshot,
  EvaluationTarget,
  EvaluationTestCase,
  StructuredCompareRole,
} from '@mindsync/core'

export interface CompareEvaluationTestCaseDraft {
  id: string
  label?: string
  input?: EvaluationContentBlock | null
  settingsSummary?: string
}

export interface CompareEvaluationSnapshotDraft {
  id: string
  label: string
  testCaseId: string
  promptRef: EvaluationSnapshot['promptRef']
  promptText?: string
  output?: string
  outputBlock?: EvaluationContentBlock | null
  reasoning?: string
  modelKey?: string
  versionLabel?: string
  executionInput?: EvaluationContentBlock | null
}

export interface CompareEvaluationPayload {
  target: EvaluationTarget
  testCases: EvaluationTestCase[]
  snapshots: EvaluationSnapshot[]
  compareHints: CompareAnalysisHints
}

export interface CompareRoleCandidate<Id extends string = string> {
  id: Id
  label: string
  promptRef: EvaluationSnapshot['promptRef']
  promptText?: string
  modelKey?: string
  versionLabel?: string
}

export type CompareSnapshotRoleMap<Id extends string = string> = Partial<Record<Id, StructuredCompareRole>>

export type StructuredCompareExecutablePair =
  | 'targetBaseline'
  | 'targetReference'
  | 'referenceBaseline'
  | 'targetReplica'

export type StructuredCompareBlockingReason =
  | 'duplicateTarget'
  | 'duplicateBaseline'
  | 'duplicateReference'
  | 'duplicateReferenceBaseline'
  | 'hasAuxiliarySnapshot'
  | 'missingTarget'
  | 'missingStructuredCompanion'

export type StructuredCompareWarningReason =
  | 'referenceBaselineWithoutReference'

interface PersistedCompareRoleSignaturePayload {
  baseSignature: string
  workspacePromptSignature?: string
}

export interface StructuredCompareRoleConflict<Id extends string = string> {
  role: StructuredCompareRole
  snapshotIds: Id[]
}

export interface StructuredComparePlanAnalysis<Id extends string = string> {
  mode: 'generic' | 'structured'
  executablePairs: StructuredCompareExecutablePair[]
  blockingReasons: StructuredCompareBlockingReason[]
  warningReasons: StructuredCompareWarningReason[]
  singletonConflicts: StructuredCompareRoleConflict<Id>[]
  roleIdsByType: Partial<Record<StructuredCompareRole, Id[]>>
}

const STRUCTURED_SINGLETON_ROLES: StructuredCompareRole[] = [
  'target',
  'baseline',
  'reference',
  'referenceBaseline',
]

const DUPLICATE_ROLE_REASON_MAP: Record<
  Extract<
    StructuredCompareRole,
    'target' | 'baseline' | 'reference' | 'referenceBaseline'
  >,
  StructuredCompareBlockingReason
> = {
  target: 'duplicateTarget',
  baseline: 'duplicateBaseline',
  reference: 'duplicateReference',
  referenceBaseline: 'duplicateReferenceBaseline',
}

const normalizeInlineText = (value: string | undefined): string =>
  (value || '').replace(/\s+/gu, ' ').trim()

const computeStableTextHash = (value: string): string => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash.toString(16)
}

export const buildCompareRoleCandidateSignature = (
  candidate: Pick<CompareRoleCandidate, 'promptRef' | 'modelKey' | 'promptText'>
): string => {
  const promptKind = candidate.promptRef.kind
  const promptVersion = candidate.promptRef.kind === 'version'
    ? String(candidate.promptRef.version ?? '')
    : ''
  const promptDynamicAlias = candidate.promptRef.dynamicAlias || ''
  const modelKey = (candidate.modelKey || '').trim()
  const normalizedPromptText = normalizeInlineText(candidate.promptText)
  const promptTextSignature = candidate.promptRef.kind === 'workspace'
    ? ''
    : `${normalizedPromptText.length}:${computeStableTextHash(normalizedPromptText)}`

  return JSON.stringify({
    promptKind,
    promptVersion,
    promptDynamicAlias,
    modelKey,
    promptTextSignature,
  })
}

export const buildCompareRoleCandidateWorkspacePromptSignature = (
  candidate: Pick<CompareRoleCandidate, 'promptRef' | 'promptText'>
): string => {
  if (candidate.promptRef.kind !== 'workspace') {
    return ''
  }

  const normalizedPromptText = normalizeInlineText(candidate.promptText)
  return `${normalizedPromptText.length}:${computeStableTextHash(normalizedPromptText)}`
}

export const serializeCompareRolePersistedSignature = (
  payload: PersistedCompareRoleSignaturePayload,
): string => JSON.stringify({
  v: 1,
  b: payload.baseSignature,
  ...(payload.workspacePromptSignature
    ? { w: payload.workspacePromptSignature }
    : {}),
})

export const parseCompareRolePersistedSignature = (
  value: string | undefined,
): PersistedCompareRoleSignaturePayload | null => {
  const trimmed = (value || '').trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed) as {
      b?: unknown
      baseSignature?: unknown
      w?: unknown
      workspacePromptSignature?: unknown
    }

    const baseSignature = typeof parsed.b === 'string'
      ? parsed.b.trim()
      : typeof parsed.baseSignature === 'string'
        ? parsed.baseSignature.trim()
        : ''

    if (!baseSignature) {
      return {
        baseSignature: trimmed,
      }
    }

    const workspacePromptSignature = typeof parsed.w === 'string'
      ? parsed.w.trim()
      : typeof parsed.workspacePromptSignature === 'string'
        ? parsed.workspacePromptSignature.trim()
        : ''

    return {
      baseSignature,
      workspacePromptSignature: workspacePromptSignature || undefined,
    }
  } catch {
    return {
      baseSignature: trimmed,
    }
  }
}

const normalizeContentBlock = (
  block: EvaluationContentBlock | null | undefined
): EvaluationContentBlock | undefined => {
  const label = block?.label?.trim() || ''
  const content = block?.content?.trim() || ''
  const media: EvaluationMediaItem[] = []

  for (const item of block?.media || []) {
    const itemLabel = item?.label?.trim() || ''
    const assetId = item?.assetId?.trim() || ''
    const b64 = item?.b64?.trim() || ''
    if (!itemLabel || (!assetId && !b64) || (assetId && b64)) {
      continue
    }

    const mimeType = item?.mimeType?.trim() || undefined
    if (assetId) {
      media.push({
        label: itemLabel,
        assetId,
        mimeType,
      })
      continue
    }

    media.push({
      label: itemLabel,
      b64,
      mimeType,
    })
  }

  if (!label || (!content && !media.length)) return undefined

  const summary = block?.summary?.trim() || ''
  return {
    kind: block?.kind || 'custom',
    label,
    content,
    summary: summary || undefined,
    media: media.length ? media : undefined,
  }
}

const normalizeTestCase = (
  testCase: CompareEvaluationTestCaseDraft | null | undefined
): EvaluationTestCase | null => {
  if (!testCase?.id?.trim()) return null
  const input = normalizeContentBlock(testCase.input)
  if (!input) return null

  const label = testCase.label?.trim() || ''
  const settingsSummary = testCase.settingsSummary?.trim() || ''

  return {
    id: testCase.id.trim(),
    label: label || undefined,
    input,
    settingsSummary: settingsSummary || undefined,
  }
}

const normalizeSnapshot = (
  snapshot: CompareEvaluationSnapshotDraft | null | undefined,
  validTestCaseIds: Set<string>,
): EvaluationSnapshot | null => {
  const promptText = snapshot?.promptText?.trim() || ''
  const output = snapshot?.output?.trim() || ''
  const testCaseId = snapshot?.testCaseId?.trim() || ''
  if (
    !snapshot?.id?.trim() ||
    !snapshot?.label?.trim() ||
    !testCaseId ||
    !validTestCaseIds.has(testCaseId) ||
    !promptText ||
    !output
  ) {
    return null
  }

  return {
    id: snapshot.id.trim(),
    label: snapshot.label.trim(),
    testCaseId,
    promptRef: snapshot.promptRef,
    promptText,
    output,
    outputBlock: normalizeContentBlock(snapshot.outputBlock),
    reasoning: snapshot.reasoning?.trim() || undefined,
    modelKey: snapshot.modelKey?.trim() || undefined,
    versionLabel: snapshot.versionLabel?.trim() || undefined,
    executionInput: normalizeContentBlock(snapshot.executionInput),
  }
}

const buildTestCaseEvidenceKey = (testCase: EvaluationTestCase | undefined): string =>
  JSON.stringify({
    kind: testCase?.input.kind || '',
    summary: testCase?.input.summary || '',
    content: testCase?.input.content || '',
    settingsSummary: testCase?.settingsSummary || '',
  })

export const analyzeStructuredComparePlan = <Id extends string = string>(
  snapshotRoles: Record<Id, StructuredCompareRole>
): StructuredComparePlanAnalysis<Id> => {
  const roleIdsByType = Object.entries(snapshotRoles).reduce(
    (accumulator, [snapshotId, role]) => {
      const normalizedRole = role as StructuredCompareRole
      const currentIds = accumulator[normalizedRole] || []
      accumulator[normalizedRole] = [...currentIds, snapshotId as Id]
      return accumulator
    },
    {} as Partial<Record<StructuredCompareRole, Id[]>>
  )

  const singletonConflicts = STRUCTURED_SINGLETON_ROLES
    .map((role) => {
      const snapshotIds = roleIdsByType[role] || []
      if (snapshotIds.length <= 1) return null

      return {
        role,
        snapshotIds,
      } as StructuredCompareRoleConflict<Id>
    })
    .filter((entry): entry is StructuredCompareRoleConflict<Id> => !!entry)

  const blockingReasons: StructuredCompareBlockingReason[] = [
    ...singletonConflicts.map(
      (entry) => DUPLICATE_ROLE_REASON_MAP[
        entry.role as keyof typeof DUPLICATE_ROLE_REASON_MAP
      ]
    ),
  ]

  const hasExactTarget = (roleIdsByType.target || []).length === 1
  const hasExactBaseline = (roleIdsByType.baseline || []).length === 1
  const hasExactReference = (roleIdsByType.reference || []).length === 1
  const hasExactReferenceBaseline = (roleIdsByType.referenceBaseline || []).length === 1
  const replicaCount = (roleIdsByType.replica || []).length
  const auxiliaryCount = (roleIdsByType.auxiliary || []).length

  const executablePairs: StructuredCompareExecutablePair[] = []

  if (hasExactTarget && hasExactBaseline) {
    executablePairs.push('targetBaseline')
  }
  if (hasExactTarget && hasExactReference) {
    executablePairs.push('targetReference')
  }
  if (hasExactReference && hasExactReferenceBaseline) {
    executablePairs.push('referenceBaseline')
  }
  if (hasExactTarget && replicaCount > 0) {
    executablePairs.push('targetReplica')
  }

  if (!hasExactTarget) {
    blockingReasons.push('missingTarget')
  }

  if (auxiliaryCount > 0) {
    blockingReasons.push('hasAuxiliarySnapshot')
  } else if (
    !executablePairs.includes('targetBaseline') &&
    !executablePairs.includes('targetReference') &&
    !executablePairs.includes('targetReplica')
  ) {
    blockingReasons.push('missingStructuredCompanion')
  }

  const warningReasons: StructuredCompareWarningReason[] =
    (roleIdsByType.referenceBaseline || []).length > 0 &&
    (roleIdsByType.reference || []).length === 0
      ? ['referenceBaselineWithoutReference']
      : []

  const dedupedBlockingReasons = Array.from(new Set(blockingReasons))

  return {
    mode: dedupedBlockingReasons.length === 0 ? 'structured' : 'generic',
    executablePairs,
    blockingReasons: dedupedBlockingReasons,
    warningReasons,
    singletonConflicts,
    roleIdsByType,
  }
}

export const hasStructuredJudgePlan = (
  snapshotRoles: Record<string, StructuredCompareRole>
): boolean => {
  return analyzeStructuredComparePlan(snapshotRoles).mode === 'structured'
}

type RankedCompareRoleCandidate = Pick<
  CompareRoleCandidate,
  'id' | 'promptRef' | 'promptText' | 'modelKey'
> & {
  index: number
}

const compareScoreVectors = (left: number[], right: number[]): number => {
  const maxLength = Math.max(left.length, right.length)
  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = left[index] ?? 0
    const rightValue = right[index] ?? 0
    if (leftValue !== rightValue) {
      return leftValue - rightValue
    }
  }

  return 0
}

const pickPreferredCompareRoleCandidate = (
  candidates: RankedCompareRoleCandidate[],
  scoreBuilder: (candidate: RankedCompareRoleCandidate) => number[],
): RankedCompareRoleCandidate | null => {
  if (!candidates.length) {
    return null
  }

  return candidates.reduce((best, candidate) => {
    const comparison = compareScoreVectors(
      scoreBuilder(candidate),
      scoreBuilder(best),
    )

    return comparison > 0 ? candidate : best
  })
}

const getComparePromptKindPriority = (
  promptRef: CompareRoleCandidate['promptRef'],
  mode: 'preferVersion' | 'preferWorkspace',
): number => {
  if (mode === 'preferVersion') {
    if (promptRef.kind === 'version') return 2
    if (promptRef.kind === 'workspace') return 1
    return 0
  }

  if (promptRef.kind === 'workspace') return 2
  if (promptRef.kind === 'version') return 1
  return 0
}

const getComparePromptVersionRank = (
  promptRef: CompareRoleCandidate['promptRef'],
): number => typeof promptRef.version === 'number' ? promptRef.version : -1

const getComparePromptDynamicAliasPriority = (
  promptRef: CompareRoleCandidate['promptRef'],
): number => promptRef.dynamicAlias === 'previous' ? 1 : 0

const buildBaselineCandidateScore = (
  candidate: RankedCompareRoleCandidate,
): number[] => [
  getComparePromptDynamicAliasPriority(candidate.promptRef),
  getComparePromptKindPriority(candidate.promptRef, 'preferVersion'),
  getComparePromptVersionRank(candidate.promptRef),
  -candidate.index,
]

const buildReferenceCandidateScore = (
  candidate: RankedCompareRoleCandidate,
): number[] => [
  getComparePromptKindPriority(candidate.promptRef, 'preferWorkspace'),
  getComparePromptVersionRank(candidate.promptRef),
  -candidate.index,
]

export const inferCompareSnapshotRoles = (
  snapshots: Array<Pick<CompareRoleCandidate, 'id' | 'promptRef' | 'promptText' | 'modelKey'>>,
  snapshotRoleSeeds?: CompareSnapshotRoleMap | null,
): Record<string, StructuredCompareRole> => {
  const rankedSnapshots: RankedCompareRoleCandidate[] = snapshots.map((snapshot, index) => ({
    ...snapshot,
    index,
  }))
  const validSnapshotIds = new Set(snapshots.map((snapshot) => snapshot.id))
  const snapshotRoles: Record<string, StructuredCompareRole> = Object.fromEntries(
    Object.entries(snapshotRoleSeeds || {})
      .filter(([snapshotId, role]) => validSnapshotIds.has(snapshotId) && !!role)
      .map(([snapshotId, role]) => [snapshotId, role as StructuredCompareRole])
  )

  const workspaceSnapshots = rankedSnapshots.filter(
    (snapshot) => snapshot.promptRef.kind === 'workspace'
  )
  const seededTargetSnapshots = rankedSnapshots.filter(
    (snapshot) => snapshotRoles[snapshot.id] === 'target'
  )
  const targetSnapshot = seededTargetSnapshots.length === 1
    ? seededTargetSnapshots[0]
    : seededTargetSnapshots.length === 0 && workspaceSnapshots.length >= 1
      ? workspaceSnapshots[0]
      : null

  if (!targetSnapshot) {
    return snapshotRoles
  }

  const normalizedTargetModel = (targetSnapshot.modelKey || '').trim()
  const normalizedTargetPrompt = normalizeInlineText(targetSnapshot.promptText)
  snapshotRoles[targetSnapshot.id] = 'target'

  const getAssignedSnapshot = (
    role: StructuredCompareRole,
  ): RankedCompareRoleCandidate | null =>
    rankedSnapshots.find((snapshot) => snapshotRoles[snapshot.id] === role) || null

  const getUnassignedSnapshots = (): RankedCompareRoleCandidate[] =>
    rankedSnapshots.filter((snapshot) => !snapshotRoles[snapshot.id])

  if (!getAssignedSnapshot('baseline')) {
    const baselineCandidate = pickPreferredCompareRoleCandidate(
      getUnassignedSnapshots().filter((snapshot) => {
        const normalizedModel = (snapshot.modelKey || '').trim()
        const normalizedPrompt = normalizeInlineText(snapshot.promptText)
        return (
          snapshot.id !== targetSnapshot.id &&
          !!normalizedTargetModel &&
          normalizedModel === normalizedTargetModel &&
          normalizedPrompt !== normalizedTargetPrompt
        )
      }),
      buildBaselineCandidateScore,
    )

    if (baselineCandidate) {
      snapshotRoles[baselineCandidate.id] = 'baseline'
    }
  }

  if (!getAssignedSnapshot('reference')) {
    const referenceCandidate = pickPreferredCompareRoleCandidate(
      getUnassignedSnapshots().filter((snapshot) => {
        const normalizedModel = (snapshot.modelKey || '').trim()
        const normalizedPrompt = normalizeInlineText(snapshot.promptText)
        return (
          !!normalizedModel &&
          normalizedModel !== normalizedTargetModel &&
          normalizedPrompt === normalizedTargetPrompt
        )
      }),
      buildReferenceCandidateScore,
    )

    if (referenceCandidate) {
      snapshotRoles[referenceCandidate.id] = 'reference'
    }
  }

  const referenceSnapshot = getAssignedSnapshot('reference')

  if (referenceSnapshot && !getAssignedSnapshot('referenceBaseline')) {
    const normalizedReferenceModel = (referenceSnapshot.modelKey || '').trim()
    const normalizedReferencePrompt = normalizeInlineText(referenceSnapshot.promptText)
    const referenceBaselineCandidate = pickPreferredCompareRoleCandidate(
      getUnassignedSnapshots().filter((snapshot) => {
        const normalizedModel = (snapshot.modelKey || '').trim()
        const normalizedPrompt = normalizeInlineText(snapshot.promptText)
        return (
          !!normalizedReferenceModel &&
          normalizedModel === normalizedReferenceModel &&
          normalizedPrompt !== normalizedReferencePrompt
        )
      }),
      buildBaselineCandidateScore,
    )

    if (referenceBaselineCandidate) {
      snapshotRoles[referenceBaselineCandidate.id] = 'referenceBaseline'
    }
  }

  for (const snapshot of rankedSnapshots) {
    if (snapshotRoles[snapshot.id]) continue

    const normalizedModel = (snapshot.modelKey || '').trim()
    const normalizedPrompt = normalizeInlineText(snapshot.promptText)

    if (
      normalizedTargetModel &&
      normalizedModel === normalizedTargetModel &&
      normalizedPrompt === normalizedTargetPrompt
    ) {
      snapshotRoles[snapshot.id] = 'replica'
    }
  }

  for (const snapshot of rankedSnapshots) {
    if (!snapshotRoles[snapshot.id]) {
      snapshotRoles[snapshot.id] = 'auxiliary'
    }
  }

  return snapshotRoles
}

const deriveCompareHints = (
  snapshots: EvaluationSnapshot[],
  testCases: EvaluationTestCase[],
  snapshotRolesOverride?: CompareSnapshotRoleMap | null,
): CompareAnalysisHints => {
  const testCaseMap = new Map(testCases.map((testCase) => [testCase.id, testCase]))
  const testCaseCount = new Set(
    snapshots.map((snapshot) => buildTestCaseEvidenceKey(testCaseMap.get(snapshot.testCaseId)))
  ).size
  const promptCount = new Set(
    snapshots.map((snapshot) => snapshot.promptText.trim())
  ).size
  const modelCount = new Set(
    snapshots
      .map((snapshot) => (snapshot.modelKey || '').trim())
      .filter(Boolean)
  ).size

  const hasSharedTestCases = testCaseCount === 1
  const hasSamePromptSnapshots = promptCount === 1
  const hasCrossModelComparison =
    hasSharedTestCases &&
    hasSamePromptSnapshots &&
    modelCount > 1

  const snapshotRoles = inferCompareSnapshotRoles(
    snapshots.map((snapshot) => ({
      id: snapshot.id,
      promptRef: snapshot.promptRef,
      promptText: snapshot.promptText,
      modelKey: snapshot.modelKey,
    })),
    snapshotRolesOverride,
  )

  const mode = hasStructuredJudgePlan(snapshotRoles) ? 'structured' : 'generic'

  return {
    mode,
    ...(mode === 'structured' && Object.keys(snapshotRoles).length ? { snapshotRoles } : {}),
    hasSharedTestCases,
    hasSamePromptSnapshots,
    hasCrossModelComparison,
  }
}

export const hasWorkspaceCompareSnapshot = (
  snapshots: Array<Pick<EvaluationSnapshot, 'promptRef'>> | null | undefined
): boolean => (snapshots || []).some((snapshot) => snapshot.promptRef.kind === 'workspace')

export const buildCompareEvaluationPayload = (params: {
  target: EvaluationTarget
  testCases: Array<CompareEvaluationTestCaseDraft | null | undefined>
  snapshots: Array<CompareEvaluationSnapshotDraft | null | undefined>
  snapshotRolesOverride?: CompareSnapshotRoleMap | null
}): CompareEvaluationPayload | null => {
  const workspacePrompt = params.target.workspacePrompt?.trim() || ''
  if (!workspacePrompt) {
    return null
  }

  const referencePrompt = params.target.referencePrompt?.trim() || ''
  const designContext = normalizeContentBlock(params.target.designContext)
  const target: EvaluationTarget = {
    workspacePrompt,
    referencePrompt: referencePrompt || undefined,
    designContext,
  }

  const testCases = params.testCases
    .map((testCase) => normalizeTestCase(testCase))
    .filter((testCase): testCase is EvaluationTestCase => !!testCase)

  if (!testCases.length) {
    return null
  }

  const validTestCaseIds = new Set(testCases.map((testCase) => testCase.id))
  const snapshots = params.snapshots
    .map((snapshot) => normalizeSnapshot(snapshot, validTestCaseIds))
    .filter((snapshot): snapshot is EvaluationSnapshot => !!snapshot)

  if (snapshots.length < 2) {
    return null
  }

  if (!hasWorkspaceCompareSnapshot(snapshots)) {
    return null
  }

  return {
    target,
    testCases,
    snapshots,
    compareHints: deriveCompareHints(snapshots, testCases, params.snapshotRolesOverride),
  }
}
