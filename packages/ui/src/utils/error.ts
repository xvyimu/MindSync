/**
 * 错误处理工具函数
 * 提供统一的错误处理和类型安全的错误信息提取
 */

import { useToast } from '../composables/ui/useToast'
import { i18n } from '../plugins/i18n'

/**
 * 扩展错误类型，支持更详细的错误信息
 */
export interface ExtendedError extends Error {
  /** 详细的错误消息 */
  detailedMessage?: string
  /** 原始错误对象 */
  originalError?: unknown
  /** 错误代码（i18n key） */
  code?: string
  /** i18n 插值参数 */
  params?: Record<string, unknown>
  /** 额外上下文（非 i18n 插值用） */
  context?: Record<string, unknown>
}

/**
 * 应用错误类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

function isObjectString(value: string): boolean {
  return /^\[object .+\]$/.test(value)
}

function stringifyUnknownObject(value: unknown, fallback: string): string {
  try {
    const serialized = JSON.stringify(value)
    return serialized && !isObjectString(serialized) ? serialized : fallback
  } catch {
    return fallback
  }
}

/**
 * 从未知类型的错误中提取错误消息
 * @param error - 未知类型的错误对象
 * @param fallback - 默认错误消息
 * @returns 错误消息字符串
 */
export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) {
    const message = error.message?.trim()
    if (message && !isObjectString(message)) {
      return message
    }

    const cause = (error as Error & { cause?: unknown }).cause
    if (cause !== undefined) {
      return getErrorMessage(cause, fallback)
    }

    return message || fallback
  }
  if (typeof error === 'string') {
    return error.trim() && !isObjectString(error.trim()) ? error : fallback
  }
  if (error === null || error === undefined) {
    return fallback
  }

  // IPC / cross-context errors may arrive as plain objects ({ message, code, params }).
  if (typeof error === 'object') {
    const maybeMessage = (error as { message?: unknown }).message
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return isObjectString(maybeMessage.trim()) ? fallback : maybeMessage
    }

    if (maybeMessage !== undefined && maybeMessage !== error) {
      return getErrorMessage(maybeMessage, fallback)
    }

    const maybeError = (error as { error?: unknown }).error
    if (maybeError !== undefined && maybeError !== error) {
      return getErrorMessage(maybeError, fallback)
    }

    const status = (error as { status?: unknown; statusCode?: unknown; response?: { status?: unknown } }).status
      ?? (error as { statusCode?: unknown }).statusCode
      ?? (error as { response?: { status?: unknown } }).response?.status
    const body = (error as { body?: unknown; data?: unknown; response?: { data?: unknown } }).body
      ?? (error as { data?: unknown }).data
      ?? (error as { response?: { data?: unknown } }).response?.data
    if (status !== undefined) {
      const detail = body !== undefined && body !== error ? getErrorMessage(body, '') : ''
      return detail ? `HTTP ${String(status)}: ${detail}` : `HTTP ${String(status)} error`
    }

    return stringifyUnknownObject(error, fallback)
  }

  try {
    return String(error)
  } catch {
    return fallback
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasReadableErrorShape(value: Record<string, unknown>): boolean {
  return (
    'message' in value ||
    'error' in value ||
    'status' in value ||
    'statusCode' in value ||
    'response' in value ||
    'code' in value
  )
}

function normalizeI18nParams(params: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!params) return undefined

  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      isRecord(value) || Array.isArray(value)
        ? getErrorMessage(value, stringifyUnknownObject(value, 'Unknown error'))
        : value,
    ])
  )
}

/**
 * 将结构化错误（code + params）转换为用户可读的 i18n 文案。
 *
 * 规则：
 * - 不解析 error.message（避免把 `[error.xxx] ...` 暴露给用户）
 * - 只有在 i18n 存在该 key 时才使用翻译，否则回退到 getErrorMessage
 */
export function getI18nErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (!isRecord(error)) {
    return getErrorMessage(error, fallback)
  }

  const code = typeof error.code === 'string' ? error.code : undefined
  const params = isRecord(error.params) ? error.params : undefined

  if (code) {
    const hasKey = i18n.global.te(code)
    if (hasKey) {
      try {
        return i18n.global.t(code, normalizeI18nParams(params) ?? {})
      } catch {
        // If interpolation fails for any reason, fall back to raw error message.
      }
    }
  }

  const message = getErrorMessage(error, fallback)

  // Avoid leaking internal error-code placeholders like "[error.xxx]" to users.
  if (typeof fallback === 'string' && fallback.trim() && /^\[error\.[^\]]+\]/.test(message)) {
    return fallback
  }

  return message
}

export function formatErrorSummary(summary: string, error: unknown, fallback = 'Unknown error'): string {
  const normalizedSummary = summary.trim()
  const detail = getI18nErrorMessage(error, fallback).trim()
  const suppressPlainObjectDetail =
    isRecord(error) &&
    !(error instanceof Error) &&
    !Array.isArray(error) &&
    !hasReadableErrorShape(error)
  const hasMeaningfulDetail =
    !suppressPlainObjectDetail &&
    detail &&
    detail !== fallback &&
    detail !== normalizedSummary &&
    !/^\[object .+\]$/.test(detail)

  if (!normalizedSummary) {
    return detail || fallback
  }

  if (!hasMeaningfulDetail) {
    return normalizedSummary
  }

  return `${normalizedSummary}: ${detail}`
}


/**
 * 类型守卫：检查是否为 ExtendedError
 * @param error - 待检查的错误对象
 * @returns 是否为 ExtendedError
 */
export function isExtendedError(error: unknown): error is ExtendedError {
  return (
    error instanceof Error &&
    ('detailedMessage' in error || 'originalError' in error || 'code' in error || 'context' in error)
  )
}

/**
 * 安全地将未知错误转换为 ExtendedError
 * @param error - 未知类型的错误对象
 * @returns ExtendedError 或 null
 */
export function asExtendedError(error: unknown): ExtendedError | null {
  if (isExtendedError(error)) {
    return error
  }
  return null
}

/**
 * 获取详细的错误消息，优先使用 ExtendedError 的详细信息
 * @param error - 未知类型的错误对象
 * @param fallback - 默认错误消息
 * @returns 详细的错误消息字符串
 */
export function getDetailedErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  const extendedError = asExtendedError(error)

  if (extendedError) {
    // 优先使用详细消息
    if (extendedError.detailedMessage) {
      return extendedError.detailedMessage
    }

    // 其次使用原始错误
    if (extendedError.originalError !== undefined) {
      return String(extendedError.originalError)
    }

    // 最后使用标准错误消息
    return extendedError.message
  }

  return getErrorMessage(error, fallback)
}

/**
 * 创建一个 ExtendedError 实例
 * @param message - 错误消息
 * @param options - 扩展选项
 * @returns ExtendedError 实例
 */
export function createExtendedError(
  message: string,
  options?: {
    detailedMessage?: string
    originalError?: unknown
    code?: string
    params?: Record<string, unknown>
    context?: Record<string, unknown>
  }
): ExtendedError {
  const error = new Error(message) as ExtendedError

  if (options?.detailedMessage) {
    error.detailedMessage = options.detailedMessage
  }

  if (options?.originalError !== undefined) {
    error.originalError = options.originalError
  }

  if (options?.code) {
    error.code = options.code
  }

  if (options?.params) {
    error.params = options.params
  }

  if (options?.context) {
    error.context = options.context
  }

  return error
}

/**
 * 创建错误处理器
 * @param context - 错误上下文描述
 * @returns 错误处理器对象
 */
export function createErrorHandler(context: string) {
  const toast = useToast()

  return {
    handleError(error: unknown) {
      console.error(`[${context}] Error:`, error)

      toast.error(getI18nErrorMessage(error, 'An unexpected error occurred'))
    }
  }
}

/**
 * 在开发环境中记录详细的错误信息
 * @param context - 错误上下文描述
 * @param error - 错误对象
 */
export function logErrorInDev(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}] Error occurred:`, error)

    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        ...(isExtendedError(error) && {
          detailedMessage: error.detailedMessage,
          originalError: error.originalError,
          code: error.code,
          context: error.context
        })
      })
    }
  }
}

/**
 * 预定义错误消息常量
 */
export const errorMessages = {
  SERVICE_NOT_INITIALIZED: 'Service not initialized. Please try again later.',
  TEMPLATE_NOT_SELECTED: 'Please select a prompt template first.',
  INCOMPLETE_TEST_INFO: 'Please fill in the complete test information.',
  LOAD_TEMPLATE_FAILED: 'Failed to load template.',
  CLEAR_HISTORY_FAILED: 'Failed to clear history.'
} as const

// ---------------------------------------------------------------------------
// LLM / 网络传输错误统一分类
// 目标：UI 层不再直接把 raw error message 抛给用户，避免出现 "Failed to fetch"
// / 空对象序列化 / provider-specific 的英文栈；改为通过 kind 映射到 i18n key。
// ---------------------------------------------------------------------------

export type LlmTransportErrorKind =
  | 'offline'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'auth'
  | 'permission'
  | 'rate_limit'
  | 'server'
  | 'not_found'
  | 'invalid_request'
  | 'model_unavailable'
  | 'unknown'

export interface ClassifiedLlmTransportError {
  kind: LlmTransportErrorKind
  status?: number
  message: string
  retriable: boolean
  origin?: string
}

const NETWORK_MESSAGE_HINTS = [
  'network error',
  'failed to fetch',
  'network request failed',
  'econnreset',
  'econnrefused',
  'enotfound',
  'etimedout',
  'socket hang up',
  'load failed',
]

const OFFLINE_MESSAGE_HINTS = [
  'offline',
  'no internet',
  'dns_probe',
  'net::err_internet_disconnected',
]

const TIMEOUT_MESSAGE_HINTS = [
  'timeout',
  'timed out',
  'etimedout',
]

const ABORT_MESSAGE_HINTS = [
  'abort',
  'canceled',
  'cancelled',
]

function toLowerSafe(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.toLowerCase()
}

function extractStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined
  const anyErr = err as Record<string, unknown>
  if (typeof anyErr.status === 'number') return anyErr.status as number
  if (typeof anyErr.statusCode === 'number') return anyErr.statusCode as number
  const response = anyErr.response as Record<string, unknown> | undefined
  if (response && typeof response === 'object' && typeof (response as { status?: unknown }).status === 'number') {
    return (response as { status: number }).status
  }
  const msg = typeof anyErr.message === 'string' ? (anyErr.message as string) : ''
  const match = msg.match(/\b(4\d{2}|5\d{2})\b/)
  if (match) {
    const parsed = Number(match[1])
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function isOfflineLike(_err: unknown, lowerMessage: string): boolean {
  if (typeof navigator !== 'undefined' && navigator && (navigator as Navigator).onLine === false) {
    return true
  }
  return OFFLINE_MESSAGE_HINTS.some((hint) => lowerMessage.includes(hint))
}

function isAbortLike(err: unknown, lowerMessage: string): boolean {
  if (!err) return false
  if (err instanceof Error && err.name === 'AbortError') return true
  if (typeof err === 'object' && err && (err as { name?: unknown }).name === 'AbortError') return true
  return ABORT_MESSAGE_HINTS.some((hint) => lowerMessage.includes(hint))
}

/**
 * 将任意底层错误分类为 UI 可读的传输层错误。
 * provider 无关：无论是 fetch/axios 抛出的 Error，还是 adapter 组装出的错误对象，都能得到一致结构。
 */
export function classifyLlmTransportError(err: unknown, options: { origin?: string } = {}): ClassifiedLlmTransportError {
  const rawMessage = getErrorMessage(err, '')
  const message = rawMessage.trim() || 'Unknown error'
  const lower = toLowerSafe(message)
  const status = extractStatus(err)

  if (isAbortLike(err, lower)) {
    return { kind: 'aborted', status, message, retriable: false, origin: options.origin }
  }

  if (isOfflineLike(err, lower)) {
    return { kind: 'offline', status, message, retriable: true, origin: options.origin }
  }

  if (TIMEOUT_MESSAGE_HINTS.some((hint) => lower.includes(hint))) {
    return { kind: 'timeout', status, message, retriable: true, origin: options.origin }
  }

  if (status !== undefined) {
    if (status === 401) return { kind: 'auth', status, message, retriable: false, origin: options.origin }
    if (status === 403) return { kind: 'permission', status, message, retriable: false, origin: options.origin }
    if (status === 404) return { kind: 'not_found', status, message, retriable: false, origin: options.origin }
    if (status === 429) return { kind: 'rate_limit', status, message, retriable: true, origin: options.origin }
    if (status >= 500) return { kind: 'server', status, message, retriable: true, origin: options.origin }
    if (status >= 400) {
      if (/model.*(unavailable|not.?exist|not.?found|no.?such)/.test(lower)) {
        return { kind: 'model_unavailable', status, message, retriable: false, origin: options.origin }
      }
      return { kind: 'invalid_request', status, message, retriable: false, origin: options.origin }
    }
  }

  if (NETWORK_MESSAGE_HINTS.some((hint) => lower.includes(hint))) {
    return { kind: 'network', status, message, retriable: true, origin: options.origin }
  }

  if (/api\s*key|apikey|unauthorized|invalid.*key/.test(lower)) {
    return { kind: 'auth', status, message, retriable: false, origin: options.origin }
  }

  if (/quota|rate.?limit|too.?many.?requests/.test(lower)) {
    return { kind: 'rate_limit', status, message, retriable: true, origin: options.origin }
  }

  if (/model.*(unavailable|not.?exist|not.?found|no.?such|deprecated)/.test(lower)) {
    return { kind: 'model_unavailable', status, message, retriable: false, origin: options.origin }
  }

  return { kind: 'unknown', status, message, retriable: false, origin: options.origin }
}

/**
 * kind -> i18n key，缺失翻译时可以回退到 message。
 */
export const LLM_TRANSPORT_ERROR_I18N_KEYS: Record<LlmTransportErrorKind, string> = {
  offline: 'error.transport.offline',
  network: 'error.transport.network',
  timeout: 'error.transport.timeout',
  aborted: 'error.transport.aborted',
  auth: 'error.transport.auth',
  permission: 'error.transport.permission',
  rate_limit: 'error.transport.rateLimit',
  server: 'error.transport.server',
  not_found: 'error.transport.notFound',
  invalid_request: 'error.transport.invalidRequest',
  model_unavailable: 'error.transport.modelUnavailable',
  unknown: 'error.transport.unknown',
}

/**
 * 拿到分类后适合直接展示的中文/英文文案。
 * 顺序：i18n（存在时）→ 原始 message（有意义时）→ 兜底 kind。
 */
export function getClassifiedErrorText(
  classified: ClassifiedLlmTransportError,
  translate: (key: string) => string,
  hasKey?: (key: string) => boolean
): string {
  const key = LLM_TRANSPORT_ERROR_I18N_KEYS[classified.kind]
  const isKeyPresent = typeof hasKey === 'function' ? hasKey(key) : true
  if (isKeyPresent) {
    const translated = translate(key)
    if (translated && translated !== key) return translated
  }
  if (classified.message && classified.message.trim().length > 0) {
    return classified.message
  }
  return classified.kind
}

/**
 * 便捷封装：对任意错误分类后返回可读文案，通过全局 i18n 实例翻译。
 * 若分类为 'unknown'（没有可识别的传输层特征），返回 fallback，避免遮盖上层更具体的业务错误。
 * 用于 optimize / iterate / test 等流式回调的 onError。
 */
export function getTransportErrorMessage(error: unknown, fallback: string): string {
  // 用户主动取消不应弹错误 toast。
  if (isRecord(error) && error.code === 'IPC_STREAM_CANCELLED') {
    return fallback
  }
  const classified = classifyLlmTransportError(error)
  if (classified.kind === 'aborted') {
    return fallback
  }
  if (classified.kind === 'unknown') {
    return fallback
  }
  return getClassifiedErrorText(
    classified,
    (key) => i18n.global.t(key),
    (key) => i18n.global.te(key)
  )
}


