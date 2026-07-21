import type { TextModelConfig } from './types';
import type { ITextAdapterRegistry } from '../llm/types';
import { TextAdapterRegistry } from '../llm/adapters/registry';
import { getEnvVar } from '../../utils/environment';
import { normalizeCustomRequestHeaders, validateCustomRequestHeaders } from '../../utils/custom-request-headers';
import { generateDynamicModels } from './model-utils';
import { CHROME_BUILT_IN_PROVIDER_ID } from '../llm/chrome-built-in';

/**
 * Provider ID -> 环境变量 key 映射
 * 新增 Provider 只需在此添加一行
 */
const PROVIDER_ENV_KEYS = {
  openai: ['VITE_OPENAI_API_KEY'],
  gemini: ['VITE_GEMINI_API_KEY'],
  anthropic: ['VITE_ANTHROPIC_API_KEY'],
  deepseek: ['VITE_DEEPSEEK_API_KEY'],
  siliconflow: ['VITE_SILICONFLOW_API_KEY'],
  zhipu: ['VITE_ZHIPU_API_KEY'],
  dashscope: ['VITE_DASHSCOPE_API_KEY'],
  openrouter: ['VITE_OPENROUTER_API_KEY'],
  modelscope: ['VITE_MODELSCOPE_API_KEY'],
  ollama: [],
  minimax: ['VITE_MINIMAX_API_KEY'],
  cloudflare: ['VITE_CF_API_TOKEN'],
  grok: ['VITE_GROK_API_KEY', 'VITE_XAI_API_KEY'],
  'xiaomi-mimo-token-plan': ['VITE_MIMO_TOKEN_PLAN_API_KEY']
} as const;

const PROVIDER_EXTRA_CONNECTION_ENV_KEYS: Record<string, Record<string, string[]>> = {
  cloudflare: {
    accountId: ['VITE_CF_ACCOUNT_ID']
  },
  'xiaomi-mimo-token-plan': {
    baseURL: ['VITE_MIMO_TOKEN_PLAN_API_BASE_URL']
  }
};

const PROVIDER_REQUIRED_CONNECTION_FIELDS: Record<string, string[]> = {
  ollama: [],
  cloudflare: ['apiKey', 'accountId']
};

function getFirstEnvValue(envKeys: readonly string[]): string {
  for (const envKey of envKeys) {
    const value = getEnvVar(envKey).trim();
    if (value) return value;
  }
  return '';
}

function hasConnectionValue(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : !!value;
}

function shouldEnableFromRequiredFields(
  connectionConfig: Record<string, unknown>,
  requiredConnectionFields: readonly string[]
): boolean {
  return requiredConnectionFields.length > 0
    && requiredConnectionFields.every((field) => hasConnectionValue(connectionConfig[field]));
}

/**
 * 获取所有内置模型的 ID 列表
 * 包括 PROVIDER_ENV_KEYS 中的所有 Provider 和 'custom'
 *
 * 说明：此列表用于「身份识别」（回填/隐藏判定），与是否「默认生成」无关。
 * 即使某个厂商预设不再默认生成，它仍算内置 ID。
 */
export function getBuiltinModelIds(): string[] {
  return [...Object.keys(PROVIDER_ENV_KEYS), CHROME_BUILT_IN_PROVIDER_ID, 'custom'];
}

/**
 * 默认「不再生成」的厂商预设 ID 集合。
 *
 * 需求：彻底铲掉这些预设——它们不进默认配置、不被初始化补齐、不在 UI 出现。
 * 仅保留 `custom`（用户自建 OpenAI 兼容端点的模板）与用户已建条目（如 ls / lsgpt）。
 *
 * 注意：这些 ID 仍属于 getBuiltinModelIds()（身份识别用），
 * 但 getDefaultTextModels() 不会为它们产出任何默认配置。
 */
export const SUPPRESSED_BUILTIN_PRESET_IDS: ReadonlySet<string> = new Set([
  ...Object.keys(PROVIDER_ENV_KEYS),
  CHROME_BUILT_IN_PROVIDER_ID,
]);

/**
 * 创建文本模型的默认配置（TextModelConfig格式）
 * 使用 Provider-Adapter 架构生成完整的元数据
 *
 * 所有配置信息（Provider ID、名称、BaseURL、默认模型）均从 Adapter 获取，
 * 本文件仅负责根据环境变量进行初始化配置组装。
 *
 * @param registry 可选，文本适配器注册表（用于依赖注入和测试）
 */
export function getDefaultTextModels(registry?: ITextAdapterRegistry): Record<string, TextModelConfig> {
  const adapterRegistry = registry || new TextAdapterRegistry();
  const result: Record<string, TextModelConfig> = {};

  // E2E VCR replay: allow a small allowlist of vendor presets so Playwright
  // placeholder keys (see playwright.config.ts) still seed selectable models.
  // Production UI keeps steel-remove defaults (no vendor presets).
  // Use getEnvVar so Vite/import.meta.env works in browser (not only process.env).
  const e2eVcrAllowlist = new Set(
    getEnvVar('VITE_E2E_VCR_ALLOW_PRESETS') === '1'
      ? (getEnvVar('VITE_E2E_VCR_PRESETS') || 'deepseek,siliconflow,dashscope')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  );

  // 批量生成标准 Provider 配置
  for (const [providerId, envKeys] of Object.entries(PROVIDER_ENV_KEYS)) {
    // 被抑制的厂商预设不再默认生成（彻底铲除，不进默认配置）。
    // E2E allowlist is the only intentional exception (test keys only).
    if (SUPPRESSED_BUILTIN_PRESET_IDS.has(providerId) && !e2eVcrAllowlist.has(providerId)) {
      continue;
    }
    const adapter = adapterRegistry.getAdapter(providerId);
    const provider = adapter.getProvider();
    const models = adapter.getModels();
    const defaultModel = models[0] || adapter.buildDefaultModel(providerId);
    const apiKey = getFirstEnvValue(envKeys);
    const connectionConfig: Record<string, unknown> = {
      apiKey,
      baseURL: provider.defaultBaseURL
    };

    const extraConnectionFields = PROVIDER_EXTRA_CONNECTION_ENV_KEYS[providerId] || {};
    for (const [field, fieldEnvKeys] of Object.entries(extraConnectionFields)) {
      const envValue = getFirstEnvValue(fieldEnvKeys);
      if (field === 'baseURL' && !envValue) {
        continue;
      }
      connectionConfig[field] = envValue;
    }

    // 使用模型的默认参数值初始化 paramOverrides
    const defaultParamValues = defaultModel.defaultParameterValues || {};
    const requiredConnectionFields = PROVIDER_REQUIRED_CONNECTION_FIELDS[providerId] || ['apiKey'];
    const enabled = shouldEnableFromRequiredFields(connectionConfig, requiredConnectionFields);

    result[providerId] = {
      id: provider.id,
      name: provider.name,
      enabled: enabled,
      providerId: provider.id,
      modelId: defaultModel.id,
      providerMeta: provider,
      modelMeta: defaultModel,
      connectionConfig,
      paramOverrides: { ...defaultParamValues },
      customParamOverrides: {}
    };
  }

  // Custom 单独处理（baseURL 和 model 来自环境变量）
  const openaiCompatibleAdapter = adapterRegistry.getAdapter('openai-compatible');
  const customApiKey = getEnvVar('VITE_CUSTOM_API_KEY').trim();
  const customBaseURL = getEnvVar('VITE_CUSTOM_API_BASE_URL').trim();
  const rawCustomModelId = getEnvVar('VITE_CUSTOM_API_MODEL').trim();
  const customModelId = rawCustomModelId || 'custom-model';
  const rawCustomHeaders = getEnvVar('VITE_CUSTOM_API_HEADERS');
  const hasExplicitCustomConfig = [
    customApiKey,
    customBaseURL,
    rawCustomModelId,
    rawCustomHeaders
  ].some((value) => value.trim().length > 0);
  let customHeaders: Record<string, string> | undefined;
  if (rawCustomHeaders) {
    try {
      const parsedHeaders = JSON.parse(rawCustomHeaders);
      const validation = validateCustomRequestHeaders(parsedHeaders as any);
      if (validation.valid) {
        customHeaders = normalizeCustomRequestHeaders(parsedHeaders as any);
      } else {
        console.warn(
          `[getDefaultTextModels] Ignored invalid VITE_CUSTOM_API_HEADERS: ${validation.errors
            .map(error => `${error.key} (${error.reason})`)
            .join(', ')}`
        );
      }
    } catch (error) {
      console.warn('[getDefaultTextModels] Failed to parse VITE_CUSTOM_API_HEADERS:', error);
    }
  }
  const customModelMeta = {
    ...openaiCompatibleAdapter.buildDefaultModel(customModelId),
    name: customModelId,
    description: 'Custom model via OpenAI-compatible API'
  };

  result.custom = {
    id: 'custom',
    name: 'OpenAI Compatible (Custom)',
    enabled: hasExplicitCustomConfig,
    providerId: 'openai-compatible',
    modelId: customModelMeta.id,
    providerMeta: openaiCompatibleAdapter.getProvider(),
    modelMeta: customModelMeta,
    connectionConfig: {
      apiKey: customApiKey,
      baseURL: customBaseURL || 'http://localhost:11434/v1',
      requestStyle: 'chat_completions',
      ...(customHeaders ? { customHeaders } : {})
    },
    paramOverrides: { ...(customModelMeta.defaultParameterValues || {}) },
    customParamOverrides: {}
  };

  // chrome-built-in 也属于被抑制的预设：默认不生成。
  if (!SUPPRESSED_BUILTIN_PRESET_IDS.has(CHROME_BUILT_IN_PROVIDER_ID)) {
    const chromeBuiltInAdapter = adapterRegistry.getAdapter(CHROME_BUILT_IN_PROVIDER_ID);
    const chromeBuiltInProvider = chromeBuiltInAdapter.getProvider();
    const chromeBuiltInModel = chromeBuiltInAdapter.getModels()[0] || chromeBuiltInAdapter.buildDefaultModel('gemini-nano');

    result[CHROME_BUILT_IN_PROVIDER_ID] = {
      id: CHROME_BUILT_IN_PROVIDER_ID,
      name: chromeBuiltInProvider.name,
      enabled: false,
      activationState: {
        userConfigured: false
      },
      providerId: chromeBuiltInProvider.id,
      modelId: chromeBuiltInModel.id,
      providerMeta: chromeBuiltInProvider,
      modelMeta: chromeBuiltInModel,
      connectionConfig: {},
      paramOverrides: { ...(chromeBuiltInModel.defaultParameterValues || {}) },
      customParamOverrides: {}
    };
  }

  return result;
}

/**
 * 获取所有模型配置（包括静态和动态）
 * @param registry 可选，文本适配器注册表
 * @returns TextModelConfig格式的模型配置
 */
export function getAllModels(registry?: ITextAdapterRegistry): Record<string, TextModelConfig> {
  // 生成静态模型配置
  const staticModels = getDefaultTextModels(registry);

  // 生成动态自定义模型（现在返回 TextModelConfig 格式）
  const dynamicModels = generateDynamicModels();

  // 合并静态模型和动态模型
  return {
    ...staticModels,
    ...dynamicModels
  };
}

// 直接导出所有模型配置（保持向后兼容）
export const defaultModels = getAllModels();
