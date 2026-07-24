const path = require('path');
const { fileURLToPath } = require('url');

/** 允许交给系统浏览器的外链协议（显式 allowlist；禁 file:/javascript:/data: 等）。 */
const SAFE_EXTERNAL_PROTOCOLS = Object.freeze(['http:', 'https:']);

/**
 * 仅允许具备主机名的 HTTP/HTTPS 地址交给系统浏览器。
 * 拒绝：file: · javascript: · data: · 空串 · 无 hostname · 非字符串。
 */
function isSafeExternalUrl(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) {
    return false;
  }
  try {
    const url = new URL(value);
    if (!SAFE_EXTERNAL_PROTOCOLS.includes(url.protocol)) {
      return false;
    }
    // 拒绝 userinfo 钓鱼（https://evil@good.example）与空 host
    if (!url.hostname || url.username || url.password) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 校验后 openExternal；不安全 URL 抛 IPC 友好错误（不打开）。
 * @param {{ openExternal: (url: string) => Promise<void> }} shellLike
 * @param {string} url
 */
async function openExternalSafe(shellLike, url) {
  if (!isSafeExternalUrl(url)) {
    const err = new Error('Blocked non-http(s) external URL');
    err.code = 'IPC_UNSAFE_EXTERNAL_URL';
    throw err;
  }
  await shellLike.openExternal(url);
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
  installMainFrameNavigationGuard,
  isAllowedMainFrameNavigation,
  isSafeExternalUrl,
  openExternalSafe,
  SAFE_EXTERNAL_PROTOCOLS,
};
