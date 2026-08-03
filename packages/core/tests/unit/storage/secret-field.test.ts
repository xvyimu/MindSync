/**
 * Cut+1：敏感字段 seal/open 与 SecretAwareStorageProvider
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorageProvider } from '../../../src/services/storage/memoryStorageProvider'
import {
  SECRET_FIELD_PREFIX,
  PassthroughSecretCodec,
  isEncryptedSecretField,
  sealSecretField,
  openSecretField,
  transformModelMapSecrets,
  sealStorageValue,
  openStorageValue,
  shouldProtectStorageKey,
} from '../../../src/services/storage/secret-field'
import {
  SecretAwareStorageProvider,
  createSecretAwareStorageProvider,
} from '../../../src/services/storage/secret-aware-storage'
import { CORE_SERVICE_KEYS } from '../../../src/constants/storage-keys'

/** 可测的假 codec：可开关 available */
class FakeCodec {
  constructor(private available = true) {}
  isAvailable() {
    return this.available
  }
  encrypt(plain: string) {
    return Buffer.from(`E:${plain}`, 'utf8').toString('base64')
  }
  decrypt(payload: string) {
    const raw = Buffer.from(payload, 'base64').toString('utf8')
    if (!raw.startsWith('E:')) throw new Error('bad')
    return raw.slice(2)
  }
}

describe('secret-field helpers', () => {
  it('detects encrypted marker', () => {
    expect(isEncryptedSecretField(`${SECRET_FIELD_PREFIX}abc`)).toBe(true)
    expect(isEncryptedSecretField('sk-plain')).toBe(false)
    expect(isEncryptedSecretField(null)).toBe(false)
  })

  it('seals and opens with available codec', () => {
    const codec = new FakeCodec(true)
    const sealed = sealSecretField('sk-live', codec)
    expect(typeof sealed).toBe('string')
    expect(isEncryptedSecretField(sealed)).toBe(true)
    expect(openSecretField(sealed, codec)).toBe('sk-live')
  })

  it('does not seal when codec unavailable (passthrough)', () => {
    const codec = new PassthroughSecretCodec()
    expect(sealSecretField('sk-live', codec)).toBe('sk-live')
  })

  it('openSecretField returns empty string when codec unavailable for ciphertext', () => {
    const sealed = sealSecretField('sk-live', new FakeCodec(true)) as string
    expect(openSecretField(sealed, new PassthroughSecretCodec())).toBe('')
  })

  it('openSecretField returns empty string on decrypt failure without throwing', () => {
    const codec = new FakeCodec(true)
    const bad = `${SECRET_FIELD_PREFIX}${Buffer.from('not-E:payload', 'utf8').toString('base64')}`
    expect(openSecretField(bad, codec)).toBe('')
  })

  it('idempotent seal on already-encrypted value', () => {
    const codec = new FakeCodec(true)
    const once = sealSecretField('sk-live', codec) as string
    const twice = sealSecretField(once, codec)
    expect(twice).toBe(once)
  })

  it('transformModelMapSecrets seals connectionConfig.apiKey', () => {
    const codec = new FakeCodec(true)
    const map = {
      openai: {
        id: 'openai',
        connectionConfig: { apiKey: 'sk-abc', baseURL: 'https://api.openai.com' },
      },
    }
    const sealed = transformModelMapSecrets(map, 'seal', codec) as any
    expect(isEncryptedSecretField(sealed.openai.connectionConfig.apiKey)).toBe(true)
    expect(sealed.openai.connectionConfig.baseURL).toBe('https://api.openai.com')

    const opened = transformModelMapSecrets(sealed, 'open', codec) as any
    expect(opened.openai.connectionConfig.apiKey).toBe('sk-abc')
  })

  it('shouldProtectStorageKey only models and image-models', () => {
    expect(shouldProtectStorageKey(CORE_SERVICE_KEYS.MODELS)).toBe(true)
    expect(shouldProtectStorageKey(CORE_SERVICE_KEYS.IMAGE_MODELS)).toBe(true)
    expect(shouldProtectStorageKey(CORE_SERVICE_KEYS.EVAL_CASE_SET)).toBe(false)
    expect(shouldProtectStorageKey('pref:theme')).toBe(false)
  })

  it('sealStorageValue / openStorageValue round-trip JSON', () => {
    const codec = new FakeCodec(true)
    const plain = JSON.stringify({
      m1: { connectionConfig: { apiKey: 'secret-key' } },
    })
    const sealed = sealStorageValue('models', plain, codec)
    expect(sealed).not.toContain('secret-key')
    expect(sealed).toContain(SECRET_FIELD_PREFIX)

    const opened = openStorageValue('models', sealed, codec)!
    expect(JSON.parse(opened).m1.connectionConfig.apiKey).toBe('secret-key')
  })
})

describe('SecretAwareStorageProvider', () => {
  let base: MemoryStorageProvider
  let codec: FakeCodec
  let store: SecretAwareStorageProvider

  beforeEach(() => {
    base = new MemoryStorageProvider()
    codec = new FakeCodec(true)
    store = createSecretAwareStorageProvider(base, codec)
  })

  it('encrypts apiKey on disk for models key', async () => {
    const models = {
      custom: {
        id: 'custom',
        name: 'Custom',
        enabled: true,
        connectionConfig: { apiKey: 'sk-disk-secret', baseURL: 'http://x' },
      },
    }
    await store.setItem('models', JSON.stringify(models))

    const disk = await base.getItem('models')
    expect(disk).toBeTruthy()
    expect(disk!).not.toContain('sk-disk-secret')
    expect(disk!).toContain(SECRET_FIELD_PREFIX)

    const fromApi = await store.getItem('models')
    expect(JSON.parse(fromApi!).custom.connectionConfig.apiKey).toBe('sk-disk-secret')
  })

  it('encrypts image-models the same way', async () => {
    await store.setItem(
      'image-models',
      JSON.stringify({
        img: { connectionConfig: { apiKey: 'img-secret' } },
      }),
    )
    const disk = await base.getItem('image-models')
    expect(disk!).not.toContain('img-secret')
    expect(JSON.parse((await store.getItem('image-models'))!).img.connectionConfig.apiKey).toBe(
      'img-secret',
    )
  })

  it('leaves non-model keys plaintext', async () => {
    await store.setItem('pref:foo', JSON.stringify({ token: 'not-a-model-key' }))
    expect(await base.getItem('pref:foo')).toContain('not-a-model-key')
  })

  it('updateData sees plaintext and reseals', async () => {
    await store.setItem(
      'models',
      JSON.stringify({
        a: { connectionConfig: { apiKey: 'old-key' } },
      }),
    )

    await store.updateData<Record<string, any>>('models', (current) => {
      expect(current!.a.connectionConfig.apiKey).toBe('old-key')
      return {
        ...current,
        a: {
          ...current!.a,
          connectionConfig: { ...current!.a.connectionConfig, apiKey: 'new-key' },
        },
      }
    })

    const disk = await base.getItem('models')
    expect(disk!).not.toContain('new-key')
    expect(disk!).not.toContain('old-key')
    const opened = JSON.parse((await store.getItem('models'))!)
    expect(opened.a.connectionConfig.apiKey).toBe('new-key')
  })

  it('migrates legacy plaintext on next write', async () => {
    // 模拟升级前已有明文
    await base.setItem(
      'models',
      JSON.stringify({
        legacy: { connectionConfig: { apiKey: 'legacy-plain' } },
      }),
    )
    // 读时解密路径应原样返回明文
    const loaded = JSON.parse((await store.getItem('models'))!)
    expect(loaded.legacy.connectionConfig.apiKey).toBe('legacy-plain')

    // 写回后磁盘应加密
    await store.setItem('models', JSON.stringify(loaded))
    const disk = await base.getItem('models')
    expect(disk!).not.toContain('legacy-plain')
    expect(disk!).toContain(SECRET_FIELD_PREFIX)
  })

  it('passthrough codec keeps plaintext (Web)', async () => {
    const web = createSecretAwareStorageProvider(base, new PassthroughSecretCodec())
    await web.setItem(
      'models',
      JSON.stringify({ w: { connectionConfig: { apiKey: 'web-plain' } } }),
    )
    expect(await base.getItem('models')).toContain('web-plain')
  })
})
