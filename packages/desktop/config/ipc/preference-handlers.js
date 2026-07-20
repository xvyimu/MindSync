/**
 * 注册偏好设置相关的 Desktop IPC interface。
 * 经 registerSensitiveIpc：sender 校验 + 统一错误信封。
 */
function registerPreferenceIpcHandlers({
  registerSensitiveIpc,
  preferenceService,
  safeSerialize,
}) {
  registerSensitiveIpc('preference-get', async (_event, key, defaultValue) => {
    return preferenceService.get(key, defaultValue);
  });

  registerSensitiveIpc('preference-set', async (_event, key, value) => {
    await preferenceService.set(key, value);
    return null;
  });

  registerSensitiveIpc('preference-delete', async (_event, key) => {
    await preferenceService.delete(key);
    return null;
  });

  registerSensitiveIpc('preference-keys', async () => preferenceService.keys());

  registerSensitiveIpc('preference-clear', async () => {
    await preferenceService.clear();
    return null;
  });

  registerSensitiveIpc('preference-getAll', async () => preferenceService.getAll());

  registerSensitiveIpc('preference-exportData', async () => preferenceService.exportData());

  registerSensitiveIpc('preference-importData', async (_event, data) => {
    const safeData = safeSerialize(data);
    await preferenceService.importData(safeData);
    return null;
  });

  registerSensitiveIpc('preference-getDataType', async () => preferenceService.getDataType());

  registerSensitiveIpc('preference-validateData', async (_event, data) => {
    const safeData = safeSerialize(data);
    return preferenceService.validateData(safeData);
  });
}

module.exports = {
  registerPreferenceIpcHandlers,
};
