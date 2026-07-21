import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { StructuredCompareRole } from '@mindsync/core'
import type {
  PersistedCompareSnapshotRoles,
  PersistedCompareSnapshotRoleSignatures,
} from '../../types/evaluation'
import {
  analyzeStructuredComparePlan,
  buildCompareRoleCandidateSignature,
  buildCompareRoleCandidateWorkspacePromptSignature,
  inferCompareSnapshotRoles,
  parseCompareRolePersistedSignature,
  serializeCompareRolePersistedSignature,
  type CompareRoleCandidate,
} from './compareEvaluation'

export interface CompareRoleConfigEntry<Id extends string = string>
  extends CompareRoleCandidate<Id> {
  promptRefLabel: string
  inferredRole?: StructuredCompareRole
  manualRole?: StructuredCompareRole
  staleManualRole?: StructuredCompareRole
  workspaceChangedManualRole?: StructuredCompareRole
  effectiveRole?: StructuredCompareRole
  roleSource?: 'auto' | 'manual'
}

interface UseCompareRoleConfigOptions<Id extends string = string> {
  candidates: ComputedRef<CompareRoleCandidate<Id>[]>
  persistedRoles: Ref<PersistedCompareSnapshotRoles<Id>>
  persistedRoleSignatures: Ref<PersistedCompareSnapshotRoleSignatures<Id>>
  persistRoles: (
    roles: PersistedCompareSnapshotRoles<Id>,
    signatures: PersistedCompareSnapshotRoleSignatures<Id>
  ) => void | Promise<void>
}

const normalizeRolesForCandidates = <Id extends string>(
  roles: PersistedCompareSnapshotRoles<Id>,
  candidates: CompareRoleCandidate<Id>[],
): PersistedCompareSnapshotRoles<Id> => {
  const validIdSet = new Set(candidates.map((candidate) => candidate.id))

  return Object.fromEntries(
    Object.entries(roles)
      .filter(([snapshotId, role]) => validIdSet.has(snapshotId as Id) && !!role)
      .map(([snapshotId, role]) => [snapshotId as Id, role as StructuredCompareRole] as const),
  ) as PersistedCompareSnapshotRoles<Id>
}

const normalizeSignaturesForCandidates = <Id extends string>(
  signatures: PersistedCompareSnapshotRoleSignatures<Id>,
  candidates: CompareRoleCandidate<Id>[],
): PersistedCompareSnapshotRoleSignatures<Id> => {
  const validIdSet = new Set(candidates.map((candidate) => candidate.id))

  return Object.fromEntries(
    Object.entries(signatures)
      .filter(([snapshotId, signature]) =>
        validIdSet.has(snapshotId as Id) &&
        typeof signature === 'string' &&
        signature.trim().length > 0
      )
      .map(([snapshotId, signature]) => [snapshotId as Id, (signature as string).trim()] as const),
  ) as PersistedCompareSnapshotRoleSignatures<Id>
}

const formatPromptRefLabel = (candidate: CompareRoleCandidate): string => {
  const customLabel = candidate.promptRef.label?.trim()
  if (customLabel) return customLabel
  if (candidate.promptRef.kind === 'version' && typeof candidate.promptRef.version === 'number') {
    return `v${candidate.promptRef.version}`
  }
  return candidate.promptRef.kind
}

export function useCompareRoleConfig<Id extends string = string>(
  options: UseCompareRoleConfigOptions<Id>,
) {
  const showDialog = ref(false)
  const runCompareAfterConfirm = ref(false)

  const manualRoles = computed<PersistedCompareSnapshotRoles<Id>>(() =>
    normalizeRolesForCandidates(options.persistedRoles.value, options.candidates.value),
  )

  const currentRoleSignatures = computed<PersistedCompareSnapshotRoleSignatures<Id>>(() =>
    Object.fromEntries(
      options.candidates.value.map((candidate) => [
        candidate.id,
        buildCompareRoleCandidateSignature(candidate),
      ] as const)
    ) as PersistedCompareSnapshotRoleSignatures<Id>,
  )

  const persistedRoleSignatures = computed<PersistedCompareSnapshotRoleSignatures<Id>>(() =>
    normalizeSignaturesForCandidates(
      options.persistedRoleSignatures.value,
      options.candidates.value,
    ),
  )

  const persistedRoleSignaturePayloads = computed(() =>
    Object.fromEntries(
      Object.entries(persistedRoleSignatures.value)
        .map(([snapshotId, signature]) => [
          snapshotId as Id,
          parseCompareRolePersistedSignature(signature as string | undefined),
        ] as const)
        .filter(([, payload]) => !!payload)
    ) as Partial<
      Record<Id, NonNullable<ReturnType<typeof parseCompareRolePersistedSignature>>>
    >
  )

  const currentWorkspacePromptSignatures = computed<PersistedCompareSnapshotRoleSignatures<Id>>(
    () =>
      Object.fromEntries(
        options.candidates.value
          .map((candidate) => [
            candidate.id,
            buildCompareRoleCandidateWorkspacePromptSignature(candidate),
          ] as const)
          .filter(([, signature]) => !!signature)
      ) as PersistedCompareSnapshotRoleSignatures<Id>,
  )

  const validManualRoles = computed<PersistedCompareSnapshotRoles<Id>>(() =>
    Object.fromEntries(
      Object.entries(manualRoles.value).filter(([snapshotId, role]) => {
        if (!role) return false

        const currentSignature = currentRoleSignatures.value[snapshotId as Id]
        const persistedSignature = persistedRoleSignaturePayloads.value[snapshotId as Id]?.baseSignature
        return !!currentSignature && currentSignature === persistedSignature
      })
    ) as PersistedCompareSnapshotRoles<Id>
  )

  const staleManualRoles = computed<PersistedCompareSnapshotRoles<Id>>(() =>
    Object.fromEntries(
      Object.entries(manualRoles.value).filter(([snapshotId, role]) => {
        if (!role) return false
        return !validManualRoles.value[snapshotId as Id]
      })
    ) as PersistedCompareSnapshotRoles<Id>
  )

  const workspaceChangedManualRoles = computed<PersistedCompareSnapshotRoles<Id>>(() =>
    Object.fromEntries(
      Object.entries(validManualRoles.value).filter(([snapshotId, role]) => {
        if (!role) return false

        const candidate = options.candidates.value.find((entry) => entry.id === snapshotId as Id)
        if (!candidate || candidate.promptRef.kind !== 'workspace') {
          return false
        }

        const persistedWorkspaceSignature =
          persistedRoleSignaturePayloads.value[snapshotId as Id]?.workspacePromptSignature || ''
        if (!persistedWorkspaceSignature) {
          return false
        }

        const currentWorkspaceSignature = currentWorkspacePromptSignatures.value[snapshotId as Id]
        return !!currentWorkspaceSignature && currentWorkspaceSignature !== persistedWorkspaceSignature
      })
    ) as PersistedCompareSnapshotRoles<Id>
  )

  const inferredRoles = computed<PersistedCompareSnapshotRoles<Id>>(() =>
    inferCompareSnapshotRoles(
      options.candidates.value,
      validManualRoles.value,
    ) as PersistedCompareSnapshotRoles<Id>,
  )

  const effectiveRoles = computed<PersistedCompareSnapshotRoles<Id>>(() => {
    return inferredRoles.value
  })

  const effectivePlanAnalysis = computed(() =>
    analyzeStructuredComparePlan(
      effectiveRoles.value as Record<string, StructuredCompareRole>,
    )
  )

  const workspaceCandidateCount = computed(
    () => options.candidates.value.filter((candidate) => candidate.promptRef.kind === 'workspace').length,
  )

  const requiresExplicitTargetSelection = computed(() => {
    if (workspaceCandidateCount.value <= 1) {
      return false
    }

    return !Object.values(effectiveRoles.value).includes('target')
  })

  const requiresManualRoleReview = computed(
    () => Object.keys(workspaceChangedManualRoles.value).length > 0,
  )

  const entries = computed<CompareRoleConfigEntry<Id>[]>(() =>
    options.candidates.value.map((candidate) => {
      const validatedManualRole = validManualRoles.value[candidate.id]
      const inferredRole = inferredRoles.value[candidate.id]

      return {
        ...candidate,
        promptRefLabel: formatPromptRefLabel(candidate),
        manualRole: validatedManualRole || undefined,
        staleManualRole: staleManualRoles.value[candidate.id] || undefined,
        workspaceChangedManualRole: workspaceChangedManualRoles.value[candidate.id] || undefined,
        inferredRole,
        effectiveRole: inferredRole,
        roleSource: validatedManualRole ? 'manual' : inferredRole ? 'auto' : undefined,
      }
    }),
  )

  const manualRolesActive = computed(() => Object.keys(validManualRoles.value).length > 0)
  const structuredRolesReady = computed(() => effectivePlanAnalysis.value.mode === 'structured')

  const openDialog = (opts?: { runCompareAfterConfirm?: boolean }) => {
    runCompareAfterConfirm.value = !!opts?.runCompareAfterConfirm
    showDialog.value = true
  }

  const closeDialog = () => {
    showDialog.value = false
    runCompareAfterConfirm.value = false
  }

  const saveRoles = async (roles: PersistedCompareSnapshotRoles<Id>) => {
    const normalizedRoles = normalizeRolesForCandidates(roles, options.candidates.value)
    const signatures = Object.fromEntries(
      Object.keys(normalizedRoles)
        .map((snapshotId) => {
          const baseSignature = currentRoleSignatures.value[snapshotId as Id]
          if (!baseSignature) {
            return null
          }

          return [
            snapshotId as Id,
            serializeCompareRolePersistedSignature({
              baseSignature,
              workspacePromptSignature:
                currentWorkspacePromptSignatures.value[snapshotId as Id] || undefined,
            }),
          ] as const
        })
        .filter((entry): entry is readonly [Id, string] => !!entry)
    ) as PersistedCompareSnapshotRoleSignatures<Id>
    await options.persistRoles(normalizedRoles, signatures)
  }

  const consumePendingCompareAfterConfirm = (): boolean => {
    if (!runCompareAfterConfirm.value) {
      return false
    }

    runCompareAfterConfirm.value = false
    return true
  }

  return {
    showDialog,
    entries,
    inferredRoles,
    manualRoles,
    validManualRoles,
    staleManualRoles,
    effectiveRoles,
    effectivePlanAnalysis,
    manualRolesActive,
    structuredRolesReady,
    requiresExplicitTargetSelection,
    requiresManualRoleReview,
    workspaceChangedManualRoles,
    openDialog,
    closeDialog,
    saveRoles,
    consumePendingCompareAfterConfirm,
  }
}
