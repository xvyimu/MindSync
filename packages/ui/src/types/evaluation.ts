import type { EvaluationResponse, EvaluationType, StructuredCompareRole } from '@mindsync/core'

/**
 * Persisted evaluation results for a single workspace/submode.
 *
 * Note:
 * - We persist only stable data (results) for restart restore.
 * - We do NOT persist transient UI state (panel open, streaming, isEvaluating).
 */
export interface PersistedEvaluationResults {
  result: Record<string, EvaluationResponse | null>
  compare: EvaluationResponse | null
  'prompt-only': EvaluationResponse | null
  'prompt-iterate': EvaluationResponse | null
}

export type PersistedCompareSnapshotRoles<Id extends string = string> =
  Partial<Record<Id, StructuredCompareRole>>

export type PersistedCompareSnapshotRoleSignatures<Id extends string = string> =
  Partial<Record<Id, string>>

export const createDefaultEvaluationResults = (): PersistedEvaluationResults => ({
  result: {},
  compare: null,
  'prompt-only': null,
  'prompt-iterate': null,
})

export const createDefaultCompareSnapshotRoles = <Id extends string = string>():
PersistedCompareSnapshotRoles<Id> => ({})

export const createDefaultCompareSnapshotRoleSignatures = <Id extends string = string>():
PersistedCompareSnapshotRoleSignatures<Id> => ({})

export const sanitizeCompareSnapshotRoles = <Id extends string>(
  value: unknown,
  validIds: readonly Id[],
): PersistedCompareSnapshotRoles<Id> => {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const validIdSet = new Set(validIds)
  const normalizedEntries = Object.entries(value as Record<string, unknown>)
    .filter(([snapshotId, role]) =>
      validIdSet.has(snapshotId as Id) &&
      (
        role === 'target' ||
        role === 'baseline' ||
        role === 'reference' ||
        role === 'referenceBaseline' ||
        role === 'replica' ||
        role === 'auxiliary'
      )
    )
    .map(([snapshotId, role]) => [snapshotId as Id, role as StructuredCompareRole] as const)

  return Object.fromEntries(normalizedEntries) as PersistedCompareSnapshotRoles<Id>
}

export const sanitizeCompareSnapshotRoleSignatures = <Id extends string>(
  value: unknown,
  validIds: readonly Id[],
): PersistedCompareSnapshotRoleSignatures<Id> => {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const validIdSet = new Set(validIds)
  const normalizedEntries = Object.entries(value as Record<string, unknown>)
    .filter(([snapshotId, signature]) =>
      validIdSet.has(snapshotId as Id) &&
      typeof signature === 'string' &&
      signature.trim().length > 0
    )
    .map(([snapshotId, signature]) => [snapshotId as Id, (signature as string).trim()] as const)

  return Object.fromEntries(normalizedEntries) as PersistedCompareSnapshotRoleSignatures<Id>
}

export const EVALUATION_TYPES: EvaluationType[] = [
  'result',
  'compare',
  'prompt-only',
  'prompt-iterate',
]
