import type {
  FavoritePrompt,
  PromptAsset,
  PromptContent,
  PromptContentVersion,
} from '@mindsync/core'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isPromptContent = (value: unknown): value is PromptContent => {
  if (!isPlainObject(value)) return false
  if (value.kind === 'text') return typeof value.text === 'string'
  if (value.kind === 'image-prompt') return typeof value.text === 'string'
  if (value.kind === 'messages') return Array.isArray(value.messages)
  return false
}

const isPromptContentVersion = (value: unknown): value is PromptContentVersion => {
  if (!isPlainObject(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.version === 'number' &&
    Number.isFinite(value.version) &&
    isPromptContent(value.content) &&
    typeof value.createdAt === 'number'
  )
}

export const getEmbeddedFavoritePromptAsset = (
  favorite: FavoritePrompt | null | undefined,
): PromptAsset | null => {
  const metadata = isPlainObject(favorite?.metadata) ? favorite.metadata : null
  const asset = metadata && isPlainObject(metadata.promptAsset) ? metadata.promptAsset : null
  if (!asset) return null

  if (
    typeof asset.currentVersionId !== 'string' ||
    !Array.isArray(asset.versions) ||
    asset.versions.length === 0
  ) {
    return null
  }

  const versions = asset.versions.filter(isPromptContentVersion)
  if (versions.length === 0) return null

  return {
    ...(asset as unknown as PromptAsset),
    currentVersionId: asset.currentVersionId,
    versions,
  }
}

export const promptContentToEditableText = (content: PromptContent): string => {
  if (content.kind === 'text' || content.kind === 'image-prompt') {
    return content.text
  }

  return content.messages
    .map((message) => {
      const role = typeof message.role === 'string' ? message.role : 'message'
      const text = typeof message.content === 'string' ? message.content : ''
      return text.trim() ? `[${role}]\n${text}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
}

export const promptContentVersionPreview = (
  version: PromptContentVersion,
  maxLength = 120,
): string => {
  const text = promptContentToEditableText(version.content).replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

export const sortPromptAssetVersionsForDisplay = (
  versions: PromptContentVersion[],
): PromptContentVersion[] =>
  [...versions].sort((left, right) => {
    if (right.version !== left.version) return right.version - left.version
    return right.createdAt - left.createdAt
  })
