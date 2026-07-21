// S3/WebDAV live in packages/desktop/remote-storage.js (Desktop IPC).
// UI only keeps Google Drive (web) + DesktopIpcRemoteObjectStore.
import { getEnvVar } from '@mindsync/core'

export type RemoteBackupProviderKind =
  | 'google-drive'
  | 'cloudflare-r2'
  | 's3-compatible'
  | 'webdav'

export type RemoteBackupRuntime = 'web' | 'desktop' | 'server'

export type RemoteBackupProviderConfig =
  | {
      kind: 'google-drive'
    }
  | {
      kind: 'cloudflare-r2'
      accountId: string
      bucket: string
      accessKeyId: string
      secretAccessKey: string
    }
  | {
      kind: 's3-compatible'
      endpoint: string
      region: string
      bucket: string
      accessKeyId: string
      secretAccessKey: string
      prefix: string
      forcePathStyle: boolean
    }
  | {
      kind: 'webdav'
      endpoint: string
      username: string
      password: string
      directory: string
    }

export type RemoteBackupProviderMap = Partial<{
  [K in RemoteBackupProviderKind]: Extract<RemoteBackupProviderConfig, { kind: K }>
}>

export type RemoteBackupSettings = {
  provider: RemoteBackupProviderConfig
  providers?: RemoteBackupProviderMap
}

const cloneRemoteBackupProviderConfig = (
  provider: RemoteBackupProviderConfig,
): RemoteBackupProviderConfig => {
  if (provider.kind === 'google-drive') {
    return { kind: 'google-drive' }
  }
  if (provider.kind === 'cloudflare-r2') {
    return {
      kind: 'cloudflare-r2',
      accountId: provider.accountId,
      bucket: provider.bucket,
      accessKeyId: provider.accessKeyId,
      secretAccessKey: provider.secretAccessKey,
    }
  }
  if (provider.kind === 's3-compatible') {
    return {
      kind: 's3-compatible',
      endpoint: provider.endpoint,
      region: provider.region,
      bucket: provider.bucket,
      accessKeyId: provider.accessKeyId,
      secretAccessKey: provider.secretAccessKey,
      prefix: provider.prefix,
      forcePathStyle: provider.forcePathStyle,
    }
  }
  return {
    kind: 'webdav',
    endpoint: provider.endpoint,
    username: provider.username,
    password: provider.password,
    directory: provider.directory,
  }
}

export type RemoteBackupEntry = {
  id: string
  name: string
  sizeBytes?: number
  updatedAt?: string
}

export type RemoteObjectEntry = {
  path: string
  sizeBytes?: number
  updatedAt?: string
  contentType?: string
}

export type RemoteObjectStore = {
  provider: RemoteBackupProviderKind
  authorize?(): Promise<void>
  detect(): Promise<RemoteBackupDetectionResult>
  head?(path: string): Promise<RemoteObjectEntry | null>
  exists(path: string): Promise<boolean>
  put(path: string, body: Blob | ArrayBuffer | Uint8Array | string, options?: { contentType?: string }): Promise<RemoteObjectEntry>
  get(path: string): Promise<ArrayBuffer>
  getText(path: string): Promise<string>
  list(prefix: string): Promise<RemoteObjectEntry[]>
  delete?(path: string): Promise<void>
}

export type RemoteStorageIpcOperation =
  | 'authorize'
  | 'head'
  | 'exists'
  | 'put'
  | 'get'
  | 'getText'
  | 'list'
  | 'delete'

export type RemoteStorageIpcRequest = {
  provider: RemoteBackupProviderConfig
  operation: RemoteStorageIpcOperation
  path?: string
  body?: ArrayBuffer | Uint8Array | string
  contentType?: string
}

export type RemoteStorageIpcApi = {
  invoke<T = unknown>(request: RemoteStorageIpcRequest): Promise<T>
}

export type RemoteBackupDetectionStep = {
  key: 'auth' | 'cors' | 'read' | 'write' | 'list' | 'delete'
  ok: boolean
  message?: string
}

export type RemoteBackupDetectionResult = {
  ok: boolean
  provider: RemoteBackupProviderKind
  steps: RemoteBackupDetectionStep[]
}

export type RemoteBackupAdapter = RemoteObjectStore & {
  detect(): Promise<RemoteBackupDetectionResult>
  listBackups(): Promise<RemoteBackupEntry[]>
  uploadBackup(name: string, blob: Blob): Promise<RemoteBackupEntry>
  downloadBackup(entry: RemoteBackupEntry): Promise<ArrayBuffer>
  deleteBackup?(entry: RemoteBackupEntry): Promise<void>
}

type GoogleIdentityGlobal = typeof globalThis & {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string
          scope: string
          callback: (response: { access_token?: string; expires_in?: number; error?: string }) => void
          error_callback?: (error: unknown) => void
        }) => {
          requestAccessToken: (options?: { prompt?: string }) => void
        }
      }
    }
  }
}

export const REMOTE_BACKUP_SETTINGS_KEY = 'prompt-optimizer:remote-backup-settings'

const BACKUP_MIME_TYPE = 'application/zip'
const JSON_MIME_TYPE = 'application/json'
export const GOOGLE_DRIVE_DEFAULT_BACKUP_FOLDER_NAME = 'prompt-optimizer-backups'
export const CLOUDFLARE_R2_DEFAULT_BACKUP_PREFIX = 'prompt-optimizer-backups/'
const CLOUDFLARE_DASHBOARD_URL = 'https://dash.cloudflare.com/'
const CLOUDFLARE_R2_DOCS_URL = 'https://developers.cloudflare.com/r2/'
// 不再内置上游 Client ID：fork/自建必须配置 VITE_GOOGLE_DRIVE_CLIENT_ID
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const GOOGLE_DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'
const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const GOOGLE_DRIVE_MULTIPART_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024
const GOOGLE_DRIVE_DOWNLOAD_RETRY_ATTEMPTS = 3
const GOOGLE_DRIVE_DOWNLOAD_RETRY_BASE_DELAY_MS = 400
const S3_DOWNLOAD_RETRY_ATTEMPTS = 3
const S3_DOWNLOAD_RETRY_BASE_DELAY_MS = 500
const GOOGLE_ACCESS_TOKEN_DEFAULT_EXPIRES_IN_SECONDS = 3600
const GOOGLE_ACCESS_TOKEN_EXPIRY_BUFFER_MS = 60_000

type GoogleAccessTokenEntry = {
  accessToken: string
  expiresAt: number
}

type GoogleDriveFileMetadata = {
  id: string
  mimeType?: string
  size?: string
  modifiedTime?: string
}

const googleAccessTokenCache = new Map<string, GoogleAccessTokenEntry>()

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const isGoogleAccessTokenUsable = (
  entry: GoogleAccessTokenEntry | null | undefined,
): entry is GoogleAccessTokenEntry =>
  Boolean(entry && entry.expiresAt - GOOGLE_ACCESS_TOKEN_EXPIRY_BUFFER_MS > Date.now())

const toGoogleAccessTokenEntry = (
  accessToken: string,
  expiresInSeconds: unknown,
): GoogleAccessTokenEntry => {
  const normalizedExpiresIn = Number(expiresInSeconds)
  const safeExpiresIn = Number.isFinite(normalizedExpiresIn) && normalizedExpiresIn > 0
    ? normalizedExpiresIn
    : GOOGLE_ACCESS_TOKEN_DEFAULT_EXPIRES_IN_SECONDS
  return {
    accessToken,
    expiresAt: Date.now() + safeExpiresIn * 1000,
  }
}

const isGoogleAuthStatus = (status: number): boolean =>
  status === 401 || status === 403

export const resolveGoogleDriveClientId = (): string => {
  return getEnvVar('VITE_GOOGLE_DRIVE_CLIENT_ID').trim()
}

export const isGoogleDriveRemoteBackupAuthorized = (): boolean => {
  const clientId = resolveGoogleDriveClientId()
  if (!clientId) return false
  const cached = googleAccessTokenCache.get(clientId)
  if (!isGoogleAccessTokenUsable(cached)) {
    googleAccessTokenCache.delete(clientId)
    return false
  }
  return true
}

const nowIsoForFileName = (): string =>
  new Date().toISOString().replace(/[:.]/g, '-')

export const createRemoteBackupFileName = (): string =>
  `${nowIsoForFileName()}.po-backup.zip`

export const getCloudflareR2Endpoint = (accountId: string): string => {
  const normalized = accountId.trim()
  return normalized ? `https://${normalized}.r2.cloudflarestorage.com` : ''
}

export const getCloudflareR2DashboardLinks = (accountId: string): Record<
  'dashboard' | 'buckets' | 'apiTokens' | 'docs',
  string
> => {
  const normalized = accountId.trim()
  return {
    dashboard: normalized
      ? `https://dash.cloudflare.com/${encodeURIComponent(normalized)}/home/overview`
      : CLOUDFLARE_DASHBOARD_URL,
    buckets: normalized
      ? `https://dash.cloudflare.com/${encodeURIComponent(normalized)}/r2/overview`
      : 'https://dash.cloudflare.com/?to=/:account/r2/overview',
    apiTokens: normalized
      ? `https://dash.cloudflare.com/${encodeURIComponent(normalized)}/r2/api-tokens`
      : 'https://dash.cloudflare.com/?to=/:account/r2/api-tokens',
    docs: CLOUDFLARE_R2_DOCS_URL,
  }
}

const CLOUDFLARE_R2_DEFAULT_CORS_ORIGINS = [
  'http://localhost:18181',
  'http://127.0.0.1:18181',
  'https://prompt.always200.com',
]

export const createCloudflareR2CorsConfig = (origin: string): string => {
  const normalizedOrigin = origin.trim()
  const allowedOrigins = Array.from(new Set([
    ...CLOUDFLARE_R2_DEFAULT_CORS_ORIGINS,
    ...(normalizedOrigin && !CLOUDFLARE_R2_DEFAULT_CORS_ORIGINS.includes(normalizedOrigin)
      ? [normalizedOrigin]
      : []),
  ]))

  return JSON.stringify([
    {
      AllowedOrigins: allowedOrigins,
      AllowedMethods: ['GET', 'PUT', 'HEAD', 'DELETE'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600,
    },
  ], null, 2)
}

const toCloudflareR2S3Config = (
  config: Extract<RemoteBackupProviderConfig, { kind: 'cloudflare-r2' }>,
): Extract<RemoteBackupProviderConfig, { kind: 's3-compatible' }> => ({
  kind: 's3-compatible',
  endpoint: getCloudflareR2Endpoint(config.accountId),
  region: 'auto',
  bucket: config.bucket,
  accessKeyId: config.accessKeyId,
  secretAccessKey: config.secretAccessKey,
  prefix: CLOUDFLARE_R2_DEFAULT_BACKUP_PREFIX,
  forcePathStyle: true,
})

export const getRecommendedRemoteBackupProvider = (
  runtime: RemoteBackupRuntime,
): RemoteBackupProviderKind =>
  runtime === 'web' ? 'google-drive' : 'cloudflare-r2'

export const getSupportedRemoteBackupProviders = (
  runtime: RemoteBackupRuntime,
): RemoteBackupProviderKind[] =>
  // B5: Web only exposes Google Drive; S3/R2/WebDAV are Desktop-only (main process).
  runtime === 'web'
    ? ['google-drive']
    : ['cloudflare-r2', 's3-compatible', 'webdav']

export const createDefaultRemoteBackupSettings = (
  runtime: RemoteBackupRuntime,
): RemoteBackupSettings => ({
  provider: createDefaultRemoteBackupProvider(getRecommendedRemoteBackupProvider(runtime)),
})

export const createDefaultRemoteBackupProvider = (
  kind: RemoteBackupProviderKind,
): RemoteBackupProviderConfig => {
  if (kind === 's3-compatible') {
    return {
      kind,
      endpoint: '',
      region: 'auto',
      bucket: '',
      accessKeyId: '',
      secretAccessKey: '',
      prefix: 'prompt-optimizer-backups/',
      forcePathStyle: true,
    }
  }

  if (kind === 'cloudflare-r2') {
    return {
      kind,
      accountId: '',
      bucket: 'prompt-optimizer-backups',
      accessKeyId: '',
      secretAccessKey: '',
    }
  }

  if (kind === 'webdav') {
    return {
      kind,
      endpoint: '',
      username: '',
      password: '',
      directory: 'prompt-optimizer-backups',
    }
  }

  return {
    kind,
  }
}

const remoteBackupProviderKinds: RemoteBackupProviderKind[] = [
  'google-drive',
  'cloudflare-r2',
  's3-compatible',
  'webdav',
]

const isRemoteBackupProviderKind = (value: unknown): value is RemoteBackupProviderKind =>
  typeof value === 'string' && remoteBackupProviderKinds.includes(value as RemoteBackupProviderKind)

const normalizeRemoteBackupProviderConfig = (
  input: unknown,
  fallbackKind: RemoteBackupProviderKind,
): RemoteBackupProviderConfig => {
  if (!isRecord(input)) return createDefaultRemoteBackupProvider(fallbackKind)
  const kind = isRemoteBackupProviderKind(input.kind) ? input.kind : fallbackKind

  if (kind === 'cloudflare-r2') {
    return {
      kind: 'cloudflare-r2',
      accountId: String(input.accountId || ''),
      bucket: String(input.bucket || 'prompt-optimizer-backups'),
      accessKeyId: String(input.accessKeyId || ''),
      secretAccessKey: String(input.secretAccessKey || ''),
    }
  }

  if (kind === 's3-compatible') {
    return {
      kind: 's3-compatible',
      endpoint: String(input.endpoint || ''),
      region: String(input.region || 'auto'),
      bucket: String(input.bucket || ''),
      accessKeyId: String(input.accessKeyId || ''),
      secretAccessKey: String(input.secretAccessKey || ''),
      prefix: String(input.prefix || 'prompt-optimizer-backups/'),
      forcePathStyle: input.forcePathStyle !== false,
    }
  }

  if (kind === 'webdav') {
    return {
      kind: 'webdav',
      endpoint: String(input.endpoint || ''),
      username: String(input.username || ''),
      password: String(input.password || ''),
      directory: String(input.directory || 'prompt-optimizer-backups'),
    }
  }

  return {
    kind: 'google-drive',
  }
}

export const normalizeRemoteBackupSettings = (
  input: unknown,
  runtime: RemoteBackupRuntime,
): RemoteBackupSettings => {
  const fallback = createDefaultRemoteBackupSettings(runtime)
  if (!isRecord(input) || !isRecord(input.provider)) return fallback

  const activeProvider = normalizeRemoteBackupProviderConfig(
    getSupportedRemoteBackupProviders(runtime).includes(
      isRecord(input.provider) ? input.provider.kind as RemoteBackupProviderKind : getRecommendedRemoteBackupProvider(runtime),
    )
      ? input.provider
      : null,
    getRecommendedRemoteBackupProvider(runtime),
  )
  const providers: RemoteBackupProviderMap = {
    [activeProvider.kind]: activeProvider,
  }

  if (isRecord(input.providers)) {
    for (const kind of getSupportedRemoteBackupProviders(runtime)) {
      const savedProvider = input.providers[kind]
      if (isRecord(savedProvider)) {
        providers[kind] = normalizeRemoteBackupProviderConfig(
          { ...savedProvider, kind },
          kind,
        ) as never
      }
    }
    providers[activeProvider.kind] = activeProvider as never
  }

  return {
    provider: activeProvider,
    providers,
  }
}

export const rememberRemoteBackupProvider = (
  settings: RemoteBackupSettings,
): RemoteBackupSettings => ({
  ...settings,
  providers: {
    ...settings.providers,
    [settings.provider.kind]: settings.provider,
  },
})

export const getRememberedRemoteBackupProvider = (
  settings: RemoteBackupSettings,
  kind: RemoteBackupProviderKind,
): RemoteBackupProviderConfig => {
  const provider = settings.providers?.[kind]
  if (provider?.kind === kind) return provider
  return createDefaultRemoteBackupProvider(kind)
}

export const switchRemoteBackupProvider = (
  settings: RemoteBackupSettings,
  kind: RemoteBackupProviderKind,
): RemoteBackupSettings => {
  const remembered = rememberRemoteBackupProvider(settings)
  return {
    ...remembered,
    provider: getRememberedRemoteBackupProvider(remembered, kind),
  }
}

export const loadRemoteBackupSettings = (
  runtime: RemoteBackupRuntime,
): RemoteBackupSettings => {
  if (typeof window === 'undefined') {
    return createDefaultRemoteBackupSettings(runtime)
  }

  try {
    const raw = window.localStorage.getItem(REMOTE_BACKUP_SETTINGS_KEY)
    return normalizeRemoteBackupSettings(raw ? JSON.parse(raw) : null, runtime)
  } catch {
    return createDefaultRemoteBackupSettings(runtime)
  }
}

export const saveRemoteBackupSettings = (settings: RemoteBackupSettings): void => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(REMOTE_BACKUP_SETTINGS_KEY, JSON.stringify(rememberRemoteBackupProvider(settings)))
}

const appendStep = (
  steps: RemoteBackupDetectionStep[],
  key: RemoteBackupDetectionStep['key'],
  ok: boolean,
  message?: string,
) => {
  steps.push({ key, ok, ...(message ? { message } : {}) })
}

const assertOkResponse = async (response: Response, context: string): Promise<Response> => {
  if (response.ok) return response
  const message = await response.text().catch(() => response.statusText)
  throw new Error(`${context}: ${response.status} ${message || response.statusText}`)
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

const isRetryableHttpStatus = (status: number): boolean =>
  status === 408 || status === 425 || status === 429 || status >= 500

const isRetryableFetchError = (error: unknown): boolean => {
  const message = String((error as Error)?.message || error)
  return error instanceof TypeError ||
    /ERR_QUIC_PROTOCOL_ERROR|Failed to fetch|NetworkError|Load failed/i.test(message)
}

const fetchGoogleDriveDownloadWithRetry = async (
  url: string,
  init: RequestInit,
  context: string,
  options?: { returnAuthFailures?: boolean },
): Promise<Response> => {
  let lastError: unknown

  for (let attempt = 1; attempt <= GOOGLE_DRIVE_DOWNLOAD_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, init)
      if (response.ok) return response
      if (options?.returnAuthFailures && isGoogleAuthStatus(response.status)) {
        return response
      }
      if (!isRetryableHttpStatus(response.status) || attempt === GOOGLE_DRIVE_DOWNLOAD_RETRY_ATTEMPTS) {
        return assertOkResponse(response, context)
      }
      lastError = new Error(`${context}: ${response.status} ${response.statusText}`)
    } catch (error) {
      if (!isRetryableFetchError(error) || attempt === GOOGLE_DRIVE_DOWNLOAD_RETRY_ATTEMPTS) {
        throw new Error(`${context}: ${(error as Error).message || String(error)}`, { cause: error })
      }
      lastError = error
    }

    await sleep(GOOGLE_DRIVE_DOWNLOAD_RETRY_BASE_DELAY_MS * attempt)
  }

  throw new Error(`${context}: ${(lastError as Error)?.message || String(lastError)}`)
}

/** 与 desktop/remote-storage.js 对齐：解码路径段，防双重编码穿越。 */
const decodeRemotePathSegment = (segment: string): string => {
  let decoded = segment
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let next: string
    try {
      next = decodeURIComponent(decoded)
    } catch {
      break
    }
    if (next === decoded) break
    decoded = next
  }
  return decoded
}

/**
 * 与 desktop/remote-storage.js 对齐的路径规范化：
 * 拒绝控制字符、反斜杠、`.` / `..` 段，避免路径穿越。
 */
export const normalizeObjectPath = (path: string): string => {
  const raw = String(path || '')
  // Align with desktop/remote-storage.js: backslash + C0 controls + DEL
  // eslint-disable-next-line no-control-regex -- reject C0 controls and DEL
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) {
    throw new Error('Remote storage path contains invalid characters')
  }

  const segments = raw.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  for (const segment of segments) {
    const decoded = decodeRemotePathSegment(segment)
    // eslint-disable-next-line no-control-regex -- reject C0 controls and DEL
    if (decoded === '.' || decoded === '..' || /[\\/\u0000-\u001f\u007f]/.test(decoded)) {
      throw new Error('Remote storage path contains an unsafe segment')
    }
  }
  return segments.join('/')
}

export const joinRemotePath = (...parts: string[]): string =>
  parts.map((part) => normalizeObjectPath(part)).filter(Boolean).join('/')

const parentPathOf = (path: string): string => {
  const normalized = normalizeObjectPath(path)
  const index = normalized.lastIndexOf('/')
  return index === -1 ? '' : normalized.slice(0, index)
}

const fileNameOf = (path: string): string => normalizeObjectPath(path).split('/').pop() || ''

const encodePathSegments = (path: string): string =>
  normalizeObjectPath(path)
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')

const bodyToBlob = (
  body: Blob | ArrayBuffer | Uint8Array | string,
  contentType = 'application/octet-stream',
): Blob => {
  if (body instanceof Blob) {
    return body.type || body.type === contentType
      ? body
      : new Blob([body], { type: contentType })
  }
  if (typeof body === 'string') {
    return new Blob([body], { type: contentType })
  }
  if (body instanceof ArrayBuffer) {
    return new Blob([body], { type: contentType })
  }
  const view = new Uint8Array(body.byteLength)
  view.set(body)
  return new Blob([view.buffer], { type: contentType })
}

const bodyToUint8Array = async (
  body: Blob | ArrayBuffer | Uint8Array | string,
): Promise<Uint8Array> => {
  if (typeof body === 'string') return textEncoder.encode(body)
  if (body instanceof Uint8Array) {
    const bytes = new Uint8Array(body.byteLength)
    bytes.set(body)
    return bytes
  }
  if (body instanceof ArrayBuffer) return new Uint8Array(body.slice(0))
  if (body instanceof Blob) return new Uint8Array(await body.arrayBuffer())
  return new Uint8Array(0)
}

const copyUint8ArrayToArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const view = new Uint8Array(bytes.byteLength)
  view.set(bytes)
  return view.buffer
}

const ipcBytesToArrayBuffer = (value: unknown): ArrayBuffer => {
  if (value instanceof ArrayBuffer) return value.slice(0)
  if (value instanceof Uint8Array) return copyUint8ArrayToArrayBuffer(value)
  if (ArrayBuffer.isView(value)) {
    return copyUint8ArrayToArrayBuffer(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
  }
  if (Array.isArray(value)) return copyUint8ArrayToArrayBuffer(new Uint8Array(value))
  throw new Error('Desktop remote storage returned an unsupported binary payload')
}

const s3BodyToArrayBuffer = async (body: unknown): Promise<ArrayBuffer> => {
  if (!body) return new ArrayBuffer(0)
  if (body instanceof ArrayBuffer) return body
  if (body instanceof Uint8Array) return copyUint8ArrayToArrayBuffer(body)
  if (body instanceof Blob) return body.arrayBuffer()

  const withArrayBuffer = body as { arrayBuffer?: () => Promise<ArrayBuffer> }
  if (typeof withArrayBuffer.arrayBuffer === 'function') {
    return withArrayBuffer.arrayBuffer()
  }

  const withByteArray = body as { transformToByteArray?: () => Promise<Uint8Array> }
  if (typeof withByteArray.transformToByteArray === 'function') {
    return copyUint8ArrayToArrayBuffer(await withByteArray.transformToByteArray())
  }

  const withText = body as { transformToString?: () => Promise<string> }
  if (typeof withText.transformToString === 'function') {
    return copyUint8ArrayToArrayBuffer(textEncoder.encode(await withText.transformToString()))
  }

  const withReader = body as { getReader?: () => ReadableStreamDefaultReader<Uint8Array> }
  if (typeof withReader.getReader === 'function') {
    const reader = withReader.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      chunks.push(value)
      total += value.byteLength
    }
    const bytes = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return bytes.buffer
  }

  throw new Error('S3 download returned an unsupported response body')
}

const isS3NotFoundError = (error: unknown): boolean => {
  const value = error as {
    name?: string
    Code?: string
    code?: string
    $metadata?: { httpStatusCode?: number }
  }
  return value?.$metadata?.httpStatusCode === 404 ||
    value?.name === 'NotFound' ||
    value?.name === 'NoSuchKey' ||
    value?.Code === 'NoSuchKey' ||
    value?.code === 'NoSuchKey'
}

const s3ErrorMessage = (error: unknown): string =>
  (error as Error)?.message || String(error)

const isRetryableS3DownloadError = (error: unknown): boolean => {
  const value = error as {
    name?: string
    code?: string
    $metadata?: { httpStatusCode?: number }
  }
  const status = value?.$metadata?.httpStatusCode
  if (typeof status === 'number' && isRetryableHttpStatus(status)) return true
  const message = s3ErrorMessage(error)
  return error instanceof TypeError ||
    /ERR_CONTENT_LENGTH_MISMATCH|ERR_QUIC_PROTOCOL_ERROR|Failed to fetch|NetworkError|Load failed|aborted|timeout/i.test(message) ||
    value?.name === 'TimeoutError' ||
    value?.name === 'AbortError' ||
    value?.code === 'ECONNRESET' ||
    value?.code === 'ETIMEDOUT'
}

const parseXml = (xml: string): Document =>
  new DOMParser().parseFromString(xml, 'application/xml')

const isCollectionNode = (node: Element): boolean =>
  node.getElementsByTagNameNS('*', 'collection').length > 0

abstract class BaseRemoteObjectStore implements RemoteBackupAdapter {
  abstract provider: RemoteBackupProviderKind
  abstract exists(path: string): Promise<boolean>
  abstract put(path: string, body: Blob | ArrayBuffer | Uint8Array | string, options?: { contentType?: string }): Promise<RemoteObjectEntry>
  abstract get(path: string): Promise<ArrayBuffer>
  abstract list(prefix: string): Promise<RemoteObjectEntry[]>
  abstract delete?(path: string): Promise<void>

  async head(path: string): Promise<RemoteObjectEntry | null> {
    return await this.exists(path) ? { path: normalizeObjectPath(path) } : null
  }

  async getText(path: string): Promise<string> {
    return textDecoder.decode(await this.get(path))
  }

  async detect(): Promise<RemoteBackupDetectionResult> {
    const steps: RemoteBackupDetectionStep[] = []
    try {
      if (typeof this.authorize === 'function') {
        await this.authorize()
      }
      appendStep(steps, 'auth', true)
      await this.list('')
      appendStep(steps, 'list', true)
      const testPath = `detect/prompt-optimizer-test-${Date.now()}.txt`
      await this.put(testPath, 'prompt-optimizer remote backup test', { contentType: 'text/plain' })
      appendStep(steps, 'write', true)
      await this.get(testPath)
      appendStep(steps, 'read', true)
      if (this.delete) {
        await this.delete(testPath)
        appendStep(steps, 'delete', true)
      }
    } catch (error) {
      appendStep(steps, steps.length === 0 ? 'auth' : 'cors', false, String((error as Error).message || error))
    }
    return { ok: steps.every((step) => step.ok), provider: this.provider, steps }
  }

  async listBackups(): Promise<RemoteBackupEntry[]> {
    return (await this.list(''))
      .filter((entry) => entry.path.endsWith('.po-backup.zip'))
      .map((entry) => ({
        id: entry.path,
        name: fileNameOf(entry.path),
        sizeBytes: entry.sizeBytes,
        updatedAt: entry.updatedAt,
      }))
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  }

  async uploadBackup(name: string, blob: Blob): Promise<RemoteBackupEntry> {
    const entry = await this.put(name, blob, { contentType: blob.type || BACKUP_MIME_TYPE })
    return {
      id: entry.path,
      name: fileNameOf(entry.path),
      sizeBytes: entry.sizeBytes ?? blob.size,
      updatedAt: entry.updatedAt,
    }
  }

  async downloadBackup(entry: RemoteBackupEntry): Promise<ArrayBuffer> {
    return this.get(entry.id)
  }

  async deleteBackup(entry: RemoteBackupEntry): Promise<void> {
    if (!this.delete) throw new Error('Remote delete is not supported by this provider')
    await this.delete(entry.id)
  }

  authorize?(): Promise<void>
}

class GoogleDriveRemoteObjectStore extends BaseRemoteObjectStore {
  provider: RemoteBackupProviderKind = 'google-drive'
  private accessTokenEntry: GoogleAccessTokenEntry | null = null
  private rootFolderId: string | null = null
  private pathIdCache = new Map<string, string>()

  constructor(private readonly config: Extract<RemoteBackupProviderConfig, { kind: 'google-drive' }>) {
    super()
  }

  async authorize(): Promise<void> {
    await this.ensureAccessToken()
  }

  async exists(path: string): Promise<boolean> {
    return Boolean(await this.findObjectId(path))
  }

  async head(path: string): Promise<RemoteObjectEntry | null> {
    return this.findObjectMetadata(path)
  }

  async put(
    path: string,
    body: Blob | ArrayBuffer | Uint8Array | string,
    options?: { contentType?: string },
  ): Promise<RemoteObjectEntry> {
    const normalized = normalizeObjectPath(path)
    const blob = bodyToBlob(body, options?.contentType || JSON_MIME_TYPE)
    const existingId = await this.findObjectId(normalized)
    if (existingId) {
      return this.updateFile(existingId, normalized, blob)
    }
    return this.createFile(normalized, blob)
  }

  async get(path: string): Promise<ArrayBuffer> {
    const id = await this.findObjectId(path)
    if (!id) throw new Error(`Google Drive object not found: ${path}`)
    const response = await this.fetchGoogleDrive(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,
      {},
      `Google Drive download failed: ${normalizeObjectPath(path)}`,
      { downloadRetry: true },
    )
    return response.arrayBuffer()
  }

  async list(prefix: string): Promise<RemoteObjectEntry[]> {
    const normalized = normalizeObjectPath(prefix)
    const folderId = normalized ? await this.findOrCreateFolderPath(normalized) : await this.ensureRootFolderId()
    const basePath = normalized
    return this.listFolderRecursive(folderId, basePath)
  }

  async delete(path: string): Promise<void> {
    const id = await this.findObjectId(path)
    if (!id) return
    await this.fetchGoogleDrive(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      'Google Drive delete failed',
    )
    this.pathIdCache.delete(normalizeObjectPath(path))
  }

  private async createFile(path: string, blob: Blob): Promise<RemoteObjectEntry> {
    const parentId = await this.findOrCreateFolderPath(parentPathOf(path))
    const name = fileNameOf(path)
    if (blob.size > GOOGLE_DRIVE_MULTIPART_UPLOAD_LIMIT_BYTES) {
      return this.createFileResumable(path, name, parentId, blob)
    }

    const boundary = `po-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const metadata = {
      name,
      mimeType: blob.type || JSON_MIME_TYPE,
      parents: [parentId],
    }
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify(metadata),
      `\r\n--${boundary}\r\nContent-Type: ${blob.type || JSON_MIME_TYPE}\r\n\r\n`,
      blob,
      `\r\n--${boundary}--`,
    ], { type: `multipart/related; boundary=${boundary}` })
    const response = await this.fetchGoogleDrive(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,modifiedTime,mimeType',
      {
        method: 'POST',
        body,
      },
      'Google Drive upload failed',
    )
    const file = await response.json()
    this.pathIdCache.set(path, String(file.id || ''))
    return {
      path,
      sizeBytes: typeof file.size === 'string' ? Number(file.size) : blob.size,
      updatedAt: typeof file.modifiedTime === 'string' ? file.modifiedTime : new Date().toISOString(),
      contentType: typeof file.mimeType === 'string' ? file.mimeType : blob.type,
    }
  }

  private async createFileResumable(
    path: string,
    name: string,
    parentId: string,
    blob: Blob,
  ): Promise<RemoteObjectEntry> {
    const metadata = {
      name,
      mimeType: blob.type || JSON_MIME_TYPE,
      parents: [parentId],
    }
    const sessionResponse = await this.fetchGoogleDrive(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,modifiedTime,mimeType',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': blob.type || JSON_MIME_TYPE,
          'X-Upload-Content-Length': String(blob.size),
        },
        body: JSON.stringify(metadata),
      },
      'Google Drive resumable upload session failed',
    )
    const uploadUrl = sessionResponse.headers.get('Location')
    if (!uploadUrl) throw new Error('Google Drive resumable upload session did not return a location')

    const uploadResponse = await assertOkResponse(await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': blob.type || JSON_MIME_TYPE,
      },
      body: blob,
    }), 'Google Drive resumable upload failed')
    const file = await uploadResponse.json()
    this.pathIdCache.set(path, String(file.id || ''))
    return {
      path,
      sizeBytes: typeof file.size === 'string' ? Number(file.size) : blob.size,
      updatedAt: typeof file.modifiedTime === 'string' ? file.modifiedTime : new Date().toISOString(),
      contentType: typeof file.mimeType === 'string' ? file.mimeType : blob.type,
    }
  }

  private async updateFile(id: string, path: string, blob: Blob): Promise<RemoteObjectEntry> {
    const response = await this.fetchGoogleDrive(
      `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(id)}?uploadType=media&fields=id,name,size,modifiedTime,mimeType`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': blob.type || JSON_MIME_TYPE,
        },
        body: blob,
      },
      'Google Drive update failed',
    )
    const file = await response.json()
    return {
      path,
      sizeBytes: typeof file.size === 'string' ? Number(file.size) : blob.size,
      updatedAt: typeof file.modifiedTime === 'string' ? file.modifiedTime : new Date().toISOString(),
      contentType: typeof file.mimeType === 'string' ? file.mimeType : blob.type,
    }
  }

  private async listFolderRecursive(folderId: string, folderPath: string): Promise<RemoteObjectEntry[]> {
    const entries: RemoteObjectEntry[] = []
    let pageToken: string | undefined

    do {
      const url = new URL('https://www.googleapis.com/drive/v3/files')
      url.searchParams.set('q', `'${folderId}' in parents and trashed=false`)
      url.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType,size,modifiedTime)')
      url.searchParams.set('pageSize', '1000')
      if (pageToken) url.searchParams.set('pageToken', pageToken)

      const response = await this.fetchGoogleDrive(url, {}, 'Google Drive list failed')
      const payload = await response.json()
      const files = Array.isArray(payload.files) ? payload.files : []
      for (const file of files) {
        const name = String(file.name || '')
        const childPath = joinRemotePath(folderPath, name)
        const mimeType = String(file.mimeType || '')
        if (mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE) {
          this.pathIdCache.set(childPath, String(file.id || ''))
          entries.push(...await this.listFolderRecursive(String(file.id || ''), childPath))
        } else {
          this.pathIdCache.set(childPath, String(file.id || ''))
          entries.push({
            path: childPath,
            sizeBytes: typeof file.size === 'string' ? Number(file.size) : undefined,
            updatedAt: typeof file.modifiedTime === 'string' ? file.modifiedTime : undefined,
            contentType: mimeType || undefined,
          })
        }
      }
      pageToken = typeof payload.nextPageToken === 'string' && payload.nextPageToken
        ? payload.nextPageToken
        : undefined
    } while (pageToken)

    return entries
  }

  private async findObjectId(path: string): Promise<string | null> {
    const normalized = normalizeObjectPath(path)
    const cached = this.pathIdCache.get(normalized)
    if (cached) return cached
    const parentId = await this.findFolderPath(parentPathOf(normalized))
    if (!parentId) return null
    const file = await this.findChild(parentId, fileNameOf(normalized))
    if (!file?.id || file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE) return null
    this.pathIdCache.set(normalized, file.id)
    return file.id
  }

  private async findObjectMetadata(path: string): Promise<RemoteObjectEntry | null> {
    const normalized = normalizeObjectPath(path)
    const parentId = await this.findFolderPath(parentPathOf(normalized))
    if (!parentId) return null
    const file = await this.findChild(parentId, fileNameOf(normalized))
    if (!file?.id || file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE) return null
    this.pathIdCache.set(normalized, file.id)
    return this.googleDriveFileToEntry(normalized, file)
  }

  private googleDriveFileToEntry(path: string, file: GoogleDriveFileMetadata): RemoteObjectEntry {
    const sizeBytes = typeof file.size === 'string' ? Number(file.size) : undefined
    return {
      path,
      sizeBytes: typeof sizeBytes === 'number' && Number.isFinite(sizeBytes) ? sizeBytes : undefined,
      updatedAt: typeof file.modifiedTime === 'string' ? file.modifiedTime : undefined,
      contentType: typeof file.mimeType === 'string' ? file.mimeType : undefined,
    }
  }

  private async ensureRootFolderId(): Promise<string> {
    if (this.rootFolderId) return this.rootFolderId
    const folderName = GOOGLE_DRIVE_DEFAULT_BACKUP_FOLDER_NAME
    const query = [
      `name='${escapeDriveQueryValue(folderName)}'`,
      `mimeType='${GOOGLE_DRIVE_FOLDER_MIME_TYPE}'`,
      'trashed=false',
    ].join(' and ')
    const listUrl = new URL('https://www.googleapis.com/drive/v3/files')
    listUrl.searchParams.set('q', query)
    listUrl.searchParams.set('fields', 'files(id,name)')
    const listResponse = await this.fetchGoogleDrive(listUrl, {}, 'Google Drive folder lookup failed')
    const listPayload = await listResponse.json()
    const existing = Array.isArray(listPayload.files) ? listPayload.files[0] : null
    if (existing?.id) {
      this.rootFolderId = String(existing.id)
      this.pathIdCache.set('', this.rootFolderId)
      return this.rootFolderId
    }

    const createResponse = await this.fetchGoogleDrive(
      'https://www.googleapis.com/drive/v3/files?fields=id,name',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: GOOGLE_DRIVE_FOLDER_MIME_TYPE,
        }),
      },
      'Google Drive folder creation failed',
    )
    const created = await createResponse.json()
    this.rootFolderId = String(created.id || '')
    if (!this.rootFolderId) throw new Error('Google Drive folder creation did not return an id')
    this.pathIdCache.set('', this.rootFolderId)
    return this.rootFolderId
  }

  private async findOrCreateFolderPath(path: string): Promise<string> {
    const normalized = normalizeObjectPath(path)
    if (!normalized) return this.ensureRootFolderId()
    const cached = this.pathIdCache.get(normalized)
    if (cached) return cached

    let currentId = await this.ensureRootFolderId()
    let currentPath = ''
    for (const segment of normalized.split('/').filter(Boolean)) {
      currentPath = joinRemotePath(currentPath, segment)
      const cachedSegment = this.pathIdCache.get(currentPath)
      if (cachedSegment) {
        currentId = cachedSegment
        continue
      }
      const existing = await this.findChild(currentId, segment, GOOGLE_DRIVE_FOLDER_MIME_TYPE)
      if (existing?.id) {
        currentId = existing.id
        this.pathIdCache.set(currentPath, currentId)
        continue
      }
      currentId = await this.createFolder(currentId, segment)
      this.pathIdCache.set(currentPath, currentId)
    }
    return currentId
  }

  private async findFolderPath(path: string): Promise<string | null> {
    const normalized = normalizeObjectPath(path)
    if (!normalized) return this.ensureRootFolderId()
    const cached = this.pathIdCache.get(normalized)
    if (cached) return cached

    let currentId = await this.ensureRootFolderId()
    let currentPath = ''
    for (const segment of normalized.split('/').filter(Boolean)) {
      currentPath = joinRemotePath(currentPath, segment)
      const cachedSegment = this.pathIdCache.get(currentPath)
      if (cachedSegment) {
        currentId = cachedSegment
        continue
      }
      const existing = await this.findChild(currentId, segment, GOOGLE_DRIVE_FOLDER_MIME_TYPE)
      if (!existing?.id) return null
      currentId = existing.id
      this.pathIdCache.set(currentPath, currentId)
    }
    return currentId
  }

  private async findChild(
    parentId: string,
    name: string,
    mimeType?: string,
  ): Promise<GoogleDriveFileMetadata | null> {
    const query = [
      `'${parentId}' in parents`,
      `name='${escapeDriveQueryValue(name)}'`,
      'trashed=false',
      ...(mimeType ? [`mimeType='${mimeType}'`] : []),
    ].join(' and ')
    const url = new URL('https://www.googleapis.com/drive/v3/files')
    url.searchParams.set('q', query)
    url.searchParams.set('fields', 'files(id,mimeType,size,modifiedTime)')
    url.searchParams.set('pageSize', '1')
    const response = await this.fetchGoogleDrive(url, {}, 'Google Drive child lookup failed')
    const payload = await response.json()
    const file = Array.isArray(payload.files) ? payload.files[0] : null
    return file?.id
      ? {
          id: String(file.id),
          mimeType: String(file.mimeType || ''),
          size: typeof file.size === 'string' ? file.size : undefined,
          modifiedTime: typeof file.modifiedTime === 'string' ? file.modifiedTime : undefined,
        }
      : null
  }

  private async createFolder(parentId: string, name: string): Promise<string> {
    const response = await this.fetchGoogleDrive(
      'https://www.googleapis.com/drive/v3/files?fields=id,name',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          mimeType: GOOGLE_DRIVE_FOLDER_MIME_TYPE,
          parents: [parentId],
        }),
      },
      'Google Drive folder creation failed',
    )
    const created = await response.json()
    const id = String(created.id || '')
    if (!id) throw new Error(`Google Drive folder creation did not return an id: ${name}`)
    return id
  }

  private async fetchGoogleDrive(
    url: string | URL,
    init: RequestInit,
    context: string,
    options?: { downloadRetry?: boolean },
  ): Promise<Response> {
    const response = await this.fetchGoogleDriveOnce(url, init, context, false, options)
    if (!isGoogleAuthStatus(response.status)) {
      return assertOkResponse(response, context)
    }
    await response.body?.cancel().catch(() => undefined)
    const retryResponse = await this.fetchGoogleDriveOnce(url, init, context, true, options)
    return assertOkResponse(retryResponse, context)
  }

  private async fetchGoogleDriveOnce(
    url: string | URL,
    init: RequestInit,
    context: string,
    forceRefreshToken: boolean,
    options?: { downloadRetry?: boolean },
  ): Promise<Response> {
    const token = await this.ensureAccessToken({ forceRefresh: forceRefreshToken })
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    const requestInit = { ...init, headers }
    if (options?.downloadRetry) {
      return fetchGoogleDriveDownloadWithRetry(String(url), requestInit, context, {
        returnAuthFailures: true,
      })
    }
    return fetch(url, requestInit)
  }

  private clearAccessToken(clientId: string): void {
    this.accessTokenEntry = null
    googleAccessTokenCache.delete(clientId)
  }

  private async ensureAccessToken(options?: { forceRefresh?: boolean }): Promise<string> {
    const clientId = resolveGoogleDriveClientId()
    if (!clientId) {
      throw new Error('Google Drive OAuth client is not configured')
    }

    if (options?.forceRefresh) {
      this.clearAccessToken(clientId)
    }

    if (!options?.forceRefresh && isGoogleAccessTokenUsable(this.accessTokenEntry)) {
      return this.accessTokenEntry.accessToken
    }

    const cached = googleAccessTokenCache.get(clientId)
    if (!options?.forceRefresh && isGoogleAccessTokenUsable(cached)) {
      this.accessTokenEntry = cached
      return cached.accessToken
    }
    if (cached) googleAccessTokenCache.delete(clientId)

    await loadGoogleIdentityScript()
    const tokenEntry = await requestGoogleAccessToken(clientId)
    this.accessTokenEntry = tokenEntry
    googleAccessTokenCache.set(clientId, tokenEntry)
    return tokenEntry.accessToken
  }
}

const escapeDriveQueryValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const loadGoogleIdentityScript = (): Promise<void> => {
  const maybeGoogle = (globalThis as GoogleIdentityGlobal).google
  if (maybeGoogle?.accounts?.oauth2) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT_URL}"]`,
    )
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = GOOGLE_IDENTITY_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}

const requestGoogleAccessToken = (clientId: string): Promise<GoogleAccessTokenEntry> =>
  new Promise((resolve, reject) => {
    const google = (globalThis as GoogleIdentityGlobal).google
    if (!google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services is unavailable'))
      return
    }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (response: { access_token?: string; expires_in?: number; error?: string }) => {
        if (response.error) {
          reject(new Error(response.error))
          return
        }
        if (!response.access_token) {
          reject(new Error('Google authorization did not return an access token'))
          return
        }
        resolve(toGoogleAccessTokenEntry(response.access_token, response.expires_in))
      },
      error_callback: (error: unknown) => reject(new Error(String(error))),
    })
    client.requestAccessToken()
  })

class WebDavRemoteObjectStore {
  constructor(_config: never) {
    throw new Error('WebDavRemoteObjectStore was removed from UI; use Desktop IPC remote storage.')
  }
}


class DesktopIpcRemoteObjectStore extends BaseRemoteObjectStore {
  provider: RemoteBackupProviderKind

  authorize?: () => Promise<void>

  private readonly config: RemoteBackupProviderConfig

  constructor(config: RemoteBackupProviderConfig) {
    super()
    this.config = cloneRemoteBackupProviderConfig(config)
    this.provider = this.config.kind
    if (this.config.kind === 'google-drive') {
      this.authorize = async () => {
        await this.invoke<null>('authorize', {})
      }
    }
  }

  async exists(path: string): Promise<boolean> {
    return this.invoke<boolean>('exists', { path })
  }

  async head(path: string): Promise<RemoteObjectEntry | null> {
    return this.invoke<RemoteObjectEntry | null>('head', { path })
  }

  async put(
    path: string,
    body: Blob | ArrayBuffer | Uint8Array | string,
    options?: { contentType?: string },
  ): Promise<RemoteObjectEntry> {
    return this.invoke<RemoteObjectEntry>('put', {
      path,
      body: await bodyToUint8Array(body),
      contentType: options?.contentType,
    })
  }

  async get(path: string): Promise<ArrayBuffer> {
    return ipcBytesToArrayBuffer(await this.invoke('get', { path }))
  }

  async getText(path: string): Promise<string> {
    return this.invoke<string>('getText', { path })
  }

  async list(prefix: string): Promise<RemoteObjectEntry[]> {
    return this.invoke<RemoteObjectEntry[]>('list', { path: prefix })
  }

  async delete(path: string): Promise<void> {
    await this.invoke<null>('delete', { path })
  }

  private async invoke<T>(
    operation: RemoteStorageIpcOperation,
    input: Omit<RemoteStorageIpcRequest, 'provider' | 'operation'>,
  ): Promise<T> {
    const api = typeof window !== 'undefined' ? window.electronAPI?.remoteStorage : undefined
    if (!api) {
      throw new Error('Desktop remote storage IPC is unavailable')
    }
    return api.invoke<T>({
      provider: cloneRemoteBackupProviderConfig(this.config),
      operation,
      ...input,
    })
  }
}

class S3CompatibleRemoteObjectStore {
  constructor(_config: never) {
    throw new Error('S3CompatibleRemoteObjectStore was removed from UI; use Desktop IPC remote storage.')
  }
}


class CloudflareR2RemoteObjectStore {
  constructor(_config: never) {
    throw new Error('CloudflareR2RemoteObjectStore was removed from UI; use Desktop IPC remote storage.')
  }
}


export const createRemoteObjectStore = (
  provider: RemoteBackupProviderConfig,
  runtime: RemoteBackupRuntime = 'web',
): RemoteObjectStore => {
  // B5: UI never constructs S3/WebDAV clients. Desktop uses main-process IPC;
  // Web only supports Google Drive OAuth in the browser.
  if (runtime === 'desktop') {
    if (provider.kind === 'google-drive') {
      throw new Error('Google Drive remote backup is only supported in the Web version')
    }
    return new DesktopIpcRemoteObjectStore(provider)
  }
  if (provider.kind === 'google-drive') {
    return new GoogleDriveRemoteObjectStore(provider)
  }
  throw new Error(
    'S3/R2/WebDAV remote backup is Desktop-only. Use the desktop app or Google Drive on web.',
  )
}

export const createRemoteBackupAdapter = (
  provider: RemoteBackupProviderConfig,
  runtime: RemoteBackupRuntime = 'web',
): RemoteBackupAdapter => createRemoteObjectStore(provider, runtime) as RemoteBackupAdapter

export const remoteBackupBlobToImportBuffer = async (blob: Blob): Promise<ArrayBuffer> =>
  blob.arrayBuffer()

export const remoteBackupArrayBufferToText = (buffer: ArrayBuffer): string =>
  textDecoder.decode(buffer)
