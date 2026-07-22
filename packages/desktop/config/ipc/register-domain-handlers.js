/**
 * 集中注册 Desktop 领域 IPC handlers。
 * main 只负责 registerSensitiveIpc 工厂、config.js 拦截与 update 注册。
 */

const { registerLlmIpcHandlers } = require('./llm-handlers');
const { registerPromptStreamIpcHandlers } = require('./prompt-stream-handlers');
const { registerPromptSyncIpcHandlers } = require('./prompt-sync-handlers');
const { registerModelIpcHandlers } = require('./model-handlers');
const { registerImageIpcHandlers } = require('./image-handlers');
const { registerTemplateIpcHandlers } = require('./template-handlers');
const { registerHistoryIpcHandlers } = require('./history-handlers');
const { registerFavoriteIpcHandlers } = require('./favorite-handlers');
const { registerContextIpcHandlers } = require('./context-handlers');
const { registerDataIpcHandlers } = require('./data-handlers');
const { registerPreferenceIpcHandlers } = require('./preference-handlers');
const { registerSystemIpcHandlers } = require('./system-handlers');
const { registerAiCoreIpcHandlers } = require('./ai-core-handlers');

/**
 * @param {object} ctx
 * @param {(channel: string, handler: Function, validateArgs?: Function) => void} ctx.registerSensitiveIpc
 * @param {object} ctx.services — DesktopCoreServices 字段
 * @param {object} ctx.streamRegistry
 * @param {Function} ctx.runOwnedStream
 * @param {Function} ctx.safeSerialize
 * @param {Function} ctx.assertValidStreamId
 * @param {typeof import('electron').app} ctx.app
 * @param {typeof import('electron').shell} ctx.shell
 * @param {object} ctx.consoleLogger
 * @param {Function} ctx.getPublicRuntimeConfig
 * @param {Function} ctx.isSafeExternalUrl
 * @param {Function} ctx.createIpcError
 * @param {(locale: string|null) => void} ctx.setUiLocale
 * @param {Function} ctx.normalizeUiLocale
 * @param {Function} [ctx.setupUpdateHandlers]
 * @param {() => import('../ai-core-config').AiCoreConfig} [ctx.getAiCoreConfig]
 * @param {() => object|null} [ctx.getAiCoreClient]
 */
function registerDomainIpcHandlers(ctx) {
  const {
    registerSensitiveIpc,
    services,
    streamRegistry,
    runOwnedStream,
    safeSerialize,
    assertValidStreamId,
    app,
    shell,
    consoleLogger,
    getPublicRuntimeConfig,
    isSafeExternalUrl,
    createIpcError,
    setUiLocale,
    normalizeUiLocale,
    setupUpdateHandlers,
    getAiCoreConfig,
    getAiCoreClient,
  } = ctx;

  const {
    llmService,
    promptService,
    historyManager,
    preferenceService,
    modelManager,
    imageModelManager,
    imageService,
    imageAdapterRegistry,
    imageUnderstandingService,
    templateManager,
    contextRepo,
    favoriteManager,
    dataManager,
  } = services;

  registerLlmIpcHandlers({
    registerSensitiveIpc,
    llmService,
    streamRegistry,
    runOwnedStream,
  });

  registerPromptStreamIpcHandlers({
    registerSensitiveIpc,
    promptService,
    runOwnedStream,
  });

  registerPromptSyncIpcHandlers({
    registerSensitiveIpc,
    promptService,
    historyManager,
  });

  registerPreferenceIpcHandlers({
    registerSensitiveIpc,
    preferenceService,
    safeSerialize,
  });

  registerModelIpcHandlers({
    registerSensitiveIpc,
    modelManager,
    safeSerialize,
  });

  registerImageIpcHandlers({
    registerSensitiveIpc,
    imageModelManager,
    imageService,
    imageAdapterRegistry,
    imageUnderstandingService,
    safeSerialize,
    streamRegistry,
    assertValidStreamId,
  });

  registerTemplateIpcHandlers({
    registerSensitiveIpc,
    templateManager,
    safeSerialize,
  });

  registerHistoryIpcHandlers({
    registerSensitiveIpc,
    historyManager,
    safeSerialize,
  });

  registerContextIpcHandlers({
    registerSensitiveIpc,
    contextRepo,
    safeSerialize,
  });

  registerFavoriteIpcHandlers({
    registerSensitiveIpc,
    favoriteManager,
    safeSerialize,
  });

  registerDataIpcHandlers({
    registerSensitiveIpc,
    dataManager,
    app,
    shell,
  });

  registerSystemIpcHandlers({
    registerSensitiveIpc,
    shell,
    consoleLogger,
    getPublicRuntimeConfig,
    isSafeExternalUrl,
    createIpcError,
    setUiLocale,
    normalizeUiLocale,
  });

  if (typeof getAiCoreConfig === 'function' && typeof getAiCoreClient === 'function') {
    registerAiCoreIpcHandlers({
      registerSensitiveIpc,
      getAiCoreConfig,
      getAiCoreClient,
      createIpcError,
      safeSerialize,
    });
  }

  if (typeof setupUpdateHandlers === 'function') {
    setupUpdateHandlers();
  }
}

module.exports = {
  registerDomainIpcHandlers,
};
