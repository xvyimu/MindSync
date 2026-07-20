/**
 * 注册会话上下文相关的 Desktop IPC interface。
 * 经 registerSensitiveIpc：sender 校验 + 统一错误信封。
 */
function registerContextIpcHandlers({
  registerSensitiveIpc,
  contextRepo,
  safeSerialize,
}) {
  registerSensitiveIpc('context-list', async () => contextRepo.list());

  registerSensitiveIpc('context-getCurrentId', async () => contextRepo.getCurrentId());

  registerSensitiveIpc('context-setCurrentId', async (_event, id) => {
    await contextRepo.setCurrentId(id);
    return null;
  });

  registerSensitiveIpc('context-get', async (_event, id) => contextRepo.get(id));

  registerSensitiveIpc('context-create', async (_event, meta) => {
    const safeMeta = meta ? safeSerialize(meta) : undefined;
    return contextRepo.create(safeMeta);
  });

  registerSensitiveIpc('context-duplicate', async (_event, id, options) => {
    const safeOptions = options ? safeSerialize(options) : undefined;
    return contextRepo.duplicate(id, safeOptions);
  });

  registerSensitiveIpc('context-rename', async (_event, id, title) => {
    await contextRepo.rename(id, title);
    return null;
  });

  registerSensitiveIpc('context-save', async (_event, ctx) => {
    await contextRepo.save(safeSerialize(ctx));
    return null;
  });

  registerSensitiveIpc('context-update', async (_event, id, patch) => {
    await contextRepo.update(id, safeSerialize(patch));
    return null;
  });

  registerSensitiveIpc('context-remove', async (_event, id) => {
    await contextRepo.remove(id);
    return null;
  });

  registerSensitiveIpc('context-exportAll', async () => contextRepo.exportAll());

  registerSensitiveIpc('context-importAll', async (_event, bundle, mode) => {
    return contextRepo.importAll(safeSerialize(bundle), mode);
  });

  registerSensitiveIpc('context-exportData', async () => contextRepo.exportData());

  registerSensitiveIpc('context-importData', async (_event, data) => {
    await contextRepo.importData(safeSerialize(data));
    return null;
  });

  registerSensitiveIpc('context-getDataType', async () => contextRepo.getDataType());

  registerSensitiveIpc('context-validateData', async (_event, data) => {
    return contextRepo.validateData(safeSerialize(data));
  });
}

module.exports = {
  registerContextIpcHandlers,
};
