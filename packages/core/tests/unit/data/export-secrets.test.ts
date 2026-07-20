import { describe, it, expect } from 'vitest'
import {
  redactModelConfigSecrets,
  redactModelsExportPayload,
  redactExportDataObject,
  exportJsonLooksLikeItContainsApiKeys,
} from '../../../src/services/data/export-secrets'

describe('export-secrets (B4 companion)', () => {
  it('redacts connectionConfig.apiKey and top-level apiKey', () => {
    const redacted = redactModelConfigSecrets({
      id: 'x',
      apiKey: 'sk-top',
      connectionConfig: { apiKey: 'sk-conn', baseURL: 'https://api.example' },
    }) as any
    expect(redacted.apiKey).toBeUndefined()
    expect(redacted.connectionConfig.apiKey).toBeUndefined()
    expect(redacted.connectionConfig.baseURL).toBe('https://api.example')
  })

  it('redacts models map and array payloads', () => {
    const map = redactModelsExportPayload({
      a: { connectionConfig: { apiKey: 'secret' } },
    }) as any
    expect(map.a.connectionConfig.apiKey).toBeUndefined()

    const arr = redactModelsExportPayload([
      { connectionConfig: { apiKey: 'secret2' } },
    ]) as any
    expect(arr[0].connectionConfig.apiKey).toBeUndefined()
  })

  it('redactExportDataObject skips when includeSecrets true', () => {
    const data = {
      models: { a: { connectionConfig: { apiKey: 'keep-me' } } },
    }
    const kept = redactExportDataObject(data, { includeSecrets: true }) as any
    expect(kept.models.a.connectionConfig.apiKey).toBe('keep-me')
    const scrubbed = redactExportDataObject(data) as any
    expect(scrubbed.models.a.connectionConfig.apiKey).toBeUndefined()
  })

  it('detects plaintext apiKey patterns', () => {
    expect(exportJsonLooksLikeItContainsApiKeys('{"apiKey":"sk-live"}')).toBe(true)
    expect(exportJsonLooksLikeItContainsApiKeys('{"apiKey":"__enc:v1:abc"}')).toBe(false)
    expect(exportJsonLooksLikeItContainsApiKeys('{"baseURL":"https://x"}')).toBe(false)
  })
})
