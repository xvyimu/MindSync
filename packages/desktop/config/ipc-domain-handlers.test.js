const test = require('node:test');
const assert = require('node:assert/strict');

const { createStreamRegistry } = require('./stream-registry');
const { createOwnedStreamRunner } = require('./ipc/owned-stream-runner');
const { registerLlmIpcHandlers } = require('./ipc/llm-handlers');
const { registerPromptStreamIpcHandlers } = require('./ipc/prompt-stream-handlers');
const { registerModelIpcHandlers } = require('./ipc/model-handlers');
const { registerImageIpcHandlers } = require('./ipc/image-handlers');
const { registerTemplateIpcHandlers } = require('./ipc/template-handlers');
const { registerHistoryIpcHandlers } = require('./ipc/history-handlers');
const { registerFavoriteIpcHandlers } = require('./ipc/favorite-handlers');
const { registerContextIpcHandlers } = require('./ipc/context-handlers');
const { registerDataIpcHandlers } = require('./ipc/data-handlers');
const { registerPromptSyncIpcHandlers } = require('./ipc/prompt-sync-handlers');
const { registerPreferenceIpcHandlers } = require('./ipc/preference-handlers');
const { registerSystemIpcHandlers } = require('./ipc/system-handlers');
const { ALL_DOMAIN_CHANNELS } = require('./ipc/channel-manifest');

/**
 * 创建只记录通道与处理函数的安全 IPC 注册替身。
 */
function createRegistrar() {
  const handlers = new Map();
  const validators = new Map();
  return {
    handlers,
    validators,
    registerSensitiveIpc(channel, handler, validateArgs) {
      handlers.set(channel, handler);
      validators.set(channel, validateArgs);
    },
  };
}

/**
 * 创建可观察流事件的 renderer sender 替身。
 */
function createSender(id = 1) {
  const sent = [];
  return {
    id,
    sent,
    isDestroyed: () => false,
    send: (...args) => sent.push(args),
  };
}

test('LLM backend module registers the stable IPC interface and forwards owned stream events', async () => {
  const registrar = createRegistrar();
  const sender = createSender();
  const streamRegistry = createStreamRegistry();
  const runOwnedStream = createOwnedStreamRunner({ streamRegistry });
  const llmService = {
    testConnection: async () => {},
    sendMessage: async () => 'plain-response',
    sendMessageStructured: async () => ({ content: 'structured-response' }),
    fetchModelList: async () => [{ value: 'model', label: 'Model' }],
    sendMessageStream: async (_messages, _provider, callbacks) => {
      callbacks.onToken('token');
      callbacks.onComplete();
    },
    sendMessageStreamWithTools: async (_messages, _provider, _tools, callbacks) => {
      callbacks.onToolCall({ name: 'tool' });
      callbacks.onComplete();
    },
  };

  registerLlmIpcHandlers({
    registerSensitiveIpc: registrar.registerSensitiveIpc,
    llmService,
    streamRegistry,
    runOwnedStream,
  });

  assert.deepEqual([...registrar.handlers.keys()], [
    'llm-testConnection',
    'llm-sendMessage',
    'llm-sendMessageStructured',
    'llm-fetchModelList',
    'llm-sendMessageStream',
    'llm-sendMessageStreamWithTools',
    'stream-cancel',
  ]);
  assert.equal(
    await registrar.handlers.get('llm-sendMessage')({}, [], 'provider'),
    'plain-response',
  );

  await registrar.handlers.get('llm-sendMessageStream')(
    { sender },
    [],
    'provider',
    'stream_domain',
  );
  // finish 事件必须携带结构化 payload（可为空对象），禁止仅 channel 名
  assert.equal(sender.sent.length, 2);
  assert.deepEqual(sender.sent[0], ['stream-content-stream_domain', 'token']);
  assert.equal(sender.sent[1][0], 'stream-finish-stream_domain');
});

test('LLM backend module forwards the owner AbortSignal to Core', async () => {
  const registrar = createRegistrar();
  const sender = createSender();
  const streamRegistry = createStreamRegistry();
  const runOwnedStream = createOwnedStreamRunner({ streamRegistry });
  let receivedSignal;
  const llmService = {
    testConnection: async () => {},
    sendMessage: async () => '',
    sendMessageStructured: async () => ({ content: '' }),
    fetchModelList: async () => [],
    sendMessageStream: async (_messages, _provider, callbacks, options) => {
      receivedSignal = options?.signal;
      callbacks.onComplete();
    },
    sendMessageStreamWithTools: async () => {},
  };

  registerLlmIpcHandlers({
    registerSensitiveIpc: registrar.registerSensitiveIpc,
    llmService,
    streamRegistry,
    runOwnedStream,
  });

  await registrar.handlers.get('llm-sendMessageStream')(
    { sender },
    [],
    'provider',
    'stream_signal',
  );

  assert.equal(receivedSignal instanceof AbortSignal, true);
});

test('Prompt backend module keeps stream channels sender-owned', async () => {
  const registrar = createRegistrar();
  const sender = createSender();
  const runOwnedStream = createOwnedStreamRunner({
    streamRegistry: createStreamRegistry(),
  });
  const promptService = {
    optimizePromptStream: async (_request, callbacks) => {
      callbacks.onToken('optimized');
      callbacks.onComplete();
    },
    optimizeMessageStream: async () => {},
    iteratePromptStream: async () => {},
    testPromptStream: async () => {},
    testCustomConversationStream: async () => {},
  };

  registerPromptStreamIpcHandlers({
    registerSensitiveIpc: registrar.registerSensitiveIpc,
    promptService,
    runOwnedStream,
  });

  assert.deepEqual([...registrar.handlers.keys()], [
    'prompt-optimizePromptStream',
    'prompt-optimizeMessageStream',
    'prompt-iteratePromptStream',
    'prompt-testPromptStream',
    'prompt-testCustomConversationStream',
  ]);

  // 锁定位置参数式 interface 的 streamId 索引，避免拆分后误校验 contextData。
  assert.doesNotThrow(() => registrar.validators.get('prompt-iteratePromptStream')([
    'original',
    'last-optimized',
    'iterate-input',
    'model',
    'template',
    'stream_iterate',
    { variables: {} },
  ]));
  assert.doesNotThrow(() => registrar.validators.get('prompt-testPromptStream')([
    'system',
    'user',
    'model',
    'stream_test',
  ]));
  assert.throws(
    () => registrar.validators.get('prompt-testPromptStream')([
      'system',
      'user',
      'model',
      undefined,
    ]),
    /Invalid IPC stream identifier/,
  );

  await registrar.handlers.get('prompt-optimizePromptStream')(
    { sender },
    {},
    'stream_prompt',
  );
  assert.equal(sender.sent.length, 2);
  assert.deepEqual(sender.sent[0], ['stream-token-stream_prompt', 'optimized']);
  assert.equal(sender.sent[1][0], 'stream-finish-stream_prompt');
});

test('Prompt backend module forwards the owner AbortSignal to Core', async () => {
  const registrar = createRegistrar();
  const sender = createSender();
  const runOwnedStream = createOwnedStreamRunner({
    streamRegistry: createStreamRegistry(),
  });
  let receivedSignal;
  const promptService = {
    optimizePromptStream: async (_request, callbacks, options) => {
      receivedSignal = options?.signal;
      callbacks.onComplete();
    },
    optimizeMessageStream: async () => {},
    iteratePromptStream: async () => {},
    testPromptStream: async () => {},
    testCustomConversationStream: async () => {},
  };

  registerPromptStreamIpcHandlers({
    registerSensitiveIpc: registrar.registerSensitiveIpc,
    promptService,
    runOwnedStream,
  });

  await registrar.handlers.get('prompt-optimizePromptStream')(
    { sender },
    {},
    'stream_prompt_signal',
  );

  assert.equal(receivedSignal instanceof AbortSignal, true);
});

test('Model backend module registers the stable model IPC interface', async () => {
  const registrar = createRegistrar();
  const calls = [];
  const modelManager = {
    getAllModels: async () => {
      calls.push('getAllModels');
      return [{ id: 'm1' }];
    },
    addModel: async (key, config) => {
      calls.push(['addModel', key, config]);
    },
    updateModel: async (id, updates) => {
      calls.push(['updateModel', id, updates]);
    },
    deleteModel: async (id) => {
      calls.push(['deleteModel', id]);
    },
    ensureInitialized: async () => {
      calls.push('ensureInitialized');
    },
    isInitialized: async () => true,
    getEnabledModels: async () => [{ id: 'm1', enabled: true }],
    exportData: async () => ({ models: [] }),
    importData: async (data) => {
      calls.push(['importData', data]);
    },
    getDataType: () => 'model',
    validateData: async (data) => ({ valid: true, data }),
  };

  registerModelIpcHandlers({
    registerSensitiveIpc: registrar.registerSensitiveIpc,
    modelManager,
    safeSerialize: (value) => value,
  });

  assert.deepEqual([...registrar.handlers.keys()].sort(), [
    'model-addModel',
    'model-deleteModel',
    'model-ensureInitialized',
    'model-exportData',
    'model-getAllModels',
    'model-getDataType',
    'model-getEnabledModels',
    'model-getModels',
    'model-importData',
    'model-isInitialized',
    'model-updateModel',
    'model-validateData',
  ]);

  assert.deepEqual(
    await registrar.handlers.get('model-getAllModels')({}),
    [{ id: 'm1' }],
  );
  assert.equal(
    await registrar.handlers.get('model-addModel')({}, { key: 'k1', name: 'Model' }),
    null,
  );
  assert.deepEqual(calls, [
    'getAllModels',
    ['addModel', 'k1', { name: 'Model' }],
  ]);
});

test('Image backend module registers the stable image IPC interface', async () => {
  const registrar = createRegistrar();
  const imageModelManager = {
    ensureInitialized: async () => {},
    isInitialized: async () => true,
    getAllConfigs: async () => [{ id: 'img-1' }],
    getConfig: async (id) => ({ id }),
    addConfig: async () => {},
    updateConfig: async () => {},
    deleteConfig: async () => {},
    getEnabledConfigs: async () => [{ id: 'img-1', enabled: true }],
    exportData: async () => ({ configs: [] }),
    importData: async () => {},
    getDataType: () => 'image-model',
    validateData: async () => true,
  };
  const imageService = {
    generate: async (request) => ({ ok: true, request }),
    generateText2Image: async () => ({ mode: 't2i' }),
    generateImage2Image: async () => ({ mode: 'i2i' }),
    generateMultiImage: async () => ({ mode: 'multi' }),
    validateRequest: async () => ({ valid: true }),
    validateText2ImageRequest: async () => ({ valid: true }),
    validateImage2ImageRequest: async () => ({ valid: true }),
    validateMultiImageRequest: async () => ({ valid: true }),
    testConnection: async (config) => ({ connected: true, config }),
  };
  const imageAdapterRegistry = {
    getDynamicModels: async (providerId) => [{ id: `${providerId}-dynamic` }],
  };
  const imageUnderstandingService = {
    understand: async (request) => ({ text: 'understood', request }),
  };

  registerImageIpcHandlers({
    registerSensitiveIpc: registrar.registerSensitiveIpc,
    imageModelManager,
    imageService,
    imageAdapterRegistry,
    imageUnderstandingService,
    safeSerialize: (value) => value,
  });

  assert.equal(registrar.handlers.has('image-model-getAllConfigs'), true);
  assert.equal(registrar.handlers.has('image-generate'), true);
  assert.equal(registrar.handlers.has('image-testConnection'), true);
  assert.equal(registrar.handlers.has('image-getDynamicModels'), true);
  assert.equal(registrar.handlers.has('image-understanding-understand'), true);

  assert.deepEqual(
    await registrar.handlers.get('image-generate')({}, { prompt: 'cat' }),
    { ok: true, request: { prompt: 'cat' } },
  );
  assert.deepEqual(
    await registrar.handlers.get('image-getDynamicModels')({}, 'openai', { apiKey: 'x' }),
    [{ id: 'openai-dynamic' }],
  );
  assert.deepEqual(
    await registrar.handlers.get('image-understanding-understand')({}, { image: 'b64' }),
    { text: 'understood', request: { image: 'b64' } },
  );
});

test('Template backend module registers the stable template IPC interface', async () => {
  const registrar = createRegistrar();
  const calls = [];
  const templateManager = {
    listTemplates: async () => [{ id: 't1' }],
    getTemplate: async (id) => ({ id, content: 'old' }),
    saveTemplate: async (template) => {
      calls.push(['saveTemplate', template]);
    },
    deleteTemplate: async (id) => {
      calls.push(['deleteTemplate', id]);
    },
    listTemplatesByType: async (type) => [{ id: 't1', type }],
    exportTemplate: async (id) => JSON.stringify({ id }),
    importTemplate: async () => {},
    exportData: async () => ({ templates: [] }),
    importData: async () => {},
    getDataType: () => 'template',
    validateData: (data) => ({ valid: true, data }),
    changeBuiltinTemplateLanguage: async () => {},
    getCurrentBuiltinTemplateLanguage: async () => 'zh',
    getSupportedBuiltinTemplateLanguages: async () => ['zh', 'en'],
    getSupportedLanguages: (template) => Object.keys(template || {}),
  };

  registerTemplateIpcHandlers({
    registerSensitiveIpc: registrar.registerSensitiveIpc,
    templateManager,
    safeSerialize: (value) => value,
  });

  assert.equal(registrar.handlers.has('template-getTemplates'), true);
  assert.equal(registrar.handlers.has('template-updateTemplate'), true);
  assert.equal(registrar.handlers.has('template-getSupportedLanguages'), true);

  assert.deepEqual(
    await registrar.handlers.get('template-getTemplates')({}),
    [{ id: 't1' }],
  );
  assert.equal(
    await registrar.handlers.get('template-updateTemplate')({}, 't1', { content: 'new' }),
    null,
  );
  assert.deepEqual(calls, [
    ['saveTemplate', { id: 't1', content: 'new' }],
  ]);
});

test('History backend module registers the stable history IPC interface', async () => {
  const historyManager = {
    getRecords: async () => [{ id: 'h1' }],
    addRecord: async (record) => ({ ...record, id: 'h2' }),
    deleteRecord: async () => {},
    clearHistory: async () => {},
    getIterationChain: async (recordId) => [{ id: recordId }],
    getAllChains: async () => [],
    getChain: async (chainId) => ({ id: chainId }),
    createNewChain: async (record) => ({ chainId: 'c1', record }),
    addIteration: async (params) => ({ ok: true, params }),
    deleteChain: async () => {},
    exportData: async () => ({ history: [] }),
    importData: async () => {},
    getDataType: () => 'history',
    validateData: async () => true,
  };

  const historyRegistrar = createRegistrar();
  registerHistoryIpcHandlers({
    registerSensitiveIpc: historyRegistrar.registerSensitiveIpc,
    historyManager,
    safeSerialize: (value) => value,
  });

  assert.equal(historyRegistrar.handlers.has('history-getHistory'), true);
  assert.equal(historyRegistrar.handlers.has('history-addIteration'), true);
  assert.deepEqual(
    await historyRegistrar.handlers.get('history-getHistory')({}),
    [{ id: 'h1' }],
  );
  assert.deepEqual(
    await historyRegistrar.handlers.get('history-createNewChain')({}, { prompt: 'p' }),
    { chainId: 'c1', record: { prompt: 'p' } },
  );
});

test('Favorite backend module registers the stable favorite IPC interface', async () => {
  const registrar = createRegistrar();
  const favoriteManager = {
    addFavorite: async (favorite) => ({ id: 'f1', ...favorite }),
    getFavorites: async () => [{ id: 'f1' }],
    getFavorite: async (id) => ({ id }),
    updateFavorite: async () => {},
    setFavoritePromptAssetCurrentVersion: async () => {},
    deleteFavoritePromptAssetVersion: async () => {},
    deleteFavorite: async () => {},
    deleteFavorites: async () => {},
    incrementUseCount: async () => {},
    getCategories: async () => [{ id: 'c1' }],
    addCategory: async (category) => ({ id: 'c2', ...category }),
    updateCategory: async () => {},
    deleteCategory: async (id) => ({ deleted: id }),
    getStats: async () => ({ total: 1 }),
    searchFavorites: async (keyword) => [{ id: 'f1', keyword }],
    exportFavorites: async () => ({ favorites: [] }),
    importFavorites: async (data) => ({ imported: true, data }),
    getAllTags: async () => ['tag'],
    addTag: async () => {},
    renameTag: async (oldTag, newTag) => ({ oldTag, newTag }),
    mergeTags: async (sourceTags, targetTag) => ({ sourceTags, targetTag }),
    deleteTag: async (tag) => ({ deleted: tag }),
    reorderCategories: async () => {},
    getCategoryUsage: async (categoryId) => ({ categoryId, count: 1 }),
    ensureDefaultCategories: async () => {},
  };

  registerFavoriteIpcHandlers({
    registerSensitiveIpc: registrar.registerSensitiveIpc,
    favoriteManager,
    safeSerialize: (value) => value,
  });

  assert.equal(registrar.handlers.has('favorite-addFavorite'), true);
  assert.equal(registrar.handlers.has('favorite-importFavorites'), true);
  assert.deepEqual(
    await registrar.handlers.get('favorite-addFavorite')({}, { title: 't' }),
    { id: 'f1', title: 't' },
  );
  assert.deepEqual(
    await registrar.handlers.get('favorite-importFavorites')({}, '{"a":1}', { merge: true }),
    { imported: true, data: '{"a":1}' },
  );
});

test('Context backend module registers the stable context IPC interface', async () => {
  const registrar = createRegistrar();
  const contextRepo = {
    list: async () => [{ id: 'c1' }],
    getCurrentId: async () => 'c1',
    setCurrentId: async () => {},
    get: async (id) => ({ id }),
    create: async (meta) => ({ id: 'c2', ...meta }),
    duplicate: async (id) => ({ id: `${id}-copy` }),
    rename: async () => {},
    save: async () => {},
    update: async () => {},
    remove: async () => {},
    exportAll: async () => ({ items: [] }),
    importAll: async () => ({ imported: 1 }),
    exportData: async () => ({ contexts: [] }),
    importData: async () => {},
    getDataType: () => 'context',
    validateData: async () => true,
  };

  registerContextIpcHandlers({
    registerSensitiveIpc: registrar.registerSensitiveIpc,
    contextRepo,
    safeSerialize: (value) => value,
  });

  assert.equal(registrar.handlers.has('context-list'), true);
  assert.deepEqual(
    await registrar.handlers.get('context-create')({}, { title: 'new' }),
    { id: 'c2', title: 'new' },
  );
});

test('Data backend module registers the stable data IPC interface', async () => {
  const registrar = createRegistrar();
  const opened = [];
  const dataManager = {
    exportAllData: async () => ({ all: true }),
    importAllData: async () => {},
  };
  const app = {
    getPath: () => 'C:\\user-data',
  };
  const shell = {
    openPath: async (target) => {
      opened.push(target);
      return '';
    },
  };

  registerDataIpcHandlers({
    registerSensitiveIpc: registrar.registerSensitiveIpc,
    dataManager,
    app,
    shell,
  });

  assert.deepEqual(
    await registrar.handlers.get('data-exportAllData')({}),
    { all: true },
  );
  assert.equal(
    await registrar.handlers.get('data-openStorageDirectory')({}),
    true,
  );
  assert.deepEqual(opened, ['C:\\user-data']);
});

test('Prompt sync backend module registers non-stream prompt channels', async () => {
  const registrar = createRegistrar();
  const promptService = {
    optimizePrompt: async () => 'optimized',
    optimizeMessage: async () => 'message',
    iteratePrompt: async () => 'iterated',
    testPrompt: async () => 'tested',
  };
  const historyManager = {
    getHistory: async () => [{ id: 'h1' }],
    getIterationChain: async (id) => [{ id }],
  };

  registerPromptSyncIpcHandlers({
    registerSensitiveIpc: registrar.registerSensitiveIpc,
    promptService,
    historyManager,
  });

  assert.equal(
    await registrar.handlers.get('prompt-optimizePrompt')({}, { target: 'x' }),
    'optimized',
  );
  assert.deepEqual(
    await registrar.handlers.get('prompt-getHistory')({}),
    [{ id: 'h1' }],
  );
});

test('Preference backend module registers the stable preference IPC interface', async () => {
  const registrar = createRegistrar();
  const preferenceService = {
    get: async (_key, defaultValue) => defaultValue,
    set: async () => {},
    delete: async () => {},
    keys: async () => ['a'],
    clear: async () => {},
    getAll: async () => ({ a: 1 }),
    exportData: async () => ({ prefs: true }),
    importData: async () => {},
    getDataType: () => 'preference',
    validateData: async () => true,
  };

  registerPreferenceIpcHandlers({
    registerSensitiveIpc: registrar.registerSensitiveIpc,
    preferenceService,
    safeSerialize: (value) => value,
  });

  assert.equal(
    await registrar.handlers.get('preference-get')({}, 'theme', 'dark'),
    'dark',
  );
  assert.deepEqual(
    await registrar.handlers.get('preference-keys')({}),
    ['a'],
  );
});

test('System backend module registers config/app/log channels', async () => {
  const registrar = createRegistrar();
  const opened = [];
  let locale = null;

  registerSystemIpcHandlers({
    shell: {
      openExternal: async () => {},
      openPath: async (target) => {
        opened.push(target);
        return '';
      },
    },
    consoleLogger: {
      getLogPaths: () => ({ logDir: 'C:\\logs', mainLog: 'C:\\logs\\main.log' }),
    },
    registerSensitiveIpc: registrar.registerSensitiveIpc,
    getPublicRuntimeConfig: () => ({ VITE_APP_TITLE: 'PO', APP_TITLE: 'PO' }),
    isSafeExternalUrl: (url) => url.startsWith('https://'),
    createIpcError: (code, message) => {
      const error = new Error(message);
      error.code = code;
      return error;
    },
    setUiLocale: (value) => {
      locale = value;
    },
    normalizeUiLocale: (value) => value,
    packageJsonPath: require('path').join(__dirname, '../package.json'),
  });

  assert.equal(registrar.handlers.has('config-getEnvironmentVariables'), true);
  assert.equal(registrar.handlers.has('app-get-version'), true);
  assert.equal(
    await registrar.handlers.get('logs-open-directory')({}),
    true,
  );
  assert.deepEqual(opened, ['C:\\logs']);

  await registrar.handlers.get('app-set-locale')({}, 'zh-CN');
  assert.equal(locale, 'zh-CN');
});

test('channel manifest enumerates unique domain channels', () => {
  assert.equal(new Set(ALL_DOMAIN_CHANNELS).size, ALL_DOMAIN_CHANNELS.length);
  assert.ok(ALL_DOMAIN_CHANNELS.includes('context-list'));
  assert.ok(ALL_DOMAIN_CHANNELS.includes('data-exportAllData'));
  assert.ok(ALL_DOMAIN_CHANNELS.includes('preference-get'));
  assert.ok(ALL_DOMAIN_CHANNELS.includes('app-get-version'));
});
