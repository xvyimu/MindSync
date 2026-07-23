/**
 * Platform-agnostic SecretCodec factories (Tauri / non-Electron desktop).
 *
 * Semantic parity with packages/desktop/config/safe-storage-secrets.js
 * (`createElectronSafeStorageCodec`):
 * - isAvailable() false when backend missing or encryption probe fails
 * - encrypt/decrypt throw when unavailable (never silently "encrypt")
 * - encrypt returns base64 payload (no `__enc:v1:` prefix — that is sealSecretField)
 *
 * Disk marker remains `__enc:v1:<payload>` (see secret-field.ts).
 *
 * Windows notes (trade-offs):
 * - Preferred long-term: OS-bound crypto via Tauri/Rust (`keyring` crate or
 *   `CryptProtectData` / DPAPI). Same user-session binding as Electron intent.
 * - Optional Node native (`@primno/dpapi` / similar) can be injected as backend
 *   for Node-side tooling; not a hard dependency of @mindsync/core.
 * - Electron safeStorage on Windows uses Chromium OSCrypt (DPAPI + app-specific
 *   key material). Raw DPAPI / keyring payloads are NOT byte-compatible with
 *   Electron `__enc:v1:` blobs. Cross-shell migration = export (includeSecrets)
 *   then import, or dual-shell cutover with legacyDecryptBackends while Electron
 *   is still present.
 */

import type { ISecretCodec } from './secret-field'

/** Low-level crypto surface (Electron safeStorage-shaped or OS/native). */
export interface SecretCodecBackend {
  isEncryptionAvailable(): boolean
  /**
   * Encrypt plaintext. May return Buffer/Uint8Array (base64-encoded by factory)
   * or a pre-encoded base64/string payload.
   */
  encryptString(plain: string): Buffer | Uint8Array | string
  /**
   * Decrypt payload produced by encryptString. When factory stores base64,
   * backend receives a Buffer of decoded bytes (Electron-compatible).
   */
  decryptString(payload: Buffer | Uint8Array | string): string
}

export type SecretCodecWarn = (message: string, ...args: unknown[]) => void

export interface CreatePlatformSecretCodecOptions {
  /** Primary backend (write + first decrypt attempt). */
  backend?: SecretCodecBackend | null
  /**
   * Tried in order when `backend` is omitted/null.
   * First provider that returns a backend with isEncryptionAvailable() wins.
   */
  backendProviders?: Array<() => SecretCodecBackend | null | undefined>
  /**
   * Decrypt-only fallbacks (e.g. Electron safeStorage during cutover).
   * Never used for encrypt.
   */
  legacyDecryptBackends?: Array<SecretCodecBackend | null | undefined>
  /** Logger for unavailability (default: console.warn once). */
  warn?: SecretCodecWarn
  /**
   * When true (default), log once if no encryption backend is available —
   * mirrors Desktop "safeStorage unavailable — keys remain plaintext".
   */
  warnWhenUnavailable?: boolean
  /** Override platform detection (tests). Default: process.platform when present. */
  platform?: string
}

function toBuffer(data: Buffer | Uint8Array | string): Buffer {
  if (typeof data === 'string') {
    // Treat as already-base64 only at factory boundary; backends usually return bytes.
    return Buffer.from(data, 'utf8')
  }
  return Buffer.from(data)
}

function payloadToBase64(data: Buffer | Uint8Array | string): string {
  if (typeof data === 'string') {
    // Allow backends that already return base64 strings (no binary).
    // Heuristic: if it is valid base64 of non-empty and re-encodes stably, keep;
    // otherwise utf8→base64 so round-trip stays defined.
    try {
      const buf = Buffer.from(data, 'base64')
      if (buf.length > 0 && buf.toString('base64') === data.replace(/\s+/g, '')) {
        return data.replace(/\s+/g, '')
      }
    } catch {
      // fall through
    }
    return Buffer.from(data, 'utf8').toString('base64')
  }
  return Buffer.from(data).toString('base64')
}

/**
 * Build ISecretCodec from a safeStorage-shaped backend.
 * Same contract as createElectronSafeStorageCodec.
 */
export function createSecretCodecFromBackend(
  backend: SecretCodecBackend | null | undefined,
): ISecretCodec {
  const api = backend || null

  const isAvailable = (): boolean => {
    try {
      return !!(
        api &&
        typeof api.isEncryptionAvailable === 'function' &&
        api.isEncryptionAvailable()
      )
    } catch {
      return false
    }
  }

  return {
    isAvailable,
    encrypt(plain: string) {
      if (
        !api ||
        typeof api.encryptString !== 'function' ||
        !isAvailable()
      ) {
        // Same spirit as Electron adapter: never write a "fake" ciphertext.
        throw new Error('SecretCodec.encrypt is not available')
      }
      const encrypted = api.encryptString(String(plain))
      return payloadToBase64(encrypted)
    },
    decrypt(payload: string) {
      if (
        !api ||
        typeof api.decryptString !== 'function' ||
        !isAvailable()
      ) {
        throw new Error('SecretCodec.decrypt is not available')
      }
      const buf = Buffer.from(String(payload), 'base64')
      return api.decryptString(buf)
    },
  }
}

/**
 * Explicitly unavailable codec — never pretends to encrypt.
 * encrypt/decrypt throw; isAvailable is false.
 */
export function createUnavailableSecretCodec(
  reason = 'Secret encryption backend unavailable',
): ISecretCodec {
  return {
    isAvailable: () => false,
    encrypt() {
      throw new Error(reason)
    },
    decrypt() {
      throw new Error(reason)
    },
  }
}

/**
 * Write with primary codec; decrypt tries primary then legacy backends.
 * Disk format stays `__enc:v1:` + base64 payload (handled by seal/open).
 */
export function createCompositeSecretCodec(
  primary: ISecretCodec,
  legacyDecryptCodecs: ISecretCodec[] = [],
): ISecretCodec {
  const legacies = legacyDecryptCodecs.filter(Boolean)

  return {
    isAvailable() {
      return primary.isAvailable()
    },
    encrypt(plain: string) {
      return primary.encrypt(plain)
    },
    decrypt(payload: string) {
      if (primary.isAvailable()) {
        try {
          return primary.decrypt(payload)
        } catch {
          // try legacies
        }
      }
      for (const legacy of legacies) {
        if (!legacy.isAvailable()) continue
        try {
          return legacy.decrypt(payload)
        } catch {
          // continue
        }
      }
      if (!primary.isAvailable() && legacies.every((c) => !c.isAvailable())) {
        throw new Error('SecretCodec.decrypt is not available')
      }
      throw new Error('SecretCodec.decrypt failed for all backends')
    },
  }
}

function resolveBackend(
  options: CreatePlatformSecretCodecOptions,
): SecretCodecBackend | null {
  if (options.backend) {
    try {
      if (options.backend.isEncryptionAvailable()) {
        return options.backend
      }
    } catch {
      // fall through to providers
    }
  }

  for (const provider of options.backendProviders || []) {
    try {
      const candidate = provider()
      if (!candidate) continue
      if (candidate.isEncryptionAvailable()) {
        return candidate
      }
    } catch {
      // next provider
    }
  }

  return null
}

/**
 * Prefer injected/OS backend; otherwise unavailable (warn, no fake encryption).
 * Optionally compose legacy decrypt backends for cutover.
 */
export function createPlatformSecretCodec(
  options: CreatePlatformSecretCodecOptions = {},
): ISecretCodec {
  const warn: SecretCodecWarn =
    options.warn || ((msg, ...args) => console.warn(msg, ...args))
  const warnWhenUnavailable = options.warnWhenUnavailable !== false

  const backend = resolveBackend(options)
  const primary = createSecretCodecFromBackend(backend)

  const legacyCodecs = (options.legacyDecryptBackends || [])
    .filter((b): b is SecretCodecBackend => !!b)
    .map((b) => createSecretCodecFromBackend(b))

  const codec =
    legacyCodecs.length > 0
      ? createCompositeSecretCodec(primary, legacyCodecs)
      : primary

  if (!codec.isAvailable() && warnWhenUnavailable) {
    const platform =
      options.platform ||
      (typeof process !== 'undefined' && process.platform) ||
      'unknown'
    warn(
      `[SecretCodec] Encryption unavailable on ${platform} — model API keys remain plaintext on disk (same as Electron safeStorage unavailable)`,
    )
  }

  return codec
}

/**
 * Soft-load optional Node DPAPI module if present.
 * Never a hard dependency — returns null when module missing or not Windows.
 *
 * Supported shapes (first match):
 * - `@primno/dpapi`: { protect(data: Buffer, scope: string): Buffer, unprotect(...) }
 * - `{ protectUser(data: Buffer): Buffer, unprotectUser(data: Buffer): Buffer }`
 * - `{ encrypt(plain: string): Buffer, decrypt(buf: Buffer): string }`
 */
export function tryCreateNodeDpapiBackend(
  requireFn?: (id: string) => unknown,
  platform?: string,
): SecretCodecBackend | null {
  const plat =
    platform ||
    (typeof process !== 'undefined' ? process.platform : 'unknown')
  if (plat !== 'win32') {
    return null
  }

  const req =
    requireFn ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((id: string) => {
      // Dynamic require so bundlers / pure ESM tests do not hard-fail.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(id)
    })

  const candidates = ['@primno/dpapi', 'node-dpapi-prebuilt', 'node-dpapi']

  for (const id of candidates) {
    try {
      const mod = req(id) as Record<string, unknown>
      const api = (mod && typeof mod === 'object' && 'default' in mod
        ? (mod.default as Record<string, unknown>)
        : mod) as Record<string, unknown>

      if (
        typeof api.protect === 'function' &&
        typeof api.unprotect === 'function'
      ) {
        const protect = api.protect as (
          data: Buffer,
          scope?: string,
        ) => Buffer
        const unprotect = api.unprotect as (
          data: Buffer,
          scope?: string,
        ) => Buffer
        return {
          isEncryptionAvailable: () => true,
          encryptString(plain: string) {
            return protect(Buffer.from(String(plain), 'utf8'), 'CurrentUser')
          },
          decryptString(payload: Buffer | Uint8Array | string) {
            const buf = toBuffer(payload as Buffer | Uint8Array)
            return unprotect(buf, 'CurrentUser').toString('utf8')
          },
        }
      }

      if (
        typeof api.protectUser === 'function' &&
        typeof api.unprotectUser === 'function'
      ) {
        const protectUser = api.protectUser as (data: Buffer) => Buffer
        const unprotectUser = api.unprotectUser as (data: Buffer) => Buffer
        return {
          isEncryptionAvailable: () => true,
          encryptString(plain: string) {
            return protectUser(Buffer.from(String(plain), 'utf8'))
          },
          decryptString(payload: Buffer | Uint8Array | string) {
            const buf = toBuffer(payload as Buffer | Uint8Array)
            return unprotectUser(buf).toString('utf8')
          },
        }
      }

      if (
        typeof api.encrypt === 'function' &&
        typeof api.decrypt === 'function'
      ) {
        const encrypt = api.encrypt as (plain: string) => Buffer | string
        const decrypt = api.decrypt as (
          data: Buffer | string,
        ) => string
        return {
          isEncryptionAvailable: () => true,
          encryptString(plain: string) {
            return encrypt(String(plain))
          },
          decryptString(payload: Buffer | Uint8Array | string) {
            if (typeof payload === 'string') {
              return decrypt(payload)
            }
            return decrypt(toBuffer(payload))
          },
        }
      }
    } catch {
      // module not installed or load failed — try next
    }
  }

  return null
}

/**
 * Convenience: Windows prefers optional Node DPAPI if present; else inject
 * Tauri/Rust backend via options.backend. Non-Windows without backend → unavailable.
 */
export function createDesktopShellSecretCodec(
  options: CreatePlatformSecretCodecOptions = {},
): ISecretCodec {
  const platform =
    options.platform ||
    (typeof process !== 'undefined' ? process.platform : 'unknown')

  const providers = [...(options.backendProviders || [])]
  if (platform === 'win32') {
    providers.push(() => tryCreateNodeDpapiBackend(undefined, platform))
  }

  return createPlatformSecretCodec({
    ...options,
    platform,
    backendProviders: providers,
  })
}
