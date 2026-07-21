import { ref } from 'vue'
import type { PromptAssetBinding, PromptSessionOrigin } from '@mindsync/core'

export type SessionAssetBindingState = {
  assetBinding?: PromptAssetBinding
  origin?: PromptSessionOrigin
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const cloneMetadata = (value: unknown): Record<string, unknown> | undefined =>
  isPlainObject(value) ? { ...value } : undefined

export const cloneAssetBinding = (
  binding: PromptAssetBinding | undefined,
): PromptAssetBinding | undefined => {
  if (!binding?.assetId?.trim()) return undefined
  return {
    assetId: binding.assetId.trim(),
    ...(binding.versionId?.trim() ? { versionId: binding.versionId.trim() } : {}),
    ...(binding.status ? { status: binding.status } : {}),
  }
}

export const cloneSessionOrigin = (
  origin: PromptSessionOrigin | undefined,
): PromptSessionOrigin | undefined => {
  if (!origin) return undefined
  return {
    kind: origin.kind,
    ...(origin.id?.trim() ? { id: origin.id.trim() } : {}),
    ...(origin.metadata ? { metadata: { ...origin.metadata } } : {}),
  }
}

export const sanitizeAssetBinding = (value: unknown): PromptAssetBinding | undefined => {
  if (!isPlainObject(value)) return undefined
  const assetId = asTrimmedString(value.assetId)
  if (!assetId) return undefined

  const status =
    value.status === 'linked' || value.status === 'forked' || value.status === 'detached'
      ? value.status
      : undefined

  return {
    assetId,
    ...(asTrimmedString(value.versionId) ? { versionId: asTrimmedString(value.versionId) } : {}),
    ...(status ? { status } : {}),
  }
}

export const sanitizeSessionOrigin = (value: unknown): PromptSessionOrigin | undefined => {
  if (!isPlainObject(value)) return undefined
  const kind = value.kind
  if (
    kind !== 'blank' &&
    kind !== 'workspace' &&
    kind !== 'asset' &&
    kind !== 'favorite' &&
    kind !== 'history' &&
    kind !== 'garden' &&
    kind !== 'import' &&
    kind !== 'external'
  ) {
    return undefined
  }

  return {
    kind,
    ...(asTrimmedString(value.id) ? { id: asTrimmedString(value.id) } : {}),
    ...(cloneMetadata(value.metadata) ? { metadata: cloneMetadata(value.metadata) } : {}),
  }
}

export const createSessionAssetBindingState = (
  touch: () => void,
  persist: () => void,
) => {
  const assetBinding = ref<PromptAssetBinding | undefined>(undefined)
  const origin = ref<PromptSessionOrigin | undefined>(undefined)

  const updateAssetBinding = (
    binding: PromptAssetBinding | undefined,
    nextOrigin?: PromptSessionOrigin,
  ) => {
    assetBinding.value = cloneAssetBinding(binding)
    if (nextOrigin) {
      origin.value = cloneSessionOrigin(nextOrigin)
    }
    touch()
    persist()
  }

  const clearAssetBinding = () => {
    if (!assetBinding.value && !origin.value) return
    assetBinding.value = undefined
    origin.value = undefined
    touch()
    persist()
  }

  const restoreAssetBinding = (state: SessionAssetBindingState | undefined) => {
    assetBinding.value = sanitizeAssetBinding(state?.assetBinding)
    origin.value = sanitizeSessionOrigin(state?.origin)
  }

  const resetAssetBinding = () => {
    assetBinding.value = undefined
    origin.value = undefined
  }

  const persistedAssetBinding = (): SessionAssetBindingState => ({
    ...(assetBinding.value ? { assetBinding: cloneAssetBinding(assetBinding.value) } : {}),
    ...(origin.value ? { origin: cloneSessionOrigin(origin.value) } : {}),
  })

  const clearAssetBindingWithoutPersist = () => {
    assetBinding.value = undefined
    origin.value = undefined
  }

  return {
    assetBinding,
    origin,
    updateAssetBinding,
    clearAssetBinding,
    restoreAssetBinding,
    resetAssetBinding,
    persistedAssetBinding,
    clearAssetBindingWithoutPersist,
  }
}
