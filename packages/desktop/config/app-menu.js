const DEFAULT_LOCALE = 'en-US';

const MENU_STRINGS = Object.freeze({
  'en-US': {
    file: '&File',
    edit: '&Edit',
    view: '&View',
    viewMac: 'View',
    window: '&Window',
    reload: 'Reload',
    forceReload: 'Force Reload',
    toggleDevTools: 'Toggle Developer Tools',
    togglefullscreen: 'Toggle Full Screen',
    minimize: 'Minimize',
    close: 'Close',
    zoomActualSize: 'Actual Size',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    quit: 'Quit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
  },
  'zh-CN': {
    file: '文件(&F)',
    edit: '编辑(&E)',
    view: '视图(&V)',
    viewMac: '视图',
    window: '窗口(&W)',
    reload: '重新加载',
    forceReload: '强制重新加载',
    toggleDevTools: '切换开发者工具',
    togglefullscreen: '切换全屏',
    minimize: '最小化',
    close: '关闭',
    zoomActualSize: '实际大小',
    zoomIn: '放大',
    zoomOut: '缩小',
    quit: '退出',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
  },
  'zh-TW': {
    file: '檔案(&F)',
    edit: '編輯(&E)',
    view: '檢視(&V)',
    viewMac: '檢視',
    window: '視窗(&W)',
    reload: '重新載入',
    forceReload: '強制重新載入',
    toggleDevTools: '切換開發人員工具',
    togglefullscreen: '切換全螢幕',
    minimize: '最小化',
    close: '關閉',
    zoomActualSize: '實際大小',
    zoomIn: '放大',
    zoomOut: '縮小',
    quit: '結束',
    undo: '復原',
    redo: '重做',
    cut: '剪下',
    copy: '複製',
    paste: '貼上',
    selectAll: '全選',
  },
});

function pickStrings(locale) {
  if (typeof locale === 'string' && Object.prototype.hasOwnProperty.call(MENU_STRINGS, locale)) {
    return MENU_STRINGS[locale];
  }
  return MENU_STRINGS[DEFAULT_LOCALE];
}

function buildPageZoomMenuItems({ onPageZoomAction = () => {}, strings = MENU_STRINGS[DEFAULT_LOCALE] } = {}) {
  const items = [
    { label: strings.zoomActualSize, accelerator: 'CommandOrControl+0', action: 'reset' },
    { label: strings.zoomIn, accelerator: 'CommandOrControl+Plus', action: 'zoomIn' },
    { label: strings.zoomOut, accelerator: 'CommandOrControl+-', action: 'zoomOut' },
  ];
  return items.map(({ label, accelerator, action }) => ({
    label,
    accelerator,
    click: (_menuItem, browserWindow) => onPageZoomAction(action, browserWindow?.webContents),
  }));
}

function buildFileSubmenu(strings, isMac) {
  return {
    label: isMac ? strings.file.replace(/&/g, '') : strings.file,
    submenu: [
      isMac ? { role: 'close', label: strings.close } : { role: 'quit', label: strings.quit },
    ],
  };
}

function buildEditSubmenu(strings, isMac) {
  return {
    label: isMac ? strings.edit.replace(/&/g, '') : strings.edit,
    submenu: [
      { role: 'undo', label: strings.undo },
      { role: 'redo', label: strings.redo },
      { type: 'separator' },
      { role: 'cut', label: strings.cut },
      { role: 'copy', label: strings.copy },
      { role: 'paste', label: strings.paste },
      { role: 'selectAll', label: strings.selectAll },
    ],
  };
}

function buildWindowSubmenu(strings, isMac) {
  return {
    label: isMac ? strings.window.replace(/&/g, '') : strings.window,
    submenu: [
      { role: 'minimize', label: strings.minimize },
      { role: 'close', label: strings.close },
    ],
  };
}

function buildAppMenuTemplate({
  isMac = process.platform === 'darwin',
  onPageZoomAction,
  locale = DEFAULT_LOCALE,
} = {}) {
  const strings = pickStrings(locale);
  return [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    buildFileSubmenu(strings, isMac),
    buildEditSubmenu(strings, isMac),
    {
      label: isMac ? strings.viewMac : strings.view,
      submenu: [
        { role: 'reload', label: strings.reload },
        { role: 'forceReload', label: strings.forceReload },
        { role: 'toggleDevTools', label: strings.toggleDevTools },
        { type: 'separator' },
        ...buildPageZoomMenuItems({ onPageZoomAction, strings }),
        { type: 'separator' },
        { role: 'togglefullscreen', label: strings.togglefullscreen },
      ],
    },
    buildWindowSubmenu(strings, isMac),
  ];
}

function getPageZoomShortcutAction(input) {
  if (!input || input.type !== 'keyDown') return null;
  if (!(input.control || input.meta) || input.alt) return null;

  const key = typeof input.key === 'string' ? input.key : '';
  const code = typeof input.code === 'string' ? input.code : '';

  if (key === '0' || code === 'Digit0' || code === 'Numpad0') {
    return 'reset';
  }

  if (key === '-' || key === '_' || code === 'Minus' || code === 'NumpadSubtract') {
    return 'zoomOut';
  }

  if (
    key === '+' ||
    key === '=' ||
    key === 'Plus' ||
    code === 'Equal' ||
    code === 'NumpadAdd'
  ) {
    return 'zoomIn';
  }

  return null;
}

function shouldBlockPageZoomShortcut(input) {
  return getPageZoomShortcutAction(input) !== null;
}

module.exports = {
  buildAppMenuTemplate,
  buildPageZoomMenuItems,
  getPageZoomShortcutAction,
  shouldBlockPageZoomShortcut,
  MENU_STRINGS,
};
