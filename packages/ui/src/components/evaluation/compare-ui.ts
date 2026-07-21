import type {
  EvaluationPromptRef,
  StructuredCompareRole,
} from '@mindsync/core'

export type CompareUiTranslator = (
  key: string,
  params?: Record<string, unknown>
) => string

export type CompareRoleUiEntry = {
  effectiveRole?: StructuredCompareRole
  roleSource?: 'auto' | 'manual'
  staleManualRole?: StructuredCompareRole
  workspaceChangedManualRole?: StructuredCompareRole
}

export type CompareRoleReasonCandidate<Id extends string = string> = {
  id: Id
  promptRef: EvaluationPromptRef
  promptText?: string
  modelKey?: string
}

export const PRIMARY_COMPARE_ROLES: StructuredCompareRole[] = [
  'target',
  'baseline',
  'reference',
  'replica',
]

export const SECONDARY_COMPARE_ROLES: StructuredCompareRole[] = [
  'referenceBaseline',
  'auxiliary',
]

const UNIQUE_COMPARE_ROLE_SET = new Set<StructuredCompareRole>([
  'target',
  'baseline',
  'reference',
  'referenceBaseline',
  'replica',
])

export const COMPARE_PAIR_PREVIEW_ORDER = [
  'targetBaseline',
  'targetReference',
  'referenceBaseline',
  'targetReplica',
] as const

type ComparePairPreviewKey = typeof COMPARE_PAIR_PREVIEW_ORDER[number]

const normalizeInlineText = (value: string | undefined): string =>
  (value || '').replace(/\s+/gu, ' ').trim()

const tOr = (
  t: CompareUiTranslator,
  key: string,
  fallback: string,
  params?: Record<string, unknown>
): string => {
  const translated = t(key, params)
  return translated === key ? fallback : translated
}

export const getCompareRoleLabel = (
  t: CompareUiTranslator,
  role: StructuredCompareRole
): string =>
  tOr(
    t,
    `evaluation.compareShared.roleValues.${role}`,
    {
      target: 'Optimization Target',
      baseline: 'Previous Version',
      reference: 'Teacher',
      referenceBaseline: 'Teacher Previous Version',
      replica: 'Retest',
      auxiliary: 'Other Test',
    }[role] || role
  )

export const getCompareRoleDescription = (
  t: CompareUiTranslator,
  role: StructuredCompareRole
): string =>
  tOr(
    t,
    `evaluation.compareShared.roleDescriptions.${role}`,
    {
      target:
        'This is the prompt you are actively optimizing and trying to improve.',
      baseline:
        'This is the previous version of the optimization target, used to judge whether the latest rewrite is a real improvement.',
      reference:
        'This is the teacher output worth learning from, usually from a stronger or more stable model.',
      referenceBaseline:
        'This is the previous version on the teacher side, used to verify whether the same prompt change also helps the teacher side.',
      replica:
        'This is a retest used to check whether the observed gain is stable instead of a one-off win on the current sample.',
      auxiliary:
        'This test can still appear in standard comparison, but it will not become a core smart-compare pair.',
    }[role]
  )

export const getCompareModeLabel = (
  t: CompareUiTranslator,
  mode: 'structured' | 'generic'
): string =>
  tOr(
    t,
    `evaluation.compareShared.modeValues.${mode}`,
    mode === 'structured' ? 'Smart Compare' : 'Standard Compare'
  )

export const getCompareRecommendationLabel = (
  t: CompareUiTranslator,
  recommendation: 'continue' | 'stop' | 'review'
): string =>
  tOr(
    t,
    `evaluation.compareShared.recommendationValues.${recommendation}`,
    {
      continue: 'Keep Iterating',
      stop: 'Stop for Now',
      review: 'Needs Review',
    }[recommendation]
  )

export const getCompareRoleTagType = (
  role?: StructuredCompareRole
): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  switch (role) {
    case 'target':
      return 'success'
    case 'reference':
      return 'info'
    case 'referenceBaseline':
      return 'warning'
    case 'replica':
      return 'info'
    default:
      return 'default'
  }
}

export const buildCompareToolbarStatus = (
  t: CompareUiTranslator,
  needsTargetSelection: boolean,
  needsManualReview: boolean
): { label: string; type: 'warning' | 'info' } | null => {
  if (needsTargetSelection) {
    return {
      label: tOr(
        t,
        'evaluation.compareShared.status.needTarget',
        'Please choose the optimization target first.'
      ),
      type: 'warning',
    }
  }

  if (needsManualReview) {
    return {
      label: tOr(
        t,
        'evaluation.compareShared.status.needReview',
        'Settings changed. Please confirm again.'
      ),
      type: 'warning',
    }
  }

  return null
}

export const buildCompareRoleAssignmentSummary = (
  t: CompareUiTranslator,
  role: StructuredCompareRole | undefined,
  source: 'auto' | 'manual' | undefined
): string => {
  if (!role) {
    return tOr(
      t,
      'evaluation.compareShared.assignment.unassigned',
      'No role has been assigned yet.'
    )
  }

  const roleLabel = getCompareRoleLabel(t, role)
  if (source === 'manual') {
    return tOr(
      t,
      'evaluation.compareShared.assignment.manual',
      'You selected: {role}',
      { role: roleLabel }
    )
  }

  return tOr(
    t,
    'evaluation.compareShared.assignment.auto',
    'System suggestion: {role}',
    { role: roleLabel }
  )
}

export const buildCompareRoleTooltipCopy = (
  t: CompareUiTranslator,
  entry: CompareRoleUiEntry
): {
  label: string
  description: string
  source: string
  warning: string | null
  action: string
} | null => {
  const effectiveRole =
    entry.effectiveRole && entry.effectiveRole !== 'auxiliary'
      ? entry.effectiveRole
      : null
  const unresolved = !effectiveRole

  const label = unresolved
    ? tOr(
        t,
        'evaluation.compareShared.unresolved.label',
        'Not Clear Yet'
      )
    : getCompareRoleLabel(t, effectiveRole)

  const description = unresolved
    ? tOr(
        t,
        'evaluation.compareShared.unresolved.description',
        'This column is not clearly assigned to a core compare role yet.'
      )
    : getCompareRoleDescription(t, effectiveRole)

  const source = unresolved
    ? tOr(
        t,
        'evaluation.compareShared.unresolved.source',
        'The system could not map this column to optimization target, previous version, teacher, or retest.'
      )
    : entry.roleSource === 'manual'
      ? tOr(
          t,
          'evaluation.compareShared.roleSource.manual',
          'You manually confirmed this role.'
        )
      : tOr(
          t,
          'evaluation.compareShared.roleSource.auto',
          'This role is suggested automatically by the system.'
        )

  const warning = entry.workspaceChangedManualRole
    ? tOr(
        t,
        'evaluation.compareShared.review.workspaceChanged',
        'The workspace content changed after this role was confirmed. Please review it again.'
      )
    : null

  const action = tOr(
    t,
    'evaluation.compareShared.roleAction',
    'Click this tag to update the comparison role.'
  )

  return {
    label,
    description,
    source,
    warning,
    action,
  }
}

export const isUniqueCompareRole = (
  role: StructuredCompareRole | undefined,
): boolean => !!role && UNIQUE_COMPARE_ROLE_SET.has(role)

export const applyCompareManualRoleSelection = <Id extends string = string>(
  selectedRoles: Partial<Record<Id, StructuredCompareRole>>,
  params: {
    entryId: Id
    nextRole?: StructuredCompareRole
    suggestedRole?: StructuredCompareRole
  }
): Partial<Record<Id, StructuredCompareRole>> => {
  const nextSelectedRoles = { ...selectedRoles }

  if (isUniqueCompareRole(params.nextRole)) {
    Object.entries(nextSelectedRoles).forEach(([snapshotId, role]) => {
      if (
        snapshotId !== params.entryId &&
        role === params.nextRole
      ) {
        delete nextSelectedRoles[snapshotId as Id]
      }
    })
  }

  if (!params.nextRole || params.nextRole === params.suggestedRole) {
    delete nextSelectedRoles[params.entryId]
    return nextSelectedRoles
  }

  nextSelectedRoles[params.entryId] = params.nextRole
  return nextSelectedRoles
}

export const buildComparePairPreviewEntries = (
  t: CompareUiTranslator,
  enabledPairs: Iterable<ComparePairPreviewKey>,
): Array<{
  key: ComparePairPreviewKey
  enabled: boolean
  label: string
}> => {
  const enabledPairSet = new Set(enabledPairs)

  return COMPARE_PAIR_PREVIEW_ORDER.map((pairKey) => ({
    key: pairKey,
    enabled: enabledPairSet.has(pairKey),
    label: tOr(
      t,
      `evaluation.compareConfig.pairValues.${pairKey}`,
      pairKey,
    ),
  }))
}

export const buildCompareRoleSuggestionReason = (
  t: CompareUiTranslator,
  params: {
    candidate: CompareRoleReasonCandidate
    suggestedRole?: StructuredCompareRole
    candidates: CompareRoleReasonCandidate[]
    snapshotRoles: Record<string, StructuredCompareRole | undefined>
  }
): string => {
  const { candidate, suggestedRole, candidates, snapshotRoles } = params
  const workspaceCandidates = candidates.filter(
    (entry) => entry.promptRef.kind === 'workspace',
  )

  const findCandidateByRole = (
    role: StructuredCompareRole,
  ): CompareRoleReasonCandidate | undefined =>
    candidates.find((entry) => snapshotRoles[entry.id] === role)

  const targetCandidate = findCandidateByRole('target')
  const referenceCandidate = findCandidateByRole('reference')
  const normalizedCandidatePrompt = normalizeInlineText(candidate.promptText)
  const normalizedTargetPrompt = normalizeInlineText(targetCandidate?.promptText)
  const normalizedReferencePrompt = normalizeInlineText(referenceCandidate?.promptText)
  const normalizedCandidateModel = (candidate.modelKey || '').trim()
  const normalizedTargetModel = (targetCandidate?.modelKey || '').trim()
  const normalizedReferenceModel = (referenceCandidate?.modelKey || '').trim()

  switch (suggestedRole) {
    case 'target':
      if (candidate.promptRef.kind === 'workspace' && workspaceCandidates.length === 1) {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.target.uniqueWorkspace',
          'This is the only workspace column, so it is suggested as the optimization target.'
        )
      }

      return tOr(
        t,
        'evaluation.compareConfig.suggestionReasons.target.workspace',
        'This is the current workspace column, so it is suggested as the optimization target.'
      )
    case 'baseline':
      if (candidate.promptRef.dynamicAlias === 'previous') {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.baseline.dynamicPrevious',
          'This is the previous version of the current workspace, so it is suggested as the baseline.'
        )
      }

      if (
        normalizedCandidateModel &&
        normalizedCandidateModel === normalizedTargetModel &&
        normalizedCandidatePrompt !== normalizedTargetPrompt
      ) {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.baseline.sameModelDifferentPrompt',
          'It uses the same model as the optimization target but a different prompt, so it is suggested as the previous version.'
        )
      }

      break
    case 'reference':
      if (
        normalizedCandidateModel &&
        normalizedCandidateModel !== normalizedTargetModel &&
        normalizedCandidatePrompt === normalizedTargetPrompt
      ) {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.reference.samePromptDifferentModel',
          'This is a workspace result from a different model, so it is suggested as the teacher.'
        )
      }

      if (normalizedCandidateModel && normalizedCandidateModel !== normalizedTargetModel) {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.reference.differentModel',
          'It uses a different model from the optimization target, so it is suggested as the teacher.'
        )
      }

      break
    case 'referenceBaseline':
      if (
        normalizedCandidateModel &&
        normalizedCandidateModel === normalizedReferenceModel &&
        normalizedCandidatePrompt !== normalizedReferencePrompt
      ) {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.referenceBaseline.sameModelDifferentPrompt',
          "It uses the same model as the teacher but a different prompt, so it is suggested as the teacher's previous version."
        )
      }

      break
    case 'replica':
      if (
        candidate.promptRef.dynamicAlias === 'previous' &&
        normalizedCandidatePrompt === normalizedTargetPrompt
      ) {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.replica.previousMatchesWorkspace',
          'It matches the current workspace content, so it is suggested as a retest.'
        )
      }

      if (
        normalizedCandidateModel &&
        normalizedCandidateModel === normalizedTargetModel &&
        normalizedCandidatePrompt === normalizedTargetPrompt
      ) {
        return tOr(
          t,
          'evaluation.compareConfig.suggestionReasons.replica.samePromptAsTarget',
          'It uses the same prompt as the optimization target, so it is suggested as a retest.'
        )
      }

      break
    case 'auxiliary':
      return tOr(
        t,
        'evaluation.compareConfig.suggestionReasons.auxiliary.default',
        'This column will not enter the core pairwise smart compare, so it stays as another test.'
      )
  }

  return tOr(
    t,
    'evaluation.compareConfig.suggestionReasons.default',
    'The system inferred this suggestion from the current versions, models, and prompt relationships.'
  )
}
