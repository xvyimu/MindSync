/**
 * Platform SecretCodec: mock round-trip, unavailable semantics, __enc:v1: compat.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  SECRET_FIELD_PREFIX,
  sealSecretField,
  openSecretField,
  isEncryptedSecretField,
  sealStorageValue,
  openStorageValue,
} from '../../../src/services/storage/secret-field'
import {
  createSecretCodecFromBackend,
  createUnavailableSecretCodec,
  createCompositeSecretCodec,
  createPlatformSecretCodec,
  createDesktopShellSecretCodec,
  tryCreateNodeDpapiBackend,
  type SecretCodecBackend,
} from '../../../src/services/storage/secret-codec-platform'

function mockBackend(tag = 'A'): SecretCodecBackend {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (plain: string) =>
      Buffer.from(`${tag}(${plain})`, 'utf8'),
    decryptString: (buf: Buffer | Uint8Array | string) => {
      const s = Buffer.isBuffer(buf)
        ? buf.toString('utf8')
        : typeof buf === 'string'
          ? buf
          : Buffer.from(buf).toString('utf8')
      const m = new RegExp(`^${tag}\\((.*)\\)$`).exec(s)
      if (!m) throw new Error(`bad payload for ${tag}`)
      return m[1]
    },
  }
}

describe('createSecretCodecFromBackend', () => {
  it('reports unavailable when backend missing', () => {
    const codec = createSecretCodecFromBackend(null)
    expect(codec.isAvailable()).toBe(false)
  })

  it('encrypt/decrypt round-trip with mock backend (Electron-shaped)', () => {
    const codec = createSecretCodecFromBackend(mockBackend())
    expect(codec.isAvailable()).toBe(true)
    const payload = codec.encrypt('sk-test-123')
    expect(typeof payload).toBe('string')
    expect(payload).not.toContain('sk-test-123')
    expect(codec.decrypt(payload)).toBe('sk-test-123')
  })

  it('isAvailable false when isEncryptionAvailable throws', () => {
    const codec = createSecretCodecFromBackend({
      isEncryptionAvailable: () => {
        throw new Error('boom')
      },
      encryptString: () => Buffer.alloc(0),
      decryptString: () => '',
    })
    expect(codec.isAvailable()).toBe(false)
  })

  it('encrypt throws when unavailable — never fakes ciphertext', () => {
    const codec = createSecretCodecFromBackend({
      isEncryptionAvailable: () => false,
      encryptString: () => Buffer.from('should-not-run'),
      decryptString: () => 'nope',
    })
    expect(codec.isAvailable()).toBe(false)
    expect(() => codec.encrypt('secret')).toThrow(/not available/)
  })
})

describe('createUnavailableSecretCodec', () => {
  it('never reports available and throws on encrypt/decrypt', () => {
    const codec = createUnavailableSecretCodec('no backend')
    expect(codec.isAvailable()).toBe(false)
    expect(() => codec.encrypt('x')).toThrow(/no backend/)
    expect(() => codec.decrypt('y')).toThrow(/no backend/)
  })
})

describe('createCompositeSecretCodec + __enc:v1:', () => {
  it('writes with primary and can decrypt legacy payloads', () => {
    const primary = createSecretCodecFromBackend(mockBackend('NEW'))
    const legacy = createSecretCodecFromBackend(mockBackend('OLD'))
    const composite = createCompositeSecretCodec(primary, [legacy])

    const newPayload = composite.encrypt('sk-new')
    expect(composite.decrypt(newPayload)).toBe('sk-new')

    // legacy-only ciphertext still opens
    const oldPayload = legacy.encrypt('sk-old')
    expect(composite.decrypt(oldPayload)).toBe('sk-old')
  })

  it('seal/open round-trip keeps __enc:v1: prefix strategy', () => {
    const codec = createSecretCodecFromBackend(mockBackend('TAURI'))
    const sealed = sealSecretField('sk-live', codec)
    expect(typeof sealed).toBe('string')
    expect(isEncryptedSecretField(sealed)).toBe(true)
    expect(String(sealed).startsWith(SECRET_FIELD_PREFIX)).toBe(true)
    expect(openSecretField(sealed, codec)).toBe('sk-live')
  })

  it('openStorageValue reads legacy __enc:v1: blob via composite', () => {
    const primary = createSecretCodecFromBackend(mockBackend('NEW'))
    const legacy = createSecretCodecFromBackend(mockBackend('OLD'))
    const composite = createCompositeSecretCodec(primary, [legacy])

    // Simulate disk written by old shell
    const oldSealed = sealSecretField('legacy-key', legacy) as string
    const disk = JSON.stringify({
      m1: { connectionConfig: { apiKey: oldSealed } },
    })

    const opened = openStorageValue('models', disk, composite)!
    expect(JSON.parse(opened).m1.connectionConfig.apiKey).toBe('legacy-key')
  })

  it('sealStorageValue does not write marker when codec unavailable', () => {
    const codec = createUnavailableSecretCodec()
    const plain = JSON.stringify({
      m1: { connectionConfig: { apiKey: 'plain-key' } },
    })
    const sealed = sealStorageValue('models', plain, codec)
    expect(sealed).toContain('plain-key')
    expect(sealed).not.toContain(SECRET_FIELD_PREFIX)
  })
})

describe('createPlatformSecretCodec', () => {
  it('uses injected backend when available', () => {
    const codec = createPlatformSecretCodec({
      backend: mockBackend('OS'),
      warnWhenUnavailable: false,
    })
    expect(codec.isAvailable()).toBe(true)
    expect(codec.decrypt(codec.encrypt('k'))).toBe('k')
  })

  it('warns once path when unavailable (Electron-parity)', () => {
    const warn = vi.fn()
    const codec = createPlatformSecretCodec({
      backend: null,
      warn,
      platform: 'win32',
    })
    expect(codec.isAvailable()).toBe(false)
    expect(warn).toHaveBeenCalled()
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/unavailable/i)
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/plaintext/i)
  })

  it('picks first available backendProvider', () => {
    const codec = createPlatformSecretCodec({
      backendProviders: [
        () => null,
        () => ({
          isEncryptionAvailable: () => false,
          encryptString: () => Buffer.alloc(0),
          decryptString: () => '',
        }),
        () => mockBackend('P3'),
      ],
      warnWhenUnavailable: false,
    })
    expect(codec.isAvailable()).toBe(true)
    expect(codec.decrypt(codec.encrypt('via-p3'))).toBe('via-p3')
  })

  it('composes legacyDecryptBackends for cutover', () => {
    const codec = createPlatformSecretCodec({
      backend: mockBackend('NEW'),
      legacyDecryptBackends: [mockBackend('OLD')],
      warnWhenUnavailable: false,
    })
    const oldOnly = createSecretCodecFromBackend(mockBackend('OLD'))
    const oldPayload = oldOnly.encrypt('from-electron')
    expect(codec.decrypt(oldPayload)).toBe('from-electron')
  })
})

describe('tryCreateNodeDpapiBackend / createDesktopShellSecretCodec', () => {
  it('returns null on non-windows', () => {
    expect(
      tryCreateNodeDpapiBackend(() => {
        throw new Error('should not load')
      }, 'linux'),
    ).toBeNull()
  })

  it('returns null when optional modules missing', () => {
    expect(
      tryCreateNodeDpapiBackend(() => {
        throw new Error('Cannot find module')
      }, 'win32'),
    ).toBeNull()
  })

  it('adapts @primno/dpapi-shaped module', () => {
    const backend = tryCreateNodeDpapiBackend((id) => {
      if (id !== '@primno/dpapi') throw new Error('nope')
      return {
        protect: (data: Buffer) =>
          Buffer.from(`DPAPI(${data.toString('utf8')})`, 'utf8'),
        unprotect: (data: Buffer) => {
          const s = data.toString('utf8')
          const m = /^DPAPI\((.*)\)$/.exec(s)
          if (!m) throw new Error('bad')
          return Buffer.from(m[1], 'utf8')
        },
      }
    }, 'win32')
    expect(backend).not.toBeNull()
    const codec = createSecretCodecFromBackend(backend)
    expect(codec.decrypt(codec.encrypt('win-secret'))).toBe('win-secret')
  })

  it('createDesktopShellSecretCodec stays unavailable without backend (no fake)', () => {
    const warn = vi.fn()
    const codec = createDesktopShellSecretCodec({
      platform: 'linux',
      backendProviders: [],
      warn,
      // prevent real optional require noise
      backend: null,
    })
    expect(codec.isAvailable()).toBe(false)
    expect(() => codec.encrypt('x')).toThrow()
  })
})
