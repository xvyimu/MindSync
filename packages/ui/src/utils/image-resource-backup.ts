import type {
  FullImageData,
  IImageStorageService,
  ImageMetadata,
} from '@mindsync/core'

export type ImageResourceManifestEntryBase = {
  kind: 'image'
  id: string
  path: string
  mimeType?: string
  sizeBytes?: number
  createdAt?: number
  accessedAt?: number
  source?: ImageMetadata['source']
  metadata?: ImageMetadata['metadata']
  sha256?: string
}

export type ImageResourceRestoreReport<Problem> = {
  restored: number
  skipped: number
  missing: Problem[]
  corrupt: Problem[]
  errors: string[]
}

export type ImageResourceStorage = Pick<IImageStorageService, 'getImage' | 'saveImage'>

export const copyBytes = (bytes: Uint8Array): Uint8Array => {
  const out = new globalThis.Uint8Array(bytes.byteLength)
  out.set(bytes)
  return out
}

export const bytesToArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const view = copyBytes(bytes)
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
}

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return globalThis.btoa(binary)
}

export const base64ToBytes = (base64: string): Uint8Array => {
  const binary = globalThis.atob(base64)
  const bytes = new globalThis.Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export const sha256Hex = async (bytes: Uint8Array): Promise<string | undefined> => {
  if (!globalThis.crypto?.subtle) return undefined
  try {
    const digestBytes: Uint8Array<ArrayBuffer> = new Uint8Array(bytes.byteLength)
    digestBytes.set(bytes)
    const digest = await globalThis.crypto.subtle.digest('SHA-256', digestBytes)
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return undefined
  }
}

export const extensionFromMimeType = (mimeType: string): string => {
  const normalized = mimeType.toLowerCase().split(';')[0].trim()
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') return 'jpg'
  if (normalized === 'image/png') return 'png'
  if (normalized === 'image/webp') return 'webp'
  if (normalized === 'image/gif') return 'gif'
  if (normalized === 'image/svg+xml') return 'svg'
  return 'bin'
}

export const safeImageResourceFileName = (
  id: string,
  mimeType: string,
  contentHash?: string,
): string =>
  [
    encodeURIComponent(id),
    ...(contentHash ? [contentHash] : []),
    extensionFromMimeType(mimeType),
  ].join('.')

export const inferMimeTypeFromBytes = (bytes: Uint8Array): string | null => {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'image/gif'
  }

  return null
}

export const resolveResourceMimeType = (
  declaredMimeType: string | undefined,
  bytes: Uint8Array,
): string =>
  inferMimeTypeFromBytes(bytes) || declaredMimeType || 'application/octet-stream'

export const normalizeImageResourceMetadata = (
  entry: ImageResourceManifestEntryBase,
  sizeBytes: number,
  mimeType: string,
): ImageMetadata => ({
  id: entry.id,
  mimeType,
  sizeBytes,
  createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
  accessedAt: Date.now(),
  source: entry.source === 'generated' ? 'generated' : 'uploaded',
  ...(entry.metadata ? { metadata: entry.metadata } : {}),
})

export const validateImageResourceBytes = async (
  entry: ImageResourceManifestEntryBase,
  bytes: Uint8Array,
): Promise<'ok' | 'empty' | 'corrupt'> => {
  if (bytes.byteLength === 0) return 'empty'

  if (entry.sha256) {
    const actualHash = await sha256Hex(bytes)
    if (actualHash && actualHash !== entry.sha256) {
      return 'corrupt'
    }
  }

  if (
    !entry.sha256 &&
    typeof entry.sizeBytes === 'number' &&
    Number.isFinite(entry.sizeBytes) &&
    entry.sizeBytes > 0 &&
    Math.abs(entry.sizeBytes - bytes.byteLength) > 2
  ) {
    return 'corrupt'
  }

  return 'ok'
}

export const createFullImageDataFromResource = (
  entry: ImageResourceManifestEntryBase,
  bytes: Uint8Array,
): FullImageData => ({
  metadata: normalizeImageResourceMetadata(
    entry,
    bytes.byteLength,
    resolveResourceMimeType(entry.mimeType, bytes),
  ),
  data: bytesToBase64(bytes),
})

export const restoreImageResource = async (
  entry: ImageResourceManifestEntryBase,
  bytes: Uint8Array,
  storageService: ImageResourceStorage,
): Promise<'restored' | 'skipped'> => {
  const existing = await storageService.getImage(entry.id)
  if (existing?.data) {
    return 'skipped'
  }

  await storageService.saveImage(createFullImageDataFromResource(entry, bytes))
  return 'restored'
}

export const hasImageResourceRestoreProblems = <Problem>(
  report: ImageResourceRestoreReport<Problem>,
): boolean =>
  report.missing.length > 0 ||
  report.corrupt.length > 0 ||
  report.errors.length > 0

export const formatImageResourceRestoreProblemDetails = <Problem>(
  report: ImageResourceRestoreReport<Problem>,
): string =>
  [
    report.missing.length ? `missing=${report.missing.length}` : '',
    report.corrupt.length ? `corrupt=${report.corrupt.length}` : '',
    report.errors.length ? `errors=${report.errors.length}` : '',
  ].filter(Boolean).join(', ')

export const assertImageResourceRestoreReportSafe = <Problem>(
  report: ImageResourceRestoreReport<Problem>,
  label: string,
): void => {
  if (!hasImageResourceRestoreProblems(report)) {
    return
  }

  throw new Error(`${label} resource validation failed: ${formatImageResourceRestoreProblemDetails(report)}`)
}
