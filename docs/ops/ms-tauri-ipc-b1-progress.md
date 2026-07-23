# MS-TAURI-IPC-B1 · progress · 2026-07-24

> **任务：** Phase3 B1 `ms-tauri-ipc-b1`（orch `task_fb1ae6b1b9aa`）  
> **分支：** `xvyimu/ms-tauri-ipc-b1`（base: stream tip `83eedc9`）  
> **状态：** SYSTEM_CHANNELS + 窗体必要项已落地  
> **禁守：** 无 push · 未删 Electron · 未换 UI · UI 未散落 `@tauri-apps/api`

---

## 1. Channel 表（B1）

| Channel | Electron | Tauri B1 | 备注 |
|---------|----------|----------|------|
| `config-getEnvironmentVariables` | `getPublicRuntimeConfig` 白名单 | **已实现** | `VITE_(APP\|PUBLIC)_*` + 去敏感段；双写无 `VITE_` 前缀键 |
| `shell-openExternal` | http(s) only | **已有（P0）复核** | 仍只允许带 host 的 http/https |
| `app-get-version` | package.json | **已有（P0）复核** | `app.package_info().version` |
| `app-set-locale` | 重建 app menu + context labels | **已实现（状态）** | 存 `UiLocaleState`；**不**重建原生菜单（见 DEFER） |
| `logs-get-paths` | `userData/logs/*` | **已实现** | `app_data_dir()/logs` + main/desktop/updater/ipc/error |
| `logs-open-directory` | `shell.openPath` | **已实现** | 创建目录后 `open::that` |
| `desktop-ping` | electron shell tag | **已有（P0）** | 非 SYSTEM_CHANNELS 核心，仍在 permission 表 |

Facade 暴露：

| API | 路径 |
|-----|------|
| `desktopAPI.config.getEnvironmentVariables()` | B1 |
| `desktopAPI.app.setLocale(locale)` | B1（可选方法） |
| `desktopAPI.logs.getPaths()` / `openDirectory()` | B1 |
| 既有 P0 | version / preference / shell.openExternal / ping |

---

## 2. 窗体横切

| 项 | Electron | Tauri B1 | 差异 / DEFER |
|----|----------|----------|--------------|
| 标题 | 产品名 | `title: "MindSync"` | 对齐 |
| 默认尺寸 | 1200×800 | 1200×800 | 对齐 |
| 最小尺寸 | Electron 未显式设 | **`minWidth: 800` / `minHeight: 600`** | Tauri 主动加合理下限，避免缩到不可用；**不**与 Electron 冲突 |
| App menu（File/Edit/View/Zoom） | `app-menu.js` + locale 重建 | **DEFER** | 需 `tauri-plugin-menu` 或 Web 侧菜单；locale 状态已预留 |
| Page zoom（Ctrl+/-/0、pinch 锁） | `page-zoom.js` + before-input | **DEFER** | WebView2 缩放 API/快捷键与 Electron `setZoomLevel` 不等价；宜后续 B 批或插件 |
| 输入框 context menu 本地化 | 主进程 Menu | **DEFER** | 依赖原生菜单 + locale；`app-set-locale` 已可被消费 |

---

## 3. 代码落点

| 路径 | 角色 |
|------|------|
| `packages/desktop-tauri/src-tauri/src/system.rs` | B1 四命令 + 白名单/locale 单测 |
| `packages/desktop-tauri/src-tauri/src/lib.rs` | 注册 system handlers + `UiLocaleState` |
| `packages/desktop-tauri/src-tauri/permissions/mindsync-p0.toml` | 放行 B1 命令 |
| `packages/desktop-tauri/src-tauri/capabilities/default.json` | 描述更新 |
| `packages/desktop-tauri/src-tauri/tauri.conf.json` | min 尺寸 |
| `packages/desktop-tauri/src-tauri/Cargo.toml` | `regex` 依赖 |
| `packages/core/src/desktop/commands.ts` | `DESKTOP_SYSTEM_COMMANDS` SSOT |
| `packages/core/src/desktop/types.ts` | config/logs API 类型 |
| `packages/core/src/desktop/backend.ts` | facade 挂载 config/logs/setLocale |
| `packages/core/src/desktop/tauri-backend.ts` | payload map |
| `packages/core/src/desktop/mock.ts` | mock 覆盖 B1 |
| `packages/core/src/desktop/index.ts` | 导出 |
| `packages/core/src/types/global.d.ts` | Window 类型扩展 |
| `packages/core/tests/unit/desktop/facade.test.ts` | B1 契约测 |

**纪律：** UI 仍只经 `@mindsync/core` desktop facade / `withGlobalTauri`；无 `@tauri-apps/api` 直引。

---

## 4. 验证（本消息内实跑）

| 命令 | Exit | 结果 |
|------|-----:|------|
| `pnpm -F @mindsync/core exec vitest run tests/unit/desktop/facade.test.ts tests/unit/desktop/stream.test.ts` | **0** | 2 files · **22** tests passed |
| `node --test scripts/desktop-ipc-handlers.test.mjs` | **0** | **11** pass（Electron IPC 契约仍绿） |
| BuildTools `vcvars64` + `cargo check --manifest-path packages/desktop-tauri/src-tauri/Cargo.toml` | **0** | Finished dev profile |
| 同上 + `cargo test --lib` | **0** | **6** passed（stream×2 + stream_id + public env + locale×2） |

vcvars 路径（本机）：`C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat`

GUI e2e 开窗未强制。

---

## 5. 与 Electron 差异摘要

1. **locale：** Electron 立即重建 application menu；Tauri 仅持久内存 locale，菜单 DEFER。  
2. **logs 路径：** Electron 用 `app.getPath('userData')`；Tauri 用 `path().app_data_dir()`（Tauri 约定目录，通常与 appId 对齐，路径字符串可能不同）。  
3. **env 白名单：** 规则对齐 `runtime-security.js`；进程环境来源为 OS env，非 Electron main 注入的完整 process.env 镜像（同规则过滤）。  
4. **zoom / menu / context-menu：** Electron 完整；Tauri **DEFER**。  
5. **min size：** 仅 Tauri 配置了 800×600。

---

## 6. DEFER → B2 / 后续

| ID | 项 | 理由 |
|----|----|------|
| D-B1-1 | 原生 app menu + zoom 快捷键 | 需 menu 插件或 Web 实现；超出 B1 system invoke 面 |
| D-B1-2 | locale 驱动 menu 文案重建 | 依赖 D-B1-1 |
| D-B1-3 | 输入框右键编辑菜单本地化 | 依赖原生菜单 |
| D-B1-4 | preference 持久化 / 其它域 | B2 范围 |
| D-B1-5 | 真实 LLM stream | B4 |
| D-B1-6 | 密钥路径 | B3 + secrets merge |

---

## 7. 明确不做（本批）

- push  
- 删 `packages/desktop`  
- 换 UI / 实现 B2+ 域  
- 空口完成（上表带 exit code）

---

*B1 ms-tauri-ipc-b1 · 无 push · 2026-07-24*
