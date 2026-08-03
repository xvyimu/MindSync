const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const {
  ALLOWED_PRELOAD_EVENT_CHANNELS,
  SECURE_WEB_PREFERENCE_LOCKS,
  createSecureWebPreferences,
  installMainFrameNavigationGuard,
  isAllowedMainFrameNavigation,
  isAllowedPreloadEventChannel,
  isSafeExternalUrl,
  openExternalSafe,
} = require('./window-security');

function createWebContents() {
  const webContents = new EventEmitter();
  webContents.setWindowOpenHandler = (handler) => {
    webContents.windowOpenHandler = handler;
  };
  return webContents;
}

test('production navigation allows only packaged files under the application root', () => {
  const options = {
    isDevelopment: false,
    packagedRoot: 'C:/app/web-dist',
    devServerUrl: 'http://localhost:18181',
  };

  assert.equal(isAllowedMainFrameNavigation('file:///C:/app/web-dist/index.html', options), true);
  assert.equal(isAllowedMainFrameNavigation('file:///C:/app/web-dist/assets/app.js', options), true);
  assert.equal(isAllowedMainFrameNavigation('file:///C:/Windows/System32/notepad.exe', options), false);
  assert.equal(isAllowedMainFrameNavigation('https://attacker.example', options), false);
});

test('development navigation allows only the configured development server origin', () => {
  const options = {
    isDevelopment: true,
    packagedRoot: 'C:/app/web-dist',
    devServerUrl: 'http://localhost:18181',
  };

  assert.equal(isAllowedMainFrameNavigation('http://localhost:18181/workspace', options), true);
  assert.equal(isAllowedMainFrameNavigation('http://localhost:5173/workspace', options), false);
  assert.equal(isAllowedMainFrameNavigation('https://attacker.example', options), false);
});

test('navigation guard prevents untrusted top-level navigation and opens only safe external links', async () => {
  const webContents = createWebContents();
  const openedUrls = [];
  installMainFrameNavigationGuard(webContents, {
    isDevelopment: false,
    packagedRoot: 'C:/app/web-dist',
    devServerUrl: 'http://localhost:18181',
    openExternal: async (url) => openedUrls.push(url),
  });

  let prevented = false;
  webContents.emit('will-navigate', { preventDefault: () => { prevented = true; } }, 'https://docs.example');
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(prevented, true);
  assert.deepEqual(openedUrls, ['https://docs.example']);
  assert.deepEqual(webContents.windowOpenHandler({ url: 'javascript:alert(1)' }), { action: 'deny' });
  assert.deepEqual(webContents.windowOpenHandler({ url: 'https://docs.example/new' }), { action: 'deny' });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(openedUrls, ['https://docs.example', 'https://docs.example/new']);
});

test('isSafeExternalUrl allowlists only bare http(s) with hostname', () => {
  assert.equal(isSafeExternalUrl('https://github.com/xvyimu/MindSync'), true);
  assert.equal(isSafeExternalUrl('http://127.0.0.1:3000/docs'), true);
  assert.equal(isSafeExternalUrl('file:///C:/Windows/System32/notepad.exe'), false);
  assert.equal(isSafeExternalUrl('javascript:alert(1)'), false);
  assert.equal(isSafeExternalUrl('data:text/html,hi'), false);
  assert.equal(isSafeExternalUrl('https://evil@good.example/path'), false);
  assert.equal(isSafeExternalUrl(''), false);
  assert.equal(isSafeExternalUrl(null), false);
});

test('openExternalSafe throws on non-http(s) and never calls shell', async () => {
  const opened = [];
  await assert.rejects(
    () => openExternalSafe({ openExternal: async (u) => opened.push(u) }, 'file:///tmp/x'),
    (err) => err && err.code === 'IPC_UNSAFE_EXTERNAL_URL',
  );
  assert.deepEqual(opened, []);
  await openExternalSafe({ openExternal: async (u) => opened.push(u) }, 'https://example.com');
  assert.deepEqual(opened, ['https://example.com']);
});

test('createSecureWebPreferences locks isolation baseline and requires preload', () => {
  const prefs = createSecureWebPreferences({
    preload: 'C:/app/preload.js',
    // Hostile overrides must not win.
    nodeIntegration: true,
    contextIsolation: false,
    sandbox: false,
    webSecurity: false,
    allowRunningInsecureContent: true,
    experimentalFeatures: true,
    extraOption: 'kept',
  });

  assert.equal(prefs.preload, 'C:/app/preload.js');
  assert.equal(prefs.extraOption, 'kept');
  assert.equal(prefs.nodeIntegration, false);
  assert.equal(prefs.contextIsolation, true);
  assert.equal(prefs.sandbox, true);
  assert.equal(prefs.webSecurity, true);
  assert.equal(prefs.allowRunningInsecureContent, false);
  assert.equal(prefs.experimentalFeatures, false);
  assert.deepEqual(SECURE_WEB_PREFERENCE_LOCKS, {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
  });
  assert.throws(
    () => createSecureWebPreferences({}),
    /non-empty preload path/,
  );
});

test('preload event channel allowlist matches updater subscription surface', () => {
  for (const channel of ALLOWED_PRELOAD_EVENT_CHANNELS) {
    assert.equal(isAllowedPreloadEventChannel(channel), true);
  }
  assert.equal(isAllowedPreloadEventChannel('preference-service-warning'), false);
  assert.equal(isAllowedPreloadEventChannel('stream-token-stream_1'), false);
  assert.equal(isAllowedPreloadEventChannel(''), false);
  assert.equal(isAllowedPreloadEventChannel(null), false);
  assert.deepEqual([...ALLOWED_PRELOAD_EVENT_CHANNELS].sort(), [
    'update-available-info',
    'update-download-progress',
    'update-downloaded',
    'update-error',
    'update-not-available',
    'updater-download-started',
  ].sort());
});
