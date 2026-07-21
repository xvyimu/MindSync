/**
 * Desktop 核心服务装配容器。
 * 业务工厂与创建顺序的唯一入口：storage → preference → managers → LLM/Prompt/Image → data。
 * main 只做 composition root（Electron 路径 / proxy / nativeImage 注入）。
 */

const { createElectronSafeStorageCodec } = require('./safe-storage-secrets');

/** 静态 VITE_* 探测列表（仅日志，不参与装配）。 */
const STATIC_ENV_VARS = [
  'VITE_OPENAI_API_KEY',
  'VITE_GEMINI_API_KEY',
  'VITE_ANTHROPIC_API_KEY',
  'VITE_DEEPSEEK_API_KEY',
  'VITE_SILICONFLOW_API_KEY',
  'VITE_ZHIPU_API_KEY',
  'VITE_DASHSCOPE_API_KEY',
  'VITE_OPENROUTER_API_KEY',
  'VITE_MODELSCOPE_API_KEY',
  'VITE_CUSTOM_API_KEY',
  'VITE_CUSTOM_API_BASE_URL',
  'VITE_CUSTOM_API_MODEL',
  'VITE_CUSTOM_API_PARAMS',
  'VITE_CUSTOM_API_HEADERS',
];

/**
 * 扫描 env 中是否已配置 API 相关变量（仅日志）。
 * @param {NodeJS.ProcessEnv} env
 * @param {{ CUSTOM_API_PATTERN?: RegExp, SUFFIX_PATTERN?: RegExp, MAX_SUFFIX_LENGTH?: number }} patterns
 * @param {(msg: string, ...args: any[]) => void} log
 */
function probeApiKeyEnv(env, patterns, log) {
  log('[Main Process] Checking environment variables...');

  const {
    CUSTOM_API_PATTERN,
    SUFFIX_PATTERN,
    MAX_SUFFIX_LENGTH = 32,
  } = patterns || {};

  let dynamicEnvVars = [];
  if (CUSTOM_API_PATTERN && SUFFIX_PATTERN) {
    dynamicEnvVars = Object.keys(env).filter((key) => {
      const match = key.match(CUSTOM_API_PATTERN);
      if (!match) return false;
      const [, , suffix] = match;
      return suffix && suffix.length <= MAX_SUFFIX_LENGTH && SUFFIX_PATTERN.test(suffix);
    });
  }

  const allEnvVars = [...STATIC_ENV_VARS, ...dynamicEnvVars];
  let hasApiKeys = false;
  allEnvVars.forEach((envVar) => {
    if (env[envVar]) {
      log(`[Main Process] Found ${envVar}: [CONFIGURED]`);
      hasApiKeys = true;
    } else if (STATIC_ENV_VARS.includes(envVar)) {
      log(`[Main Process] Missing ${envVar}`);
    }
  });

  if (dynamicEnvVars.length > 0) {
    log(`[Main Process] Found ${dynamicEnvVars.length} dynamic custom model environment variables`);
  }

  if (!hasApiKeys) {
    console.warn('[Main Process] No API keys found in environment variables.');
    console.warn('[Main Process] Please set environment variables before starting the desktop app.');
  }
}

/**
 * @param {object} deps
 * @param {() => string} deps.getUserDataPath
 * @param {import('electron').safeStorage} [deps.safeStorage]
 * @param {() => Promise<void>} [deps.setupGlobalProxyDispatcherFromSystem]
 * @param {(input: any) => Promise<any>} [deps.convertImageInputWithElectronNativeImage]
 * @param {(msg: string, ...args: any[]) => void} [deps.log]
 * @param {NodeJS.ProcessEnv} [deps.env] — default process.env；用于 API key 探测日志
 * @param {object} [deps.core] — **仅测试**：覆盖 `@prompt-optimizer/core` 工厂；生产勿传
 * @returns {Promise<{ ok: true, services: object } | { ok: false, error: Error }>}
 */
async function createCoreServices(deps) {
  const log = deps.log || console.log.bind(console);
  const env = deps.env || process.env;

  const core = deps.core || require('@prompt-optimizer/core');
  const {
    PreferenceService,
    createModelManager,
    createTemplateManager,
    createHistoryManager,
    createLLMService,
    createPromptService,
    createImageUnderstandingService,
    createImageModelManager,
    createImageAdapterRegistry,
    createImageService,
    createTemplateLanguageService,
    createDataManager,
    createContextRepo,
    FavoriteManager,
    FileStorageProvider,
    createSecretAwareStorageProvider,
    runStorageStartupSafetyCheck,
    writeStartupRepairReport,
    CUSTOM_API_PATTERN,
    SUFFIX_PATTERN,
    MAX_SUFFIX_LENGTH,
  } = core;

  try {
    log('[Main Process] Initializing core services...');
    probeApiKeyEnv(env, { CUSTOM_API_PATTERN, SUFFIX_PATTERN, MAX_SUFFIX_LENGTH }, log);

    log('[DESKTOP] Creating file storage provider for desktop environment');
    const userDataPath = deps.getUserDataPath();
    log('[DESKTOP] Using user data directory:', userDataPath);

    const fileStorage = new FileStorageProvider(userDataPath);
    const secretCodec = createElectronSafeStorageCodec(deps.safeStorage);
    const storageProvider =
      typeof createSecretAwareStorageProvider === 'function'
        ? createSecretAwareStorageProvider(fileStorage, secretCodec)
        : fileStorage;

    if (secretCodec.isAvailable()) {
      log('[DESKTOP] safeStorage encryption available — wrapping models storage');
    } else {
      log('[DESKTOP] safeStorage unavailable — model API keys remain plaintext on disk');
    }

    const startupRepairReport = await runStorageStartupSafetyCheck(storageProvider);
    await writeStartupRepairReport(storageProvider, startupRepairReport);

    // 迁移：把升级前明文 apiKey 重写为密文（仅 codec 可用时）
    if (typeof storageProvider.ensureSecretsSealed === 'function') {
      try {
        const { rewritten } = await storageProvider.ensureSecretsSealed();
        if (rewritten.length > 0) {
          log('[DESKTOP] Migrated plaintext API keys to safeStorage for:', rewritten.join(', '));
        }
      } catch (migrateError) {
        console.warn('[DESKTOP] Secret migration skipped:', migrateError);
      }
    }

    log('[DESKTOP] Initializing PreferenceService with the provided storage provider...');
    const preferenceService = new PreferenceService(storageProvider);
    log('[DESKTOP] PreferenceService initialized.');

    log('[DESKTOP] Creating model manager...');
    const modelManager = createModelManager(storageProvider);

    log('[DESKTOP] Creating template language service...');
    const templateLanguageService = createTemplateLanguageService(preferenceService);
    await templateLanguageService.initialize();

    log('[DESKTOP] Creating template manager...');
    const templateManager = createTemplateManager(storageProvider, templateLanguageService);

    log('[DESKTOP] Creating history manager...');
    const historyManager = createHistoryManager(storageProvider, modelManager);

    log('[DESKTOP] Initializing model manager...');
    await modelManager.ensureInitialized();

    log('[DESKTOP] Creating image model manager...');
    const imageAdapterRegistry = createImageAdapterRegistry();
    const imageModelManager = createImageModelManager(storageProvider, imageAdapterRegistry);
    await imageModelManager.ensureInitialized();

    if (typeof deps.setupGlobalProxyDispatcherFromSystem === 'function') {
      await deps.setupGlobalProxyDispatcherFromSystem();
    }

    log('[DESKTOP] Creating LLM service...');
    const llmService = createLLMService(modelManager);

    const imageUnderstandingService = createImageUnderstandingService({
      imageInputConverter: deps.convertImageInputWithElectronNativeImage,
    });

    log('[DESKTOP] Creating Prompt service...');
    const promptService = createPromptService(
      modelManager,
      llmService,
      templateManager,
      historyManager,
      imageUnderstandingService,
    );

    log('[DESKTOP] Creating Image service...');
    const imageService = createImageService(imageModelManager, imageAdapterRegistry, {
      imageInputConverter: deps.convertImageInputWithElectronNativeImage,
    });

    log('[DESKTOP] Creating Context repository...');
    const contextRepo = createContextRepo(storageProvider);

    log('[DESKTOP] Creating Favorite manager...');
    const favoriteManager = new FavoriteManager(storageProvider);

    log('[DESKTOP] Creating Data manager...');
    const dataManager = createDataManager(
      modelManager,
      templateManager,
      historyManager,
      preferenceService,
      contextRepo,
      imageModelManager,
      favoriteManager,
    );

    log('[Main Process] Core services initialized successfully.');

    return {
      ok: true,
      services: {
        storageProvider,
        modelManager,
        templateLanguageService,
        templateManager,
        historyManager,
        imageAdapterRegistry,
        imageModelManager,
        llmService,
        imageUnderstandingService,
        promptService,
        imageService,
        contextRepo,
        favoriteManager,
        dataManager,
        preferenceService,
      },
    };
  } catch (error) {
    console.error('[Main Process] Failed to initialize core services:', error);
    console.error('[Main Process] Error details:', error && error.stack);
    return { ok: false, error };
  }
}

module.exports = {
  createCoreServices,
  // 测试/文档用
  STATIC_ENV_VARS,
  probeApiKeyEnv,
};
