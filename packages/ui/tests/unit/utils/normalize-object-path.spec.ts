import { describe, expect, it } from 'vitest'
import { joinRemotePath, normalizeObjectPath } from '../../../src/utils/remote-backup'

/**
 * B6: path normalization regression — keep Web UI and Desktop rules aligned.
 * Rejects traversal, backslash, and C0 control characters.
 */
describe('normalizeObjectPath (B6)', () => {
  it('normalizes simple and nested safe paths', () => {
    expect(normalizeObjectPath('backup.json')).toBe('backup.json')
    expect(normalizeObjectPath('/daily/backup.json/')).toBe('daily/backup.json')
    expect(normalizeObjectPath('a/b/c.json')).toBe('a/b/c.json')
  })

  it('rejects parent traversal segments', () => {
    const bad = [
      '../outside.json',
      'nested/../../outside.json',
      'a/../b.json',
      'nested/./evil.json',
    ]
    for (const path of bad) {
      expect(() => normalizeObjectPath(path), path).toThrow(/unsafe segment|invalid/i)
    }
  })

  it('rejects backslash separators', () => {
    expect(() => normalizeObjectPath('nested\\outside.json')).toThrow(/invalid characters/i)
    expect(() => normalizeObjectPath('a\\b\\c')).toThrow(/invalid characters/i)
  })

  it('rejects C0 control characters and DEL', () => {
    expect(() => normalizeObjectPath(`a${String.fromCharCode(0)}b.json`)).toThrow(
      /invalid characters/i,
    )
    expect(() => normalizeObjectPath('a\nb.json')).toThrow(/invalid characters/i)
    expect(() => normalizeObjectPath(`a${String.fromCharCode(0x7f)}b.json`)).toThrow(
      /invalid characters/i,
    )
  })

  it('rejects encoded traversal and encoded slashes after decode', () => {
    expect(() => normalizeObjectPath('%2e%2e/outside.json')).toThrow(/unsafe segment/i)
    expect(() => normalizeObjectPath('nested/%2e%2e/outside.json')).toThrow(/unsafe segment/i)
    expect(() => normalizeObjectPath('nested/%2foutside.json')).toThrow(/unsafe segment/i)
  })

  it('joinRemotePath rejects unsafe parts', () => {
    expect(joinRemotePath('prompt-optimizer-backups', 'daily/a.json')).toBe(
      'prompt-optimizer-backups/daily/a.json',
    )
    expect(() => joinRemotePath('root', '../x')).toThrow()
  })
})
