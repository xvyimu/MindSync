import { shallowRef, watch, type App } from "vue";
import { createI18n } from "vue-i18n";

import zhCN from "../i18n/locales/zh-CN";
import zhTW from "../i18n/locales/zh-TW";
import enUS from "../i18n/locales/en-US";
import {
  getPreference,
  setPreference,
} from '../composables/storage/usePreferenceManager';
import { UI_SETTINGS_KEYS } from "@mindsync/core";
import type { AppServices } from "../types/services";

export type SupportedLocale = "zh-CN" | "zh-TW" | "en-US";

export const DEFAULT_LOCALE: SupportedLocale = "en-US";
export const SUPPORTED_LOCALES: SupportedLocale[] = ["zh-CN", "zh-TW", "en-US"];

function normalizeLocaleCandidate(
  locale: string | null | undefined,
): SupportedLocale | null {
  if (!locale) return null;

  const normalized = String(locale).trim();
  if (!normalized) return null;

  if (SUPPORTED_LOCALES.includes(normalized as SupportedLocale)) {
    return normalized as SupportedLocale;
  }

  const lower = normalized.toLowerCase();

  if (lower === 'en' || lower.startsWith('en-')) {
    return 'en-US';
  }

  if (lower === 'zh' || lower.startsWith('zh-')) {
    if (
      lower.includes('hant') ||
      lower.startsWith('zh-tw') ||
      lower.startsWith('zh-hk') ||
      lower.startsWith('zh-mo')
    ) {
      return 'zh-TW';
    }

    return 'zh-CN';
  }

  return null;
}

function getBrowserPreferredLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const candidates =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

  return resolveDefaultLocale(candidates);
}

export function sanitizeSupportedLocale(
  locale: string | null | undefined,
  fallback: SupportedLocale = DEFAULT_LOCALE,
): SupportedLocale {
  return normalizeLocaleCandidate(locale) ?? fallback;
}

export function resolveDefaultLocale(
  browserLanguage?: string | readonly string[],
): SupportedLocale {
  const candidates = Array.isArray(browserLanguage)
    ? browserLanguage
    : [browserLanguage];

  for (const candidate of candidates) {
    const resolved = normalizeLocaleCandidate(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return DEFAULT_LOCALE;
}

// 服务引用
const servicesRef = shallowRef<AppServices | null>(null);

// 设置服务引用的函数
export function setI18nServices(services: AppServices) {
  servicesRef.value = services;
}

// 创建i18n实例
const i18n = createI18n({
  legacy: false,
  locale: getBrowserPreferredLocale(),
  fallbackLocale: {
    "zh-TW": ["zh-CN", "en-US"],
    "zh-CN": ["en-US"],
    default: ["en-US"],
  },
  messages: {
    "zh-CN": zhCN,
    "zh-TW": zhTW,
    "en-US": enUS,
  },
});

function syncLocaleToElectronMain(locale: string) {
  if (typeof window === 'undefined') return;
  const api = window.electronAPI;
  if (!api?.app?.setLocale) return;

  // Best-effort sync. Desktop-only; web builds simply no-op.
  void api.app.setLocale(locale).catch((error) => {
    console.warn('[i18n] Failed to sync locale to Electron main process:', error);
  });
}

// Keep Electron main process informed so native menus (context menu, etc.)
// can follow the app's selected language.
watch(
  i18n.global.locale,
  (locale) => {
    const value = String(locale || '');
    if (!value) return;
    syncLocaleToElectronMain(value);
  },
  { immediate: true },
);

// 初始化语言设置
async function initializeLanguage() {
  try {
    const browserLocale = getBrowserPreferredLocale();

    if (!servicesRef.value) {
      console.warn("[i18n] Services unavailable during locale initialization. Falling back to default locale.");
      i18n.global.locale.value = browserLocale;
      return;
    }

    const savedLanguage = await getPreference<string | null>(
      servicesRef,
      UI_SETTINGS_KEYS.PREFERRED_LANGUAGE,
      null,
    );
    const resolvedLocale = sanitizeSupportedLocale(savedLanguage, browserLocale);

    i18n.global.locale.value = resolvedLocale;

    if (savedLanguage !== resolvedLocale) {
      await setPreference(
        servicesRef,
        UI_SETTINGS_KEYS.PREFERRED_LANGUAGE,
        resolvedLocale,
      );
    }
  } catch (error) {
    console.error("[i18n] Failed to initialize locale:", error);
    i18n.global.locale.value = getBrowserPreferredLocale();
  }
}

// 导出插件安装函数
export function installI18n(app: App) {
  initializeLanguage(); // 异步初始化，不阻塞应用启动
  app.use(i18n);
}

// 导出延迟初始化函数 - 用于Extension等需要等待服务初始化的场景
export async function initializeI18nWithStorage() {
  await initializeLanguage();
}

// 导出基础安装函数 - 只安装插件，不初始化语言
export function installI18nOnly(app: App) {
  app.use(i18n);
}

// 导出i18n实例
export { i18n };
