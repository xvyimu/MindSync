import type { ImageInputRef } from '@mindsync/core'

import { hashString, hashVariables } from './prompt-variables'

type VariantFingerprintParams = {
  selection: string | number
  resolvedVersion: number
  modelKey: string
  prompt: string
  variables: Record<string, string>
  inputImages: ImageInputRef[]
}

const getSingleImageSignature = (image: ImageInputRef, index: number): string => {
  const b64 = (image.b64 || '').trim()
  const mimeType = image.mimeType || 'image/png'

  if (!b64) {
    return `${index}:empty:${mimeType}`
  }

  const head = b64.slice(0, 96)
  const tail = b64.slice(-96)
  const sig = hashString(`${head}:${tail}`)
  return `${index}:b64:${b64.length}:${sig}:${mimeType}`
}

export const getMultiImageSignature = (inputImages: ImageInputRef[]): string => {
  if (!Array.isArray(inputImages) || inputImages.length === 0) {
    return 'noimg'
  }

  return inputImages
    .map((image, index) => getSingleImageSignature(image, index))
    .join('|')
}

export const buildMultiImageVariantFingerprint = ({
  selection,
  resolvedVersion,
  modelKey,
  prompt,
  variables,
  inputImages,
}: VariantFingerprintParams): string => {
  const promptHash = hashString((prompt || '').trim())
  const varsHash = hashVariables(variables || {})
  const imageSignature = getMultiImageSignature(inputImages || [])

  return `${String(selection)}:${resolvedVersion}:${modelKey}:${promptHash}:${varsHash}:${imageSignature}`
}
