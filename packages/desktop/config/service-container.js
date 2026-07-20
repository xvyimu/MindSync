/**
 * Desktop 核心服务装配容器。
 * 将 initializeServices 的创建顺序与依赖关系从 main.js 抽出，
 * main 只负责环境探测、代理与 IPC 绑定。
 */

/**
 * @param {object} deps
 * @param {() => string} deps.getUserDataPath
 * @param {object} deps.core — 从 @prompt-optimizer/core require 的工厂集合
 * @param {Function} deps.initializePreferenceService
 * @param {Function} deps.setupGlobalProxyDispatcherFromSystem
 * @param {Function} deps.convertImageInputWithElectronNativeImage
 * @param {(msg: string, ...args: any[]) => void} [deps.log]
 * @returns {Promise<{ ok: true, services: object } | { ok: false, error: Error }>}
 */
async function createCoreServices(deps) {
  const log = deps.log || console.log.bind(console);
  const {
    PreferenceService: _PreferenceService,
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
    runStorageStartupSafetyCheck,
    writeStartupRepairReport,
  } = deps.core;

  try {
    log('[DESKTOP] Creating file storage provider for desktop environment');
    const userDataPath = deps.getUserDataPath();
    log('[DESKTOP] Using user data directory:', userDataPath);

    const storageProvider = new FileStorageProvider(userDataPath);
    const startupRepairReport = await runStorageStartupSafetyCheck(storageProvider);
    await writeStartupRepairReport(storageProvider, startupRepairReport);

    await deps.initializePreferenceService(storageProvider);
    // preferenceService 由 initializePreferenceService 挂到全局/闭包；此处不重复创建

    log('[DESKTOP] Creating model manager...');
    const modelManager = createModelManager(storageProvider);

    log('[DESKTOP] Creating template language service...');
    // preferenceService 必须由调用方在 initializePreferenceService 后提供
    const preferenceService = deps.getPreferenceService();
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

    await deps.setupGlobalProxyDispatcherFromSystem();

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
};
