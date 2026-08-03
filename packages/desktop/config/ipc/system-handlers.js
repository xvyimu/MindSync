const path = require('path');

/**
 * 注册应用信息、运行时配置、外链和日志相关 IPC。
 * 全部经 registerSensitiveIpc：sender 校验 + 统一错误信封。
 */
function registerSystemIpcHandlers({
  registerSensitiveIpc,
  shell,
  consoleLogger,
  getPublicRuntimeConfig,
  isSafeExternalUrl,
  createIpcError,
  setUiLocale,
  normalizeUiLocale,
  packageJsonPath = path.join(__dirname, '../../package.json'),
}) {
  registerSensitiveIpc('config-getEnvironmentVariables', async () => {
    const publicEnv = getPublicRuntimeConfig(process.env);
    console.log('[Main Process] Public runtime configuration requested by UI process');
    console.log(`[Main Process] Returning ${Object.keys(publicEnv).length / 2} public VITE_* variables (with no-prefix duplicates)`);
    return publicEnv;
  });

  registerSensitiveIpc('shell-openExternal', async (_event, url) => {
    // 二次门闩：校验已在 args validator；此处再拦以防注入绕过
    if (!isSafeExternalUrl(url)) {
      throw createIpcError('IPC_UNSAFE_EXTERNAL_URL', 'Blocked non-http(s) external URL');
    }
    await shell.openExternal(url);
    return true;
  }, ([url]) => {
    if (typeof url !== 'string' || !isSafeExternalUrl(url)) {
      throw createIpcError('IPC_INVALID_ARGUMENT', 'Invalid IPC request arguments');
    }
  });

  registerSensitiveIpc('app-get-version', async () => {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const packageJson = require(packageJsonPath);
    return packageJson.version;
  });

  registerSensitiveIpc('app-set-locale', async (_event, locale) => {
    setUiLocale(normalizeUiLocale(locale) || 'en-US');
    return null;
  });

  // logs-get-paths / logs-open-directory intentionally not registered:
  // no preload surface and no renderer consumer (surface closed 2026-07-24).
  // consoleLogger remains in the signature for call-site stability.
  void consoleLogger;
}

module.exports = {
  registerSystemIpcHandlers,
};
