const { createIpcError } = require('../ipc-security');

/**
 * 注册数据导入导出与本地存储信息相关的 Desktop IPC interface。
 * 经 registerSensitiveIpc：sender 校验 + 统一错误信封（handler 只返回 data / throw）。
 *
 * @param {object} dependencies 数据领域注册依赖。
 */
function registerDataIpcHandlers({
  registerSensitiveIpc,
  dataManager,
  app,
  shell,
}) {
  registerSensitiveIpc('data-exportAllData', async (_event, options) => {
    // options 可选：{ includeSecrets?: boolean }；默认脱敏
    const safeOptions =
      options && typeof options === 'object' && !Array.isArray(options)
        ? { includeSecrets: options.includeSecrets === true }
        : {};
    return dataManager.exportAllData(safeOptions);
  });

  registerSensitiveIpc('data-importAllData', async (_event, dataString) => {
    await dataManager.importAllData(dataString);
    return null;
  }, ([dataString]) => {
    if (typeof dataString !== 'string') {
      throw createIpcError('IPC_INVALID_ARGUMENT', 'Invalid IPC request arguments');
    }
  });

  registerSensitiveIpc('data-getStorageInfo', async () => {
    const fs = require('fs');
    const path = require('path');
    const userDataPath = app.getPath('userData');
    const mainFilePath = path.join(userDataPath, 'prompt-optimizer-data.json');
    const backupFilePath = path.join(userDataPath, 'prompt-optimizer-data.json.backup');

    const statSafe = async (targetPath) => {
      try {
        const stats = await fs.promises.stat(targetPath);
        return typeof stats?.size === 'number' ? stats.size : 0;
      } catch {
        return 0;
      }
    };

    const mainSizeBytes = await statSafe(mainFilePath);
    const backupSizeBytes = await statSafe(backupFilePath);

    return {
      userDataPath,
      mainFilePath,
      mainSizeBytes,
      backupFilePath,
      backupSizeBytes,
      totalBytes: mainSizeBytes + backupSizeBytes,
    };
  });

  registerSensitiveIpc('data-openStorageDirectory', async () => {
    const userDataPath = app.getPath('userData');
    await shell.openPath(userDataPath);
    return true;
  });
}

module.exports = {
  registerDataIpcHandlers,
};
