const { createIpcError } = require('../ipc-security');

/**
 * 注册文本模型管理相关的 Desktop IPC interface。
 * 经 registerSensitiveIpc：sender 校验 + 统一错误信封（handler 只返回 data / throw）。
 *
 * @param {object} dependencies 模型领域注册依赖。
 */
function registerModelIpcHandlers({
  registerSensitiveIpc,
  modelManager,
  safeSerialize,
}) {
  const assertId = (id) => {
    if (typeof id !== 'string' || id.trim().length === 0 || id.length > 256) {
      throw createIpcError('IPC_INVALID_ARGUMENT', 'Invalid IPC request arguments');
    }
  };

  registerSensitiveIpc('model-addModel', async (_event, model) => {
    const safeModel = safeSerialize(model);
    const { key, ...config } = safeModel || {};
    assertId(key);
    await modelManager.addModel(key, config);
    return null;
  }, ([model]) => {
    if (model == null || typeof model !== 'object') {
      throw createIpcError('IPC_INVALID_ARGUMENT', 'Invalid IPC request arguments');
    }
  });

  registerSensitiveIpc('model-updateModel', async (_event, id, updates) => {
    const safeUpdates = safeSerialize(updates);
    await modelManager.updateModel(id, safeUpdates);
    return null;
  }, ([id]) => assertId(id));

  registerSensitiveIpc('model-deleteModel', async (_event, id) => {
    await modelManager.deleteModel(id);
    return null;
  }, ([id]) => assertId(id));

  registerSensitiveIpc('model-ensureInitialized', async () => {
    await modelManager.ensureInitialized();
    return null;
  });

  registerSensitiveIpc('model-isInitialized', async () => modelManager.isInitialized());

  registerSensitiveIpc('model-getAllModels', async () => modelManager.getAllModels());

  registerSensitiveIpc('model-getEnabledModels', async () => modelManager.getEnabledModels());

  registerSensitiveIpc('model-exportData', async () => modelManager.exportData());

  registerSensitiveIpc('model-importData', async (_event, data) => {
    const safeData = safeSerialize(data);
    await modelManager.importData(safeData);
    return null;
  });

  registerSensitiveIpc('model-getDataType', async () => modelManager.getDataType());

  registerSensitiveIpc('model-validateData', async (_event, data) => {
    const safeData = safeSerialize(data);
    return modelManager.validateData(safeData);
  });
}

module.exports = {
  registerModelIpcHandlers,
};
