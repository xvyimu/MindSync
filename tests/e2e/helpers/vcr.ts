/**
 * E2E 测试 VCR (Video Cassette Recorder)
 *
 * 为 E2E 测试提供 LLM API 请求的录制和回放功能
 *
 * 工作原理：
 * - 拦截真实的 LLM API 请求（OpenAI, DeepSeek 等）
 * - 首次运行：调用真实 API 并保存响应为 fixture
 * - 后续运行：直接回放 fixture，无需真实 API 调用
 *
 * @module tests/e2e/helpers/vcr
 */

import { type Page, type Route } from '@playwright/test'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'

/**
 * LLM API 提供商
 */
type LLMProvider = 'openai' | 'deepseek' | 'anthropic' | 'gemini' | 'zhipu' | 'modelscope' | 'siliconflow' | 'dashscope'

/**
 * VCR 模式
 */
export type VCRMode = 'auto' | 'record' | 'replay' | 'live'

/**
 * VCR 配置
 */
interface VCRConfig {
  mode: VCRMode
  fixtureDir: string
}

/**
 * VCR Fixture
 */
interface VCRInteraction {
  provider: LLMProvider
  url: string
  method: string
  requestBody: any
  requestHash: string

  /** Raw response body as UTF-8 text (SSE or JSON). */
  rawBody: string

  /** Response headers captured at record time (subset). */
  responseHeaders: Record<string, string>

  /**
   * Parsed response body (for debugging only).
   * For SSE responses this is the reconstructed final JSON.
   */
  responseBody: any

  duration: number
  status: number
}

interface VCRFixture {
  testName: string
  testCase: string

  /**
   * 支持同一个测试用例内的多次 LLM 请求。
   * 录制时追加 interactions，回放时基于 requestHash 匹配并消费对应条目。
   */
  interactions: VCRInteraction[]

  // --- legacy fields for backward compatibility (single interaction) ---
  provider?: LLMProvider
  url?: string
  requestBody?: any
  responseBody?: any
  rawSSE?: string // legacy only
  duration?: number
}

const CURRENT_TEST_VCR_FAILURE_KEY = '__PROMPT_OPTIMIZER_CURRENT_TEST_VCR_FAILURE__'
const INLINE_IMAGE_DATA_URL_RE = /^data:image\/([a-z0-9.+-]+)(?:;charset=[^;,]+)?;base64,/iu
const INLINE_BASE64_FIELD_KEYS = new Set(['b64', 'base64', 'b64_json', 'data'])
const HTTP_URL_RE = /^https?:\/\//iu
const REPLAY_PLACEHOLDER_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" width="240" height="160">',
  '<rect width="240" height="160" fill="#f3f4f6"/>',
  '<path d="M0 0L240 160M240 0L0 160" stroke="#cbd5e1" stroke-width="2"/>',
  '<rect x="24" y="44" width="192" height="72" rx="12" fill="#e2e8f0" stroke="#94a3b8"/>',
  '<text x="120" y="77" text-anchor="middle" fill="#334155" font-family="Arial, sans-serif" font-size="16">Image omitted</text>',
  '<text x="120" y="99" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="12">Replay placeholder</text>',
  '</svg>',
].join('')
const REPLAY_PLACEHOLDER_DATA_URL = `data:image/svg+xml;base64,${Buffer.from(REPLAY_PLACEHOLDER_SVG, 'utf8').toString('base64')}`

const getVCRFailureStore = (): { value: string | null } => {
  const scopedGlobal = globalThis as typeof globalThis & {
    [CURRENT_TEST_VCR_FAILURE_KEY]?: { value: string | null }
  }

  if (!scopedGlobal[CURRENT_TEST_VCR_FAILURE_KEY]) {
    scopedGlobal[CURRENT_TEST_VCR_FAILURE_KEY] = { value: null }
  }

  return scopedGlobal[CURRENT_TEST_VCR_FAILURE_KEY]!
}

export function getCurrentTestVCRFailure(): string | null {
  return getVCRFailureStore().value
}

const CURRENT_TEST_RECORD_TARGET_KEY = Symbol.for('mindsync.e2e.vcr.recordTarget')
const CURRENT_TEST_RECORD_ATTEMPT_KEY = Symbol.for('mindsync.e2e.vcr.recordAttempt')

const getRecordTargetStore = (): { value: string | null } => {
  const scopedGlobal = globalThis as typeof globalThis & {
    [CURRENT_TEST_RECORD_TARGET_KEY]?: { value: string | null }
  }

  if (!scopedGlobal[CURRENT_TEST_RECORD_TARGET_KEY]) {
    scopedGlobal[CURRENT_TEST_RECORD_TARGET_KEY] = { value: null }
  }

  return scopedGlobal[CURRENT_TEST_RECORD_TARGET_KEY]!
}

const getRecordAttemptStore = (): { value: boolean } => {
  const scopedGlobal = globalThis as typeof globalThis & {
    [CURRENT_TEST_RECORD_ATTEMPT_KEY]?: { value: boolean }
  }

  if (!scopedGlobal[CURRENT_TEST_RECORD_ATTEMPT_KEY]) {
    scopedGlobal[CURRENT_TEST_RECORD_ATTEMPT_KEY] = { value: false }
  }

  return scopedGlobal[CURRENT_TEST_RECORD_ATTEMPT_KEY]!
}

/**
 * 在 record 模式下，setTestContext 会先删除旧 fixture 以避免混入历史交互。
 * 若这一轮没有任何 LLM 请求真正发出（例如缺少 API key、请求被拦截），
 * writeFixture 永远不会被调用，fixture 就停留在“已删除”的状态 —— 而测试仍会报绿。
 * 该函数在 teardown 阶段回检：确有 LLM 请求进入录制路径、却没有写回文件，即判定为录制失败。
 * 从不发起 LLM 请求的用例（如纯 UI 断言）不受影响。
 * 返回错误描述；一切正常时返回 null。
 */
export async function getCurrentTestRecordFailure(): Promise<string | null> {
  const fixturePath = getRecordTargetStore().value
  if (!fixturePath) return null
  if (!getRecordAttemptStore().value) return null

  try {
    const stat = await fs.stat(fixturePath)
    if (stat.size > 0) return null
    return `Record mode produced an empty fixture file: ${path.relative(process.cwd(), fixturePath)}`
  } catch {
    return (
      `Record mode wrote no fixture. The previous fixture was deleted at test start and ` +
      `nothing replaced it: ${path.relative(process.cwd(), fixturePath)}. ` +
      `This usually means the LLM request never completed (missing API key, network failure, ` +
      `or the response was rejected before it could be saved).`
    )
  }
}

export function throwIfCurrentTestHasVCRFailure(): void {
  const failure = getCurrentTestVCRFailure()
  if (failure) {
    throw new Error(failure)
  }
}

type WaitForConditionOptions = {
  timeoutMs: number
  intervalMs?: number
  description?: string
}

export async function waitForConditionOrVCRFailure(
  check: () => Promise<boolean> | boolean,
  options: WaitForConditionOptions,
): Promise<void> {
  const { timeoutMs, intervalMs = 100, description = 'condition was not met in time' } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    throwIfCurrentTestHasVCRFailure()

    if (await check()) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throwIfCurrentTestHasVCRFailure()
  throw new Error(`[VCR wait timeout] ${description}`)
}

/**
 * E2E VCR 类
 */
class E2EVCR {
  private config: VCRConfig
  private currentTestName: string = ''
  private currentTestCase: string = ''
  private recordingEnabled: boolean = false

  // Replay-only: per testCase, track how many interactions have been consumed per requestHash.
  private replayConsumedByHash: Map<string, number> = new Map()

  // Record-only: in-flight upstream calls + fixture writes.
  //
  // A route handler runs detached from the test body, so a spec that satisfies its
  // assertion before the LLM response lands (e.g. pro-variable, whose output box is
  // non-empty from variable interpolation alone) finishes and closes the page while
  // the recording fetch is still open. Playwright then tears the handler down and the
  // fixture is never written -- silently, leaving the spec permanently un-recordable.
  // Tracking the promises lets the fixture teardown await them before closing the page.
  private pendingRecordings: Set<Promise<void>> = new Set()

  private trackRecording(work: Promise<void>): void {
    const tracked = work
      .catch((error) => {
        console.error('[VCR] ❌ Recording failed:', error)
      })
      .finally(() => {
        this.pendingRecordings.delete(tracked)
      })

    this.pendingRecordings.add(tracked)
  }

  /**
   * Await every in-flight recording. Called from the test fixture before the page
   * closes so record mode does not depend on the spec happening to out-wait the API.
   */
  async flushRecordings(): Promise<void> {
    while (this.pendingRecordings.size > 0) {
      await Promise.all([...this.pendingRecordings])
    }
  }

  constructor(config: VCRConfig) {
    this.config = config
  }

  private normalizeLiveRequestHeaders(headers: Record<string, string>): Record<string, string> {
    const next = { ...headers }
    delete next.host
    delete next.connection
    delete next['content-length']
    delete next['transfer-encoding']
    return next
  }

  /**
   * Record-only upstream override.
   *
   * The recorded fixture keeps the *original* vendor URL (api.deepseek.com), so
   * `identifyProvider`, `computeRequestHash` and the on-disk fixture layout are
   * untouched -- replay is byte-for-byte the same contract as before. Only the
   * outbound call made while recording is redirected, which lets us refresh
   * fixtures against an OpenAI-compatible endpoint without vendor billing.
   *
   * Configure per provider, e.g.:
   *   E2E_VCR_RECORD_BASE_URL_DEEPSEEK=https://token.sensenova.cn/v1
   *   E2E_VCR_RECORD_API_KEY_DEEPSEEK=sk-...
   */
  private resolveRecordUpstream(
    provider: LLMProvider,
    url: string,
    headers: Record<string, string>,
  ): { url: string; headers: Record<string, string> } {
    const suffix = provider.toUpperCase()
    const baseURL = process.env[`E2E_VCR_RECORD_BASE_URL_${suffix}`]
    if (!baseURL) {
      return { url, headers }
    }

    const original = new URL(url)
    const target = new URL(baseURL.replace(/\/+$/, ''))
    // Preserve the vendor path *and* any base-path prefix on the override
    // (e.g. the `/v1` in https://token.sensenova.cn/v1).
    const rewritten = new URL(
      `${target.pathname.replace(/\/+$/, '')}${original.pathname}${original.search}`,
      target.origin,
    )

    const nextHeaders = { ...headers }
    const apiKey = process.env[`E2E_VCR_RECORD_API_KEY_${suffix}`]
    if (apiKey) {
      delete nextHeaders.authorization
      delete nextHeaders.Authorization
      nextHeaders.authorization = `Bearer ${apiKey}`
    }

    console.log(`[VCR] 🎬 record upstream override: ${original.host} -> ${rewritten.host}${rewritten.pathname}`)

    return { url: rewritten.toString(), headers: nextHeaders }
  }

  private async fetchLiveResponseWithRetry(
    provider: LLMProvider,
    url: string,
    method: string,
    headers: Record<string, string>,
    body: string | null,
    attempts = 3
  ): Promise<{
    status: number
    headers: Record<string, string>
    body: string
  }> {
    let lastError: unknown = null
    const upstream = this.resolveRecordUpstream(provider, url, headers)
    const requestUrl = upstream.url
    const normalizedHeaders = this.normalizeLiveRequestHeaders(upstream.headers)

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetch(requestUrl, {
          method,
          headers: normalizedHeaders,
          body: body || undefined,
        })

        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: await response.text(),
        }
      } catch (error) {
        lastError = error
        if (attempt === attempts) break

        const delayMs = attempt * 1000
        console.warn(
          `[VCR] live fetch failed (attempt ${attempt}/${attempts}) for ${requestUrl}: ${String(error)}`
        )
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  }

  /**
   * 设置当前测试上下文
   */
  async setTestContext(testName: string, testCase: string) {
    this.currentTestName = testName
    this.currentTestCase = testCase
    this.recordingEnabled = await this.shouldRecord()
    this.replayConsumedByHash = new Map()
    getVCRFailureStore().value = null

    // In explicit record mode, always start from a clean fixture file to avoid mixing old interactions.
    // 登记删除目标，teardown 阶段回检是否真的写回（见 getCurrentTestRecordFailure）。
    getRecordTargetStore().value = null
    getRecordAttemptStore().value = false
    if (this.config.mode === 'record') {
      const fixturePath = this.getFixturePath()
      getRecordTargetStore().value = fixturePath
      try {
        await fs.rm(fixturePath, { force: true })
      } catch {
        // ignore
      }
    }

    const modeSymbol = this.getModeSymbol()
    console.log(`[VCR] ${modeSymbol} Test: ${testName} - ${testCase}`)
  }

  /**
   * 获取模式符号
   */
  private getModeSymbol(): string {
    const { mode } = this.config
    if (mode === 'live') return '🔴 Live'
    if (mode === 'record') return '🎬 Record'
    if (mode === 'replay') return '♻️  Replay'
    if (this.recordingEnabled) return '🎬 Auto-Record'
    return '♻️  Auto-Replay'
  }

  /**
   * 判断是否应该录制
   */
  private async shouldRecord(): Promise<boolean> {
    const { mode } = this.config
    if (mode === 'live') return false
    if (mode === 'record') return true
    if (mode === 'replay') return false

    // auto 模式：检查 fixture 是否存在
    return !(await this.fixtureExists())
  }

  /**
   * 检查 fixture 是否存在
   */
  private async fixtureExists(): Promise<boolean> {
    const fixturePath = this.getFixturePath()
    try {
      await fs.access(fixturePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取 fixture 路径
   */
  private getFixturePath(): string {
    const sanitizedTestName = this.sanitizeFilename(this.currentTestName)
    const sanitizedTestCase = this.sanitizeFilename(this.currentTestCase)
    return path.join(
      this.config.fixtureDir,
      sanitizedTestName,
      `${sanitizedTestCase}.json`
    )
  }

  /**
   * 清理文件名（保留中文、字母、数字）
   */
  private sanitizeFilename(name: string): string {
    // Windows 路径会包含反斜杠，正则字符类里会把 "\\" 当作普通字符保留
    // 这会导致 fixture 目录名与预期不一致（例如 optimize\pro-multi.spec.ts）。
    // 先统一将路径分隔符替换为 '-' 再进行过滤。
    return name
      .replace(/\\/g, '-')
      .replace(/[^\u4e00-\u9fa5a-z0-9]/gi, '-') // 保留中文、字母、数字
      .replace(/-+/g, '-') // 合并多个连字符
      .replace(/^-|-$/g, '') // 移除首尾连字符
      .toLowerCase()
  }

  /**
   * 识别 LLM 提供商
   */
  private identifyProvider(url: string): LLMProvider | null {
    if (url.includes('api.openai.com')) return 'openai'
    if (url.includes('api.deepseek.com')) return 'deepseek'
    if (url.includes('api.anthropic.com')) return 'anthropic'
    if (url.includes('generativelanguage.googleapis.com')) return 'gemini'
    if (url.includes('open.bigmodel.cn')) return 'zhipu'
    if (url.includes('modelscope.cn')) return 'modelscope'
    if (url.includes('api.siliconflow.cn')) return 'siliconflow'
    if (url.includes('dashscope.aliyuncs.com')) return 'dashscope'
    return null
  }

  /**
   * 保存 fixture
   */
  private stableStringify(value: any): string {
    if (value === null || value === undefined) return String(value)

    if (Array.isArray(value)) {
      return `[${value.map((v) => this.stableStringify(v)).join(',')}]`
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value).sort()
      const entries = keys.map((k) => `${JSON.stringify(k)}:${this.stableStringify((value as any)[k])}`)
      return `{${entries.join(',')}}`
    }

    return JSON.stringify(value)
  }

  private isLikelyInlineBase64(value: string): boolean {
    const trimmed = value.trim()
    if (trimmed.length < 64) return false
    return /^[a-z0-9+/=_\r\n-]+$/i.test(trimmed)
  }

  private normalizePromptTemplateText(content: string, role?: string): string {
    const normalized = content.replace(/\r\n/g, '\n').trim()

    if (role === 'system') {
      const roleMatch = normalized.match(/^# Role:\s*(.+)$/m)
      if (roleMatch) {
        return `__system_role:${roleMatch[1].trim()}__`
      }
    }

    // Prefer originalPrompt evidence JSON so template-wrapper wording drift does not bust VCR hashes.
    const evidenceJsonMatch = normalized.match(
      /(?:User prompt evidence to optimize|Image-to-Image modification-request evidence|System prompt evidence to optimize)\s*\(JSON\):\s*([\s\S]*?)\n\nPlease output/i,
    )
    if (evidenceJsonMatch) {
      try {
        const parsedEvidence = JSON.parse(evidenceJsonMatch[1].trim())
        if (typeof parsedEvidence?.originalPrompt === 'string' && parsedEvidence.originalPrompt.trim()) {
          return parsedEvidence.originalPrompt.trim()
        }

        return this.stableStringify(this.normalizeRequestValue(parsedEvidence))
      } catch {
        return evidenceJsonMatch[1].trim()
      }
    }

    const legacyRequestMatch = normalized.match(
      /Modification request to optimize:\s*([\s\S]*?)\n\nPlease output/i,
    )
    if (legacyRequestMatch) {
      return legacyRequestMatch[1].trim()
    }

    return normalized
  }

  private normalizeChatMessageContent(content: any, role: string): any {
    if (typeof content === 'string') {
      return this.normalizePromptTemplateText(content, role)
    }

    if (Array.isArray(content)) {
      const textParts = content
        .map((item) => {
          if (typeof item === 'string') return item
          if (!item || typeof item !== 'object') return ''
          if (item.type === 'text' && typeof item.text === 'string') return item.text
          return ''
        })
        .filter(Boolean)

      const joinedText = textParts.join('\n\n').trim()
      return joinedText ? this.normalizePromptTemplateText(joinedText, role) : ''
    }

    return this.normalizeRequestValue(content)
  }

  private normalizeRequestValue(value: any, key?: string): any {
    if (typeof value === 'string') {
      const inlineImageMatch = value.match(INLINE_IMAGE_DATA_URL_RE)
      if (inlineImageMatch) {
        return `__inline_image_data_url_${inlineImageMatch[1].toLowerCase()}__`
      }

      if (key && INLINE_BASE64_FIELD_KEYS.has(key.toLowerCase()) && this.isLikelyInlineBase64(value)) {
        return '__inline_image_base64__'
      }

      return value
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeRequestValue(item, key))
    }

    if (value && typeof value === 'object') {
      if (Array.isArray((value as { messages?: any[] }).messages)) {
        const normalizedMessages = (value as { messages: any[] }).messages.map((message) => {
          const role = typeof message?.role === 'string' ? message.role : 'unknown'
          return {
            ...message,
            content: this.normalizeChatMessageContent(message?.content, role),
          }
        })

        return Object.fromEntries(
          Object.entries(value).map(([entryKey, entryValue]) => [
            entryKey,
            entryKey === 'messages' ? normalizedMessages : this.normalizeRequestValue(entryValue, entryKey),
          ]),
        )
      }

      return Object.fromEntries(
        Object.entries(value).map(([entryKey, entryValue]) => [
          entryKey,
          this.normalizeRequestValue(entryValue, entryKey),
        ]),
      )
    }

    return value
  }

  private computeRequestHash(provider: LLMProvider, url: string, method: string, requestBody: any): string {
    // Normalize url: for some providers, query params (e.g. cache busters) should not affect matching.
    const normalizedUrl = url.split('?')[0]
    const normalizedBody = this.normalizeRequestValue(requestBody)

    const payload = `${provider}|${method}|${normalizedUrl}|${this.stableStringify(normalizedBody)}`
    return crypto.createHash('sha256').update(payload).digest('hex')
  }

  private rewriteReplayImageEntry(value: any): any {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return value
    }

    if (
      typeof value.b64 === 'string' ||
      typeof value.b64_json === 'string' ||
      typeof value.base64 === 'string'
    ) {
      return value
    }

    const rawUrl = typeof value.url === 'string' ? value.url.trim() : ''
    if (!HTTP_URL_RE.test(rawUrl)) {
      return value
    }

    return {
      ...value,
      url: REPLAY_PLACEHOLDER_DATA_URL,
    }
  }

  private rewriteReplayImageGenerationPayload(value: any): any {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return value
    }

    let changed = false
    const next = { ...value }

    for (const key of ['images', 'data']) {
      const items = (value as Record<string, any>)[key]
      if (!Array.isArray(items)) {
        continue
      }

      const rewrittenItems = items.map((item) => {
        const rewrittenItem = this.rewriteReplayImageEntry(item)
        if (rewrittenItem !== item) {
          changed = true
        }
        return rewrittenItem
      })

      next[key] = rewrittenItems
    }

    return changed ? next : value
  }

  private getReplayFulfillBody(interaction: VCRInteraction): string {
    const contentType = interaction.responseHeaders?.['content-type'] || 'application/json'
    if (!/[/+]json\b/i.test(contentType)) {
      return interaction.rawBody || ''
    }

    const parsedBody =
      interaction.responseBody && typeof interaction.responseBody === 'object'
        ? interaction.responseBody
        : (() => {
            try {
              return JSON.parse(interaction.rawBody || '')
            } catch {
              return null
            }
          })()

    if (!parsedBody) {
      return interaction.rawBody || ''
    }

    const rewrittenBody = this.rewriteReplayImageGenerationPayload(parsedBody)
    if (rewrittenBody === parsedBody && interaction.rawBody) {
      return interaction.rawBody
    }

    return JSON.stringify(rewrittenBody)
  }

  private normalizeFixture(fixture: VCRFixture | null): VCRFixture {
    if (fixture && Array.isArray((fixture as any).interactions)) {
      // Backward compat: older multi-interaction fixtures stored rawSSE.
      const interactions = (fixture as any).interactions as any[]
      for (const it of interactions) {
        if (typeof it.rawBody === 'undefined' && typeof it.rawSSE !== 'undefined') {
          it.rawBody = it.rawSSE
          it.responseHeaders = it.responseHeaders || { 'content-type': 'text/event-stream' }
          delete it.rawSSE
        }

        const normalizedMethod = typeof it.method === 'string' && it.method ? it.method : 'POST'
        const normalizedRequestBody = this.normalizeRequestValue(it.requestBody)

        it.method = normalizedMethod
        it.requestBody = normalizedRequestBody
        it.requestHash = this.computeRequestHash(it.provider, it.url, normalizedMethod, normalizedRequestBody)
        it.status = Number(it.status ?? 200)
      }
      return fixture
    }

    // Legacy single-interaction fixtures: normalize into interactions[].
    if (fixture && (fixture as any).rawSSE) {
      const legacyProvider = (fixture as any).provider as LLMProvider
      const legacyUrl = (fixture as any).url as string
      const legacyRequestBody = this.normalizeRequestValue((fixture as any).requestBody)
      const legacyMethod = 'POST'
      const legacyRequestHash = this.computeRequestHash(legacyProvider, legacyUrl, legacyMethod, legacyRequestBody)

      const rawBody = String((fixture as any).rawSSE || '')

      return {
        testName: fixture.testName,
        testCase: fixture.testCase,
        interactions: [
          {
            provider: legacyProvider,
            url: legacyUrl,
            method: legacyMethod,
            requestBody: legacyRequestBody,
            requestHash: legacyRequestHash,
            rawBody,
            responseHeaders: { 'content-type': 'text/event-stream' },
            responseBody: (fixture as any).responseBody,
            duration: Number((fixture as any).duration ?? 0),
            status: 200,
          },
        ],
      }
    }

    return {
      testName: this.currentTestName,
      testCase: this.currentTestCase,
      interactions: [],
    }
  }

  private async writeFixture(fixture: VCRFixture): Promise<void> {
    const fixturePath = this.getFixturePath()

    await fs.mkdir(path.dirname(fixturePath), { recursive: true })
    await fs.writeFile(fixturePath, JSON.stringify(fixture, null, 2), 'utf-8')

    const relativePath = path.relative(process.cwd(), fixturePath)
    console.log(`[VCR] ✅ Fixture saved: ${relativePath}`)
  }

  async saveFixture(
    provider: LLMProvider,
    url: string,
    requestBody: any,
    responseBody: any,
    duration: number,
    rawBody: string,
    responseHeaders: Record<string, string>,
    method: string,
    status: number
  ): Promise<void> {
    if (!this.recordingEnabled) return

    const requestHash = this.computeRequestHash(provider, url, method, requestBody)

    const existing = this.normalizeFixture(await this.loadFixture())
    const fixture: VCRFixture = {
      testName: existing.testName || this.currentTestName,
      testCase: existing.testCase || this.currentTestCase,
      interactions: [...existing.interactions],
    }

    const sanitizedBody = this.normalizeRequestValue(requestBody)

    fixture.interactions.push({
      provider,
      url,
      method,
      requestBody: sanitizedBody,
      requestHash,
      rawBody,
      responseHeaders,
      responseBody,
      duration,
      status,
    })

    try {
      await this.writeFixture(fixture)
    } catch (error) {
      console.error(`[VCR] ❌ Failed to save fixture:`, error)
    }
  }

  /**
   * 加载 fixture
   */
  async loadFixture(): Promise<VCRFixture | null> {
    const fixturePath = this.getFixturePath()

    try {
      const content = await fs.readFile(fixturePath, 'utf-8')
      const fixture: VCRFixture = JSON.parse(content)

      const relativePath = path.relative(process.cwd(), fixturePath)
      const count = Array.isArray((fixture as any).interactions) ? (fixture as any).interactions.length : 1
      console.log(`[VCR] ♻️  Replaying fixture (${count} interaction(s)): ${relativePath}`)

      return fixture
    } catch {
      return null
    }
  }

  private async loadFixtureNormalized(): Promise<VCRFixture> {
    const raw = await this.loadFixture()
    return this.normalizeFixture(raw)
  }

  private async writeMismatchDebugArtifact(payload: {
    requestHash: string
    provider: LLMProvider
    url: string
    method: string
    requestBody: any
    fixture: VCRFixture
  }): Promise<string | null> {
    try {
      const debugDir = path.join(process.cwd(), 'test-results', 'vcr-debug')
      await fs.mkdir(debugDir, { recursive: true })

      const filename = `${this.sanitizeFilename(this.currentTestName)}-${this.sanitizeFilename(this.currentTestCase)}-mismatch.json`
      const debugPath = path.join(debugDir, filename)

      const candidateInteractions = payload.fixture.interactions
        .filter((interaction) => interaction.provider === payload.provider && interaction.method === payload.method && interaction.url.split('?')[0] === payload.url.split('?')[0])
        .map((interaction, index) => ({
          index,
          requestHash: interaction.requestHash,
          requestBody: interaction.requestBody,
        }))

      await fs.writeFile(
        debugPath,
        JSON.stringify(
          {
            testName: this.currentTestName,
            testCase: this.currentTestCase,
            requestHash: payload.requestHash,
            provider: payload.provider,
            url: payload.url,
            method: payload.method,
            requestBody: payload.requestBody,
            candidateInteractions,
          },
          null,
          2,
        ),
        'utf-8',
      )

      return path.relative(process.cwd(), debugPath)
    } catch {
      return null
    }
  }

  private findReplayInteraction(fixture: VCRFixture, requestHash: string): VCRInteraction | null {
    const consumedCount = this.replayConsumedByHash.get(requestHash) ?? 0
    const candidates = fixture.interactions.filter((it) => it.requestHash === requestHash)
    const matched = candidates[consumedCount] ?? null
    if (!matched) return null

    this.replayConsumedByHash.set(requestHash, consumedCount + 1)
    return matched
  }

  /**
   * 设置路由拦截
   */
  async setupRoutes(page: Page) {
    const { mode } = this.config

    // live 模式：不拦截
    if (mode === 'live') {
      return
    }

    // 拦截所有 LLM API 提供商的请求
    const apiPatterns = [
      /https:\/\/api\.openai\.com\/.*/,
      /https:\/\/api\.deepseek\.com\/.*/,
      /https:\/\/api\.anthropic\.com\/.*/,
      /https:\/\/generativelanguage\.googleapis\.com\/.*/,
      /https:\/\/open\.bigmodel\.cn\/.*/,
      /https:\/\/.*\.modelscope\.cn\/.*/,
      /https:\/\/api\.siliconflow\.cn\/.*/,
      /https:\/\/dashscope\.aliyuncs\.com\/.*/,
    ]

    for (const pattern of apiPatterns) {
      await page.route(pattern, async (route: Route) => {
        const request = route.request()
        const url = request.url()
        const method = request.method()

        // 只拦截 POST 请求
        if (method !== 'POST') {
          await route.continue()
          return
        }

        const provider = this.identifyProvider(url)
        if (!provider) {
          await route.continue()
          return
        }

        // Register the handler itself so flushRecordings() can await a recording that
        // outlives the test body (see pendingRecordings).
        let settle: () => void = () => {}
        if (this.recordingEnabled) {
          this.trackRecording(new Promise<void>((resolve) => { settle = resolve }))
        }

        try {
          const requestBody = await request.postData()

          if (this.recordingEnabled) {
            // 标记：本测试确实触发了需要录制的 LLM 请求。
            // teardown 阶段据此判断“该录却没录成”，避免把根本不发请求的用例误判为录制失败。
            getRecordAttemptStore().value = true
            // record 模式：调用真实 API 并保存
            const startTime = Date.now()
            const response = await this.fetchLiveResponseWithRetry(
              provider,
              url,
              method,
              request.headers(),
              requestBody,
            )
            const endTime = Date.now()
            const responseBody = response.body

            // 录制时如果返回 4xx/5xx，直接跳过保存 fixture，避免把错误响应录进去
            if (response.status >= 400) {
              const headers = { ...response.headers }
              // route.fetch() 已经解码了 body；若保留 content-encoding/content-length 等头会导致浏览器二次解码/长度不匹配
              delete (headers as any)['content-encoding']
              delete (headers as any)['content-length']
              delete (headers as any)['transfer-encoding']

              await route.fulfill({
                status: response.status,
                headers: {
                  ...headers,
                  'access-control-allow-origin': '*',
                  'access-control-allow-headers': '*',
                },
                body: responseBody
              })
              return
            }

            // 图像生成等非 SSE：直接按原始响应回放（避免强行合成 SSE 破坏语义）
            const contentType = response.headers['content-type'] || ''
            const isImageResponse = /\bimage\//i.test(contentType)
            const isSSE = /\btext\/event-stream\b/i.test(contentType)

            if (!isSSE && (isImageResponse || /\/images\//i.test(url))) {
              await this.saveFixture(
                provider,
                url,
                JSON.parse(requestBody || '{}'),
                null,
                endTime - startTime,
                responseBody,
                { 'content-type': contentType || 'application/octet-stream' },
                method,
                response.status
              )

              const headers = { ...response.headers }
              delete (headers as any)['content-encoding']
              delete (headers as any)['content-length']
              delete (headers as any)['transfer-encoding']

              await route.fulfill({
                status: response.status,
                headers: {
                  ...headers,
                  'access-control-allow-origin': '*',
                  'access-control-allow-headers': '*',
                },
                body: responseBody
              })
              return
            }

            const hasSSE = /(^|\n)\s*data:\s*/.test(responseBody)

            let rawBody = responseBody
            let responseContentType = contentType || 'application/json'
            let responseJson: any = null

            if (hasSSE) {
              // 解析 SSE 响应，提取完整内容（OpenAI 兼容格式）
              const lines = responseBody
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('data:'))

              let fullContent = ''
              let lastChunk: any = null

              for (const line of lines) {
                const jsonStr = line.replace(/^data:\s*/, '').trim()
                if (!jsonStr || jsonStr === '[DONE]') continue

                try {
                  const chunk = JSON.parse(jsonStr)
                  lastChunk = chunk
                  if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
                    fullContent += chunk.choices[0].delta.content || ''
                  }
                } catch {
                  // 忽略解析错误
                }
              }

              if (lastChunk) {
                responseJson = {
                  ...lastChunk,
                  choices: [{
                    ...lastChunk.choices?.[0],
                    message: {
                      role: 'assistant',
                      content: fullContent
                    }
                  }]
                }
              }

              rawBody = responseBody
              responseContentType = 'text/event-stream'
            } else {
              // 非 SSE 响应：保持原始 JSON 载荷与 content-type，确保 record/replay 语义一致。
              try {
                responseJson = JSON.parse(responseBody)
              } catch {
                responseJson = null
              }
            }

              await this.saveFixture(
                provider,
                url,
                JSON.parse(requestBody || '{}'),
                responseJson,
                endTime - startTime,
                rawBody,
                {
                  'content-type': responseContentType,
                },
                method,
                response.status
              )

              // 返回真实响应（补齐 CORS，避免浏览器端 fetch 被拦）
            const headers = { ...response.headers }
            // route.fetch() 已经解码了 body；若保留 content-encoding/content-length 等头会导致浏览器二次解码/长度不匹配
            delete (headers as any)['content-encoding']
            delete (headers as any)['content-length']
            delete (headers as any)['transfer-encoding']

            // 对于 stream=true 的请求，确保 content-type 为 SSE
            if (hasSSE) {
              headers['content-type'] = 'text/event-stream'
            }

            await route.fulfill({
              status: response.status,
              headers: {
                ...headers,
                'access-control-allow-origin': '*',
                'access-control-allow-headers': '*',
              },
              body: responseBody
            })
          } else {
            // replay 模式：使用 fixture（支持同一个测试内多次请求，通过 requestHash 精准匹配）
            const fixture = await this.loadFixtureNormalized()
            const parsedRequestBody = JSON.parse(requestBody || '{}')
            const requestHash = this.computeRequestHash(provider, url, method, parsedRequestBody)
            const interaction = this.findReplayInteraction(fixture, requestHash)

            if (interaction) {
              // 直接返回原始 SSE 文本（格式完全一致）
              const contentType = interaction.responseHeaders?.['content-type'] || 'application/json'
              const isSSE = /text\/event-stream/i.test(contentType)
              const responseBody = isSSE
                ? interaction.rawBody || ''
                : this.getReplayFulfillBody(interaction)

              await route.fulfill({
                status: interaction.status || 200,
                headers: {
                  'content-type': contentType,
                  ...(isSSE
                    ? {
                        'cache-control': 'no-cache',
                        'connection': 'keep-alive',
                      }
                    : {}),
                  // 关键：避免浏览器端 fetch 因 CORS 直接失败
                  'access-control-allow-origin': '*',
                  'access-control-allow-headers': '*',
                },
                body: responseBody
              })
            } else {
              const shouldFailFast = mode === 'replay' || !this.recordingEnabled

              if (shouldFailFast) {
                const debugArtifact = await this.writeMismatchDebugArtifact({
                  requestHash,
                  provider,
                  url: url.split('?')[0],
                  method,
                  requestBody: parsedRequestBody,
                  fixture,
                })
                const errorMsg =
                  `[VCR] ❌ Fixture interaction not found for test: ${this.currentTestName} - ${this.currentTestCase}\n` +
                  `Request hash: ${requestHash} (${provider} ${method} ${url.split('?')[0]})\n` +
                  `A fixture file already exists for this test, but it does not match the current request.\n` +
                  `${debugArtifact ? `Debug artifact: ${debugArtifact}\n` : ''}` +
                  `Run with E2E_VCR_MODE=record to refresh it.`

                getVCRFailureStore().value = errorMsg
                console.error(errorMsg)
                await route.fulfill({
                  status: 400,
                  headers: {
                    'content-type': 'application/json',
                    'access-control-allow-origin': '*',
                    'access-control-allow-headers': '*',
                  },
                  body: JSON.stringify({
                    error: {
                      type: 'invalid_request_error',
                      code: 'vcr_fixture_mismatch',
                      message: errorMsg,
                    },
                  }),
                })
              } else {
                // auto 模式且当前测试尚无 fixture：允许退回真实 API，以便首次录制
                console.log(
                  `[VCR] ⚠️  No fixture for requestHash=${requestHash} (${provider} ${method} ${url.split('?')[0]}), calling real API`,
                )
                await route.continue()
              }
            }
          }
        } catch (error) {
          console.error(`[VCR] Error:`, error)
          await route.continue()
        } finally {
          settle()
        }
      })
    }
  }
}

/**
 * 获取 VCR 实例（每次调用创建新实例，支持并行测试）
 */
export function getVCR(): E2EVCR {
  const mode = (process.env.E2E_VCR_MODE as VCRMode) || 'auto'
  const fixtureDir = process.env.E2E_VCR_FIXTURE_DIR || 'tests/e2e/fixtures/vcr'

  return new E2EVCR({ mode, fixtureDir })
}

/**
 * 为测试设置 VCR
 */
export async function setupVCRForTest(page: Page, testName: string, testCase: string) {
  const vcr = getVCR()
  await vcr.setTestContext(testName, testCase)
  await vcr.setupRoutes(page)
  return vcr
}
