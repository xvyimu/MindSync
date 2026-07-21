import { afterEach, describe, expect, it, vi } from 'vitest'

import { UI_SETTINGS_KEYS } from '@mindsync/core'
import zhCN from '../../../src/i18n/locales/zh-CN'
import zhTW from '../../../src/i18n/locales/zh-TW'
import enUS from '../../../src/i18n/locales/en-US'
import {
  i18n,
  initializeI18nWithStorage,
  resolveDefaultLocale,
  sanitizeSupportedLocale,
  setI18nServices,
} from '../../../src/plugins/i18n'

const setNavigatorLocales = (language: string, languages: string[] = [language]) => {
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: language,
  })

  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  })
}

afterEach(() => {
  i18n.global.locale.value = 'en-US'
  vi.restoreAllMocks()
})

describe('i18n bootstrap helpers', () => {
  it('defaults to en-US when browser language is missing', () => {
    expect(resolveDefaultLocale(undefined)).toBe('en-US')
    expect(resolveDefaultLocale('')).toBe('en-US')
  })

  it('maps Chinese browser languages to supported Chinese locales', () => {
    expect(resolveDefaultLocale('zh-CN')).toBe('zh-CN')
    expect(resolveDefaultLocale('zh-SG')).toBe('zh-CN')
    expect(resolveDefaultLocale('zh-TW')).toBe('zh-TW')
    expect(resolveDefaultLocale('zh-HK')).toBe('zh-TW')
    expect(resolveDefaultLocale('zh-Hant')).toBe('zh-TW')
  })

  it('keeps supported saved locales', () => {
    expect(sanitizeSupportedLocale('zh-CN')).toBe('zh-CN')
    expect(sanitizeSupportedLocale('zh-TW')).toBe('zh-TW')
    expect(sanitizeSupportedLocale('en-US')).toBe('en-US')
  })

  it('normalizes legacy short locale values', () => {
    expect(sanitizeSupportedLocale('zh')).toBe('zh-CN')
    expect(sanitizeSupportedLocale('en')).toBe('en-US')
  })

  it('falls back to en-US for unsupported saved locales', () => {
    expect(sanitizeSupportedLocale('ja-JP')).toBe('en-US')
    expect(sanitizeSupportedLocale('')).toBe('en-US')
    expect(sanitizeSupportedLocale(undefined)).toBe('en-US')
  })

  it('initializes to Chinese when browser language is Chinese and no saved preference exists', async () => {
    setNavigatorLocales('zh-CN')

    const get = vi.fn().mockResolvedValue(null)
    const set = vi.fn().mockResolvedValue(undefined)

    setI18nServices({
      preferenceService: {
        get,
        set,
      },
    } as any)

    await initializeI18nWithStorage()

    expect(i18n.global.locale.value).toBe('zh-CN')
    expect(get).toHaveBeenCalledWith(UI_SETTINGS_KEYS.PREFERRED_LANGUAGE, null)
    expect(set).toHaveBeenCalledWith(UI_SETTINGS_KEYS.PREFERRED_LANGUAGE, 'zh-CN')
  })

  it('normalizes legacy zh preference during initialization instead of overwriting it with English', async () => {
    setNavigatorLocales('en-US')

    const get = vi.fn().mockResolvedValue('zh')
    const set = vi.fn().mockResolvedValue(undefined)

    setI18nServices({
      preferenceService: {
        get,
        set,
      },
    } as any)

    await initializeI18nWithStorage()

    expect(i18n.global.locale.value).toBe('zh-CN')
    expect(set).toHaveBeenCalledWith(UI_SETTINGS_KEYS.PREFERRED_LANGUAGE, 'zh-CN')
  })

  it('uses endonyms for language switcher labels in every locale bundle', () => {
    const expected = {
      'zh-CN': '简体中文',
      'zh-TW': '繁體中文',
      'en-US': 'English',
    }

    expect(zhCN.settings.languageSwitcher.languages).toEqual(expected)
    expect(zhTW.settings.languageSwitcher.languages).toEqual(expected)
    expect(enUS.settings.languageSwitcher.languages).toEqual(expected)
  })
})
