import type {
  PromptAssetBinding,
  PromptRecord,
  PromptRecordChain,
  PromptSessionOrigin,
} from '@mindsync/core'

type SourceBindingState = {
  assetBinding?: PromptAssetBinding
  origin?: PromptSessionOrigin
}

type SourceBindingSessionLike = {
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

export const cloneHistoryAssetBinding = (
  binding: PromptAssetBinding | undefined,
): PromptAssetBinding | undefined => {
  const assetId = asTrimmedString(binding?.assetId)
  if (!assetId) return undefined

  const versionId = asTrimmedString(binding?.versionId)
  const status = binding?.status === 'forked' || binding?.status === 'detached'
    ? binding.status
    : 'linked'
  return {
    assetId,
    ...(versionId ? { versionId } : {}),
    status,
  }
}

export const cloneHistoryOrigin = (
  origin: PromptSessionOrigin | undefined,
): PromptSessionOrigin | undefined => {
  if (!origin) return undefined
  return {
    kind: origin.kind,
    ...(asTrimmedString(origin.id) ? { id: asTrimmedString(origin.id) } : {}),
    ...(cloneMetadata(origin.metadata) ? { metadata: cloneMetadata(origin.metadata) } : {}),
  }
}

export const buildHistorySourceBindingMetadata = (
  session: SourceBindingSessionLike | null | undefined,
): SourceBindingState => {
  const assetBinding = cloneHistoryAssetBinding(session?.assetBinding)
  const origin = cloneHistoryOrigin(session?.origin)
  return {
    ...(assetBinding ? { assetBinding } : {}),
    ...(origin ? { origin } : {}),
  }
}

export const withHistorySourceBindingMetadata = <T extends Record<string, unknown> | undefined>(
  metadata: T,
  session: SourceBindingSessionLike | null | undefined,
): Record<string, unknown> | undefined => {
  const source = buildHistorySourceBindingMetadata(session)
  const merged = {
    ...(metadata ?? {}),
    ...source,
  }
  return Object.keys(merged).length > 0 ? merged : undefined
}

const readSourceBindingFromMetadata = (metadata: unknown): SourceBindingState => {
  if (!isPlainObject(metadata)) return {}
  return {
    assetBinding: cloneHistoryAssetBinding(metadata.assetBinding as PromptAssetBinding | undefined),
    origin: cloneHistoryOrigin(metadata.origin as PromptSessionOrigin | undefined),
  }
}

export const extractHistorySourceBinding = (
  record: PromptRecord | undefined,
  chain?: PromptRecordChain | undefined,
): SourceBindingState => {
  const fromRecord = readSourceBindingFromMetadata(record?.metadata)
  if (fromRecord.assetBinding || fromRecord.origin) return fromRecord

  const fromRoot = readSourceBindingFromMetadata(chain?.rootRecord?.metadata)
  if (fromRoot.assetBinding || fromRoot.origin) return fromRoot

  return {}
}
