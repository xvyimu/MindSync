/**
 * Utility functions for environment detection and configuration.
 */

import { getDefaultEnvVar } from './default-env'
import { normalizeCustomRequestHeaders, validateCustomRequestHeaders } from './custom-request-headers'

export { DEFAULT_VITE_ENV, getDefaultEnvVar } from './default-env'

// 常量定义
export const CUSTOM_API_PATTERN = /^VITE_CUSTOM_API_(KEY|BASE_URL|MODEL|PARAMS|HEADERS)_(.+)$/;
export const SUFFIX_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const MAX_SUFFIX_LENGTH = 50;
const FORBIDDEN_CUSTOM_PARAM_KEYS = new Set(['model', 'messages', 'stream']);

// 简单的缓存机制
let cachedCustomModels: Record<string, ValidatedCustomModelEnvConfig> | null = null;



/**
 * 自定义模型环境变量配置接口（扫描阶段）
 */
export interface CustomModelEnvConfig {
  /** 后缀名（如 qwen3, claude_local） */
  suffix: string;
  /** API密钥（可选，在扫描过程中可能为undefined） */
  apiKey?: string;
  /** API基础URL（可选） */
  baseURL?: string;
  /** 模型名称（可选） */
  model?: string;
  /** 额外请求参数（JSON 字符串，可选） */
  params?: string;
  /** 自定义请求头（JSON 字符串，可选） */
  headers?: string;
}

/**
 * 已验证的自定义模型环境变量配置接口
 * 通过 validateCustomModelConfig 验证后的配置，所有必需字段都已确保存在
 */
export interface ValidatedCustomModelEnvConfig {
  /** 后缀名（已验证格式和长度） */
  suffix: string;
  /** API密钥（已验证存在） */
  apiKey: string;
  /** API基础URL（已验证格式） */
  baseURL: string;
  /** 模型名称（已验证存在） */
  model: string;
  /** 已解析的额外请求参数（可选） */
  params?: Record<string, unknown>;
  /** 已解析的自定义请求头（可选） */
  customHeaders?: Record<string, string>;
}

/**
 * 配置验证结果接口
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 警告信息列表 */
  warnings: string[];
}

/**
 * 验证自定义模型配置
 * @param config 自定义模型配置
 * @returns 验证结果
 */
export function validateCustomModelConfig(config: CustomModelEnvConfig): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  // 验证后缀名
  if (!config.suffix) {
    result.errors.push('Suffix is required');
    result.valid = false;
  } else if (config.suffix.length > MAX_SUFFIX_LENGTH || !SUFFIX_PATTERN.test(config.suffix)) {
    result.errors.push(`Invalid suffix: ${config.suffix}. Use 1-${MAX_SUFFIX_LENGTH} alphanumeric characters, underscores, or hyphens`);
    result.valid = false;
  }

  // 验证API密钥
  if (!config.apiKey) {
    result.errors.push('API key is required');
    result.valid = false;
  } else if (config.apiKey.length < 8) {
    result.warnings.push('API key seems too short, please verify it is correct');
  }

  // 验证baseURL（必需）
  if (!config.baseURL) {
    result.errors.push('Base URL is required');
    result.valid = false;
  } else {
    try {
      const url = new URL(config.baseURL);
      if (!['http:', 'https:'].includes(url.protocol)) {
        result.warnings.push(`Unusual protocol in baseURL: ${url.protocol}. Expected http: or https:`);
      }
    } catch (error) {
      result.errors.push(`Invalid baseURL format: ${config.baseURL}`);
      result.valid = false;
    }
  }

  // 验证模型名称（必需）
  if (!config.model) {
    result.errors.push('Model name is required');
    result.valid = false;
  }

  return result;
}

function parseCustomModelParams(rawParams: string, suffix: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(rawParams);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.warn(`[scanCustomModelEnvVars] Invalid PARAMS for ${suffix}: must be a JSON object`);
      return undefined;
    }

    const sanitizedParams = { ...(parsed as Record<string, unknown>) };
    const removedKeys: string[] = [];

    FORBIDDEN_CUSTOM_PARAM_KEYS.forEach((key) => {
      if (key in sanitizedParams) {
        delete sanitizedParams[key];
        removedKeys.push(key);
      }
    });

    if (removedKeys.length > 0) {
      console.warn(
        `[scanCustomModelEnvVars] Ignored forbidden PARAMS keys for ${suffix}: ${removedKeys.join(', ')}`
      );
    }

    return sanitizedParams;
  } catch (error) {
    console.warn(`[scanCustomModelEnvVars] Failed to parse PARAMS for ${suffix}:`, error);
    return undefined;
  }
}

function parseCustomModelHeaders(rawHeaders: string, suffix: string): Record<string, string> | undefined {
  try {
    const parsed = JSON.parse(rawHeaders);

    if ((typeof parsed !== 'object' || parsed === null)) {
      console.warn(`[scanCustomModelEnvVars] Invalid HEADERS for ${suffix}: must be a JSON object or array`);
      return undefined;
    }

    const validation = validateCustomRequestHeaders(parsed as any);
    if (!validation.valid) {
      const details = validation.errors.map(error => `${error.key} (${error.reason})`).join(', ');
      console.warn(`[scanCustomModelEnvVars] Ignored invalid HEADERS for ${suffix}: ${details}`);
      return undefined;
    }

    return normalizeCustomRequestHeaders(parsed as any);
  } catch (error) {
    console.warn(`[scanCustomModelEnvVars] Failed to parse HEADERS for ${suffix}:`, error);
    return undefined;
  }
}

/**
 * 检查是否在浏览器环境中
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * 检查是否在开发模式
 * 使用统一的 VITE_LOCAL_DEV 环境变量判断，避免依赖 NODE_ENV、MODE 等内置环境变量
 * 通过 getEnvVar 动态访问，避免 Vite 编译时内联替换（类似 VITE_APP_PLATFORM 的设计）
 *
 * 只有当 VITE_LOCAL_DEV 环境变量显式设置为 'true' 时才认为是开发环境
 * 支持多种环境：Vite、Node.js、Docker、Electron等
 */
export function isDevelopment(): boolean {
  // 只检查 VITE_LOCAL_DEV 环境变量
  const localDev = getEnvVar('VITE_LOCAL_DEV');
  return localDev === 'true';
}


/**
 * Desktop shell platform values accepted by VITE_APP_PLATFORM.
 * - electron: classic Electron main/preload
 * - tauri / desktop: Tauri (or generic desktop) shell using the same facade
 */
const DESKTOP_PLATFORM_ENV_VALUES = new Set(['electron', 'tauri', 'desktop']);

function hasDesktopP0Surface(api: unknown): boolean {
  if (!api || typeof api !== 'object') return false;
  const bridge = api as {
    app?: { getVersion?: unknown };
    preference?: { get?: unknown; set?: unknown };
    shell?: { openExternal?: unknown };
  };
  return (
    typeof bridge.app?.getVersion === 'function' &&
    typeof bridge.preference?.get === 'function' &&
    typeof bridge.preference?.set === 'function' &&
    typeof bridge.shell?.openExternal === 'function'
  );
}

/**
 * True when a desktop bridge is present (electronAPI and/or desktopAPI)
 * with at least the P0 surface required by the facade.
 * Does NOT treat bare `window` as desktop — Web must stay false.
 */
function hasDesktopBridge(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const w = window as any;
  if (hasDesktopP0Surface(w.desktopAPI) || hasDesktopP0Surface(w.electronAPI)) {
    return true;
  }
  // Partial bridge (Electron preload still loading preference): presence of either API object
  if (typeof w.desktopAPI !== 'undefined' || typeof w.electronAPI !== 'undefined') {
    return true;
  }
  return false;
}

/**
 * 检测是否在桌面壳中运行（Electron 或 Tauri facade）。
 * 优先 VITE_APP_PLATFORM，再自动探测 bridge；Web 无 bridge 时必须为 false。
 */
export function isRunningInDesktop(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const platformEnv = getEnvVar('VITE_APP_PLATFORM');
  if (platformEnv) {
    const isDesktop = DESKTOP_PLATFORM_ENV_VALUES.has(platformEnv);
    console.log('[isRunningInDesktop] Using platform from env:', platformEnv, '→', isDesktop);
    return isDesktop;
  }

  if (hasDesktopBridge()) {
    console.log('[isRunningInDesktop] Verdict: true (via desktop bridge)');
    return true;
  }

  // Electron-only process fingerprint (legacy preload before electronAPI attach)
  const hasValidElectronProcess =
    typeof (window as any).process !== 'undefined' &&
    (window as any).process?.type === 'renderer' &&
    (window as any).process?.versions?.electron;

  if (hasValidElectronProcess) {
    console.log('[isRunningInDesktop] Verdict: true (via process.versions.electron)');
    return true;
  }

  console.log('[isRunningInDesktop] Verdict: false (no desktop features)');
  return false;
}

/**
 * 检测是否在Electron环境中运行
 * 优先使用环境变量VITE_APP_PLATFORM，然后使用自动检测机制。
 *
 * 兼容：若仅有 desktopAPI（Tauri facade 别名策略），在未设置 platform env
 * 时仍返回 true，以便现有 `isRunningInElectron()` 调用方走代理初始化路径。
 * 新代码请优先使用 {@link isRunningInDesktop}。
 */
export function isRunningInElectron(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // 第一步：检查环境变量（最高优先级）
  const platformEnv = getEnvVar('VITE_APP_PLATFORM');
  if (platformEnv) {
    console.log('[isRunningInElectron] Using platform from env:', platformEnv);
    // Strict for env: only literal "electron" is Electron; tauri/desktop are desktop-only.
    return platformEnv === 'electron';
  }

  // 自动检测：desktop facade 或 legacy electronAPI
  if (hasDesktopBridge()) {
    console.log('[isRunningInElectron] Verdict: true (via desktop bridge; prefer isRunningInDesktop for new code)');
    return true;
  }

  // 后备检测：检查更严格的Electron特征
  const hasValidElectronProcess = typeof (window as any).process !== 'undefined' &&
                                 (window as any).process?.type === 'renderer' &&
                                 (window as any).process?.versions?.electron;

  if (hasValidElectronProcess) {
    console.log('[isRunningInElectron] Verdict: true (via process.versions.electron)');
    return true;
  }

  console.log('[isRunningInElectron] Verdict: false (no Electron features detected)');
  return false;
}

/**
 * Desktop API readiness: P0 surface on desktopAPI or electronAPI.
 */
export function isDesktopApiReady(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const w = window as any;
  if (hasDesktopP0Surface(w.desktopAPI) || hasDesktopP0Surface(w.electronAPI)) {
    return true;
  }

  // Backward-compatible Electron readiness (preference only) while P0 shell may lag
  const hasElectronAPI = typeof w.electronAPI !== 'undefined';
  const hasPreferenceApi =
    hasElectronAPI &&
    typeof w.electronAPI.preference !== 'undefined' &&
    typeof w.electronAPI.preference.get === 'function';

  return hasPreferenceApi;
}

/**
 * 检测Electron API是否完全就绪
 * 不仅检测环境，还检测关键API的可用性
 */
export function isElectronApiReady(): boolean {
  // Prefer shared desktop readiness so Tauri/mock facade satisfies callers.
  if (isDesktopApiReady()) {
    return true;
  }
  if (!isRunningInElectron()) {
    return false;
  }

  const window_any = window as any;
  const hasElectronAPI = typeof window_any.electronAPI !== 'undefined';
  const hasPreferenceApi = hasElectronAPI && typeof window_any.electronAPI.preference !== 'undefined';

  console.log('[isElectronApiReady] API readiness check:', {
    hasElectronAPI,
    hasPreferenceApi,
  });

  // 检查electronAPI.preference是否可用
  return hasElectronAPI && hasPreferenceApi;
}

/**
 * 等待桌面 API（desktopAPI 或 electronAPI）就绪。
 * @param timeout 超时时间（毫秒），默认5000ms
 */
export function waitForDesktopApi(timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isDesktopApiReady()) {
      console.log('[waitForDesktopApi] API already ready');
      resolve(true);
      return;
    }

    console.log('[waitForDesktopApi] Waiting for desktop API...');
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isDesktopApiReady()) {
        clearInterval(checkInterval);
        console.log('[waitForDesktopApi] API ready after', Date.now() - startTime, 'ms');
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        console.warn('[waitForDesktopApi] Timeout waiting for desktop API after', timeout, 'ms');
        resolve(false);
      }
    }, 50);
  });
}

/**
 * 等待Electron API完全就绪
 * @param timeout 超时时间（毫秒），默认5000ms
 * @returns Promise<boolean> 是否在超时前API就绪
 */
export function waitForElectronApi(timeout: number = 5000): Promise<boolean> {
  // Delegate to desktop wait so mock/Tauri facade works without dual loops.
  return waitForDesktopApi(timeout);
}

/**
 * 获取环境变量的通用函数
 * 支持多种环境：浏览器运行时配置、process.env、import.meta.env
 */
export const getEnvVar = (key: string): string => {
  // 1. 首先检查运行时配置（Docker环境）
  if (typeof window !== 'undefined' && window.runtime_config) {
    // 移除 VITE_ 前缀以匹配运行时配置中的键名
    const runtimeKey = key.replace('VITE_', '');
    const value = window.runtime_config[runtimeKey] ?? window.runtime_config[key];
    if (value !== undefined && value !== null) {
      return String(value);
    }
  }

  // 2. 然后尝试 process.env（Node.js环境）
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key] || '';
  }

  // 3. 然后尝试 import.meta.env（Vite 环境）
  try {
    // @ts-ignore - 在构建时忽略此错误
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore - 在构建时忽略此错误
      const value = import.meta.env[key];
      if (value) return value;
    }
  } catch {
    // 忽略错误
  }

  // 4. 产品内建默认值（覆盖 web / extension / desktop 缺省打包场景）
  const defaultValue = getDefaultEnvVar(key);
  if (defaultValue) return defaultValue;

  // 5. 最后返回空字符串
  return '';
};

/**
 * 扫描所有自定义模型环境变量
 * 查找 VITE_CUSTOM_API_*_suffix 模式的环境变量
 * @param useCache 是否使用缓存，默认为true
 * @returns 已验证的自定义模型配置映射，key为后缀名，value为已验证的配置对象
 */
export function scanCustomModelEnvVars(useCache: boolean = true): Record<string, ValidatedCustomModelEnvConfig> {
  // 如果启用缓存且有缓存结果，直接返回
  if (useCache && cachedCustomModels) {
    return cachedCustomModels;
  }
  const customModels: Record<string, CustomModelEnvConfig> = {};

  // 获取环境变量，按优先级顺序（高优先级覆盖低优先级）
  const mergedEnv: Record<string, string> = {};

  // 优先级1（最低）: import.meta.env（Vite开发环境）
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      Object.entries(import.meta.env).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          mergedEnv[key] = String(value);
        }
      });
    }
  } catch (error) {
    console.warn('[scanCustomModelEnvVars] Failed to access import.meta.env:', error);
  }

  // 优先级2（中等）: process.env（Node.js环境）
  if (typeof process !== 'undefined' && process.env) {
    Object.entries(process.env).forEach(([key, value]) => {
      if (value !== undefined) {
        mergedEnv[key] = value;
      }
    });
  }

  // 优先级3（最高）: 运行时配置（Docker环境）
  if (typeof window !== 'undefined' && window.runtime_config) {
    Object.entries(window.runtime_config).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // 添加 VITE_ 前缀以统一处理
        mergedEnv[`VITE_${key}`] = String(value);
      }
    });
  }

  console.log(`[scanCustomModelEnvVars] Environment sources loaded`);

  // 使用预定义的正则表达式模式
  const customApiPattern = CUSTOM_API_PATTERN;

  // 遍历合并后的环境变量
  Object.entries(mergedEnv).forEach(([key, value]) => {
    // 跳过undefined、null和空字符串，但允许其他falsy值
    if (value === undefined || value === null || value === '') return;

    const match = key.match(customApiPattern);
    if (match) {
      const [, configType, suffix] = match;

      // 验证后缀名（不能为空，不能包含特殊字符，不能超过长度限制）
      if (!suffix || suffix.length > MAX_SUFFIX_LENGTH || !SUFFIX_PATTERN.test(suffix)) {
        console.warn(`[scanCustomModelEnvVars] Invalid suffix in ${key}: ${suffix}`);
        return;
      }

      // 初始化配置对象
      if (!customModels[suffix]) {
        customModels[suffix] = {
          suffix,
          apiKey: undefined,
          baseURL: undefined,
          model: undefined,
          params: undefined,
          headers: undefined
        };
      }

      // 设置对应的配置项
      switch (configType) {
        case 'KEY':
          customModels[suffix].apiKey = value;
          break;
        case 'BASE_URL':
          customModels[suffix].baseURL = value;
          break;
        case 'MODEL':
          customModels[suffix].model = value;
          break;
        case 'PARAMS':
          customModels[suffix].params = value;
          break;
        case 'HEADERS':
          customModels[suffix].headers = value;
          break;
        default:
          console.warn(`[scanCustomModelEnvVars] Unknown config type: ${configType} in ${key}`);
          break;
      }
    }
    });

  // 验证和过滤配置
  const validModels: Record<string, ValidatedCustomModelEnvConfig> = {};
  Object.entries(customModels).forEach(([suffix, config]) => {
    const validation = validateCustomModelConfig(config);

    if (validation.valid) {
      const validatedConfig: ValidatedCustomModelEnvConfig = {
        suffix: config.suffix,
        apiKey: config.apiKey!,
        baseURL: config.baseURL!,
        model: config.model!
      };

      if (config.params) {
        const parsedParams = parseCustomModelParams(config.params, suffix);
        if (parsedParams !== undefined) {
          validatedConfig.params = parsedParams;
        }
      }

      if (config.headers) {
        const parsedHeaders = parseCustomModelHeaders(config.headers, suffix);
        if (parsedHeaders !== undefined) {
          validatedConfig.customHeaders = parsedHeaders;
        }
      }

      validModels[suffix] = validatedConfig;

      // 输出警告信息
      if (validation.warnings.length > 0) {
        console.warn(`[scanCustomModelEnvVars] Warnings for ${suffix}:`);
        validation.warnings.forEach(warning => {
          console.warn(`  - ${warning}`);
        });
      }
    } else {
      console.error(`[scanCustomModelEnvVars] Skipping ${suffix} due to validation errors:`);
      validation.errors.forEach(error => {
        console.error(`  - ${error}`);
      });

      if (validation.warnings.length > 0) {
        console.warn(`[scanCustomModelEnvVars] Additional warnings for ${suffix}:`);
        validation.warnings.forEach(warning => {
          console.warn(`  - ${warning}`);
        });
      }
    }
  });

  console.log(`[scanCustomModelEnvVars] Found ${Object.keys(validModels).length} valid custom models:`, Object.keys(validModels));

  // 缓存结果
  if (useCache) {
    cachedCustomModels = validModels;
  }

  return validModels;
}



/**
 * 清除自定义模型环境变量扫描缓存
 * 在环境变量发生变化时调用
 */
export function clearCustomModelEnvCache(): void {
  cachedCustomModels = null;
  console.log('[clearCustomModelEnvCache] Cache cleared');
}
