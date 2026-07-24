const path = require('path');
const { fileURLToPath } = require('url');

/**
 * BrowserWindow webPreferences 安全基线。
 * 调用方只能附加 preload 路径等非危险字段；隔离相关开关被强制锁定。
 */
const SECURE_WEB_PREFERENCE_LOCKS = Object.freeze({
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
});

/**
 * renderer 经 electronAPI.on/off 可订阅的 main→renderer 事件白名单。
 * 流式 channel（`stream-*-${streamId}`）仅由 preload 内部监听，不经此入口。
 * 与 packages/ui useUpdater 实际订阅保持同步。
 */
const ALLOWED_PRELOAD_EVENT_CHANNELS = Object.freeze([
  'update-available-info',
  'update-not-available',
  'update-download-progress',
  'update-downloaded',
  'update-error',
  'updater-download-started',
]);

/** 仅允许具备主机名的 HTTP/HTTPS 地址交给系统浏览器。 */
function isSafeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/** 判断候选文件路径是否位于指定应用根目录内。 */
function isPathWithin(candidatePath, rootPath) {
  // Normalize so Windows drive case / separators / trailing sep don't fail trust.
  let candidate = path.resolve(candidatePath);
  let root = path.resolve(rootPath);
  if (process.platform === 'win32') {
    candidate = candidate.toLowerCase();
    root = root.toLowerCase();
  }
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

/** 校验主 frame 导航是否属于当前开发源或打包应用目录。 */
function isAllowedMainFrameNavigation(targetUrl, options) {
  try {
    const url = new URL(targetUrl);
    if (options.isDevelopment) {
      return url.origin === new URL(options.devServerUrl).origin;
    }

    return url.protocol === 'file:'
      && isPathWithin(fileURLToPath(url), options.packagedRoot);
  } catch {
    return false;
  }
}

/**
 * 构造锁定隔离基线的 webPreferences。
 * 即使 overrides 试图打开 nodeIntegration / 关闭 contextIsolation 也会被覆盖。
 */
function createSecureWebPreferences(overrides = {}) {
  const preload = overrides && overrides.preload;
  if (typeof preload !== 'string' || preload.length === 0) {
    throw new Error('createSecureWebPreferences requires a non-empty preload path');
  }

  return {
    ...overrides,
    ...SECURE_WEB_PREFERENCE_LOCKS,
    preload,
  };
}

/** 判断 channel 是否允许经 electronAPI.on/off 暴露给 renderer。 */
function isAllowedPreloadEventChannel(channel) {
  return typeof channel === 'string' && ALLOWED_PRELOAD_EVENT_CHANNELS.includes(channel);
}

/** 安装顶层导航、新窗口和 webview 的统一 Electron 安全门禁。 */
function installMainFrameNavigationGuard(webContents, options) {
  /** 将通过协议校验的外部地址交给系统浏览器，并隔离打开失败。 */
  const openExternal = (url) => {
    if (!isSafeExternalUrl(url)) {
      return;
    }

    void Promise.resolve(options.openExternal(url)).catch(() => {});
  };

  webContents.on('will-navigate', (event, targetUrl) => {
    if (isAllowedMainFrameNavigation(targetUrl, options)) {
      return;
    }

    event.preventDefault();
    openExternal(targetUrl);
  });

  webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });

  webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
}

module.exports = {
  ALLOWED_PRELOAD_EVENT_CHANNELS,
  SECURE_WEB_PREFERENCE_LOCKS,
  createSecureWebPreferences,
  installMainFrameNavigationGuard,
  isAllowedMainFrameNavigation,
  isAllowedPreloadEventChannel,
  isSafeExternalUrl,
};
