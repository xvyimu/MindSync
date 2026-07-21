/**
 * createCoreServices 契约测试：mock core 工厂，不启动 Electron GUI。
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const SERVICE_CONTAINER_PATH = require.resolve('./service-container');
const SAFE_STORAGE_PATH = require.resolve('./safe-storage-secrets');

/**
 * 创建最小 mock core：按真实装配顺序可调用，返回可辨识 stub。
 */
function createMockCore(overrides = {}) {
  const order = [];
  const track = (name, impl) => (...args) => {
    order.push(name);
    return impl(...args);
  };

  const preferenceService = { id: 'preference' };
  const modelManager = {
    id: 'modelManager',
    ensureInitialized: async () => {
      order.push('modelManager.ensureInitialized');
    },
  };
  const templateLanguageService = {
    id: 'templateLanguage',
    initialize: async () => {
      order.push('templateLanguage.initialize');
    },
  };

  class PreferenceService {
    constructor(storage) {
      order.push('PreferenceService');
      this.storage = storage;
      Object.assign(this, preferenceService);
    }
  }

  class FileStorageProvider {
    constructor(path) {
      order.push('FileStorageProvider');
      this.path = path;
    }
  }

  class FavoriteManager {
    constructor(storage) {
      order.push('FavoriteManager');
      this.storage = storage;
      this.id = 'favoriteManager';
    }
  }

  const core = {
    PreferenceService,
    FileStorageProvider,
    FavoriteManager,
    createSecretAwareStorageProvider: track('createSecretAwareStorageProvider', (file, codec) => ({
      id: 'secretStorage',
      file,
      codec,
      ensureSecretsSealed: async () => ({ rewritten: [] }),
    })),
    runStorageStartupSafetyCheck: track('runStorageStartupSafetyCheck', async () => ({ ok: true })),
    writeStartupRepairReport: track('writeStartupRepairReport', async () => {}),
    createModelManager: track('createModelManager', () => modelManager),
    createTemplateLanguageService: track('createTemplateLanguageService', () => templateLanguageService),
    createTemplateManager: track('createTemplateManager', () => ({ id: 'templateManager' })),
    createHistoryManager: track('createHistoryManager', () => ({ id: 'historyManager' })),
    createImageAdapterRegistry: track('createImageAdapterRegistry', () => ({ id: 'imageAdapterRegistry' })),
    createImageModelManager: track('createImageModelManager', () => ({
      id: 'imageModelManager',
      ensureInitialized: async () => {
        order.push('imageModelManager.ensureInitialized');
      },
    })),
    createLLMService: track('createLLMService', () => ({ id: 'llmService' })),
    createImageUnderstandingService: track('createImageUnderstandingService', () => ({
      id: 'imageUnderstandingService',
    })),
    createPromptService: track('createPromptService', () => ({ id: 'promptService' })),
    createImageService: track('createImageService', () => ({ id: 'imageService' })),
    createContextRepo: track('createContextRepo', () => ({ id: 'contextRepo' })),
    createDataManager: track('createDataManager', () => ({ id: 'dataManager' })),
    CUSTOM_API_PATTERN: /^VITE_CUSTOM_API_(KEY|BASE_URL|MODEL)_(.+)$/,
    SUFFIX_PATTERN: /^[a-zA-Z0-9_-]+$/,
    MAX_SUFFIX_LENGTH: 32,
    ...overrides,
  };

  return { core, order };
}

function loadCreateCoreServices() {
  // 确保每次测试拿到干净 module 实例（safe-storage 无状态，可复用）
  delete require.cache[SERVICE_CONTAINER_PATH];
  // eslint-disable-next-line import/no-dynamic-require
  return require(SERVICE_CONTAINER_PATH).createCoreServices;
}

test('createCoreServices success returns ok:true bag with preferenceService and promptService', async () => {
  const createCoreServices = loadCreateCoreServices();
  const { core, order } = createMockCore();
  let proxyCalled = false;

  const result = await createCoreServices({
    core,
    getUserDataPath: () => '/tmp/po-user-data',
    safeStorage: null,
    setupGlobalProxyDispatcherFromSystem: async () => {
      proxyCalled = true;
      order.push('proxy');
    },
    convertImageInputWithElectronNativeImage: async () => null,
    env: {},
    log: () => {},
  });

  assert.equal(result.ok, true);
  assert.ok(result.services);
  assert.equal(result.services.preferenceService.id, 'preference');
  assert.equal(result.services.promptService.id, 'promptService');
  assert.equal(result.services.dataManager.id, 'dataManager');
  assert.equal(result.services.storageProvider.id, 'secretStorage');
  assert.equal(proxyCalled, true);

  // Preference 必须在 template language 之前；proxy 在 LLM 之前
  const prefIdx = order.indexOf('PreferenceService');
  const langIdx = order.indexOf('createTemplateLanguageService');
  const proxyIdx = order.indexOf('proxy');
  const llmIdx = order.indexOf('createLLMService');
  assert.ok(prefIdx >= 0 && langIdx > prefIdx);
  assert.ok(proxyIdx >= 0 && llmIdx > proxyIdx);
});

test('createCoreServices factory throw returns ok:false', async () => {
  const createCoreServices = loadCreateCoreServices();
  const { core } = createMockCore({
    createModelManager: () => {
      throw new Error('boom-model');
    },
  });

  const result = await createCoreServices({
    core,
    getUserDataPath: () => '/tmp/po-user-data',
    env: {},
    log: () => {},
  });

  assert.equal(result.ok, false);
  assert.ok(result.error instanceof Error);
  assert.match(result.error.message, /boom-model/);
});

test('createCoreServices falls back to FileStorageProvider when secret wrapper missing', async () => {
  const createCoreServices = loadCreateCoreServices();
  const { core } = createMockCore({
    createSecretAwareStorageProvider: undefined,
  });

  const result = await createCoreServices({
    core,
    getUserDataPath: () => '/tmp/po-plain',
    env: {},
    log: () => {},
  });

  assert.equal(result.ok, true);
  assert.equal(result.services.storageProvider.path, '/tmp/po-plain');
  assert.equal(result.services.preferenceService.id, 'preference');
});

// 防止误删 safe-storage 依赖
test('safe-storage-secrets module still loads', () => {
  const mod = require(SAFE_STORAGE_PATH);
  assert.equal(typeof mod.createElectronSafeStorageCodec, 'function');
});

// 抑制 unused lint noise on Module if tools scan it
void Module;
