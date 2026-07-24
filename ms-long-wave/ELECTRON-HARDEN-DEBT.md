# MindSync · Electron 硬化债表（G0=B）

| 项 | 值 |
|----|-----|
| **门闩** | **G0 = B**（2026-07-24 人闸）· 放弃换壳主线 · **只做 Electron 硬化** |
| **默认交付** | **Electron** · 禁拆 `packages/desktop` 主路径 |
| **基线 tip** | `221b767` · `develop` / `origin/develop` |
| **版本** | 2.11.7 |
| **栈** | Electron + Vue3 + Naive + Vite + Pinia + `@mindsync/core` · pnpm |
| **禁** | 新开 `ms-tauri-*` 实现 wt · 续 Phase3 · asar 重打 · 无授权 push develop · React 平行 UI · AI-Core 默认 asar |
| **Tauri 归档** | 可只读 `xvyimu/ms-tauri-*` tip 对照 · **不续实现** |

---

## 切片（一模块一 wt · live ≤3）

| 序 | 模块 ID | wt 名 | 边界 | 验收要点 | 状态 |
|----|---------|-------|------|----------|------|
| 1 | **M-MS-harden-ipc** | `ms-harden-ipc` | `packages/desktop/config/ipc/**` · preload · 契约测 | 通道表 + 未授权面收敛 | **DONE** · `881cca9` · origin · 合入待人 |
| 2 | **M-MS-harden-secrets** | `ms-harden-secrets` | `safe-storage-secrets.js` · model/image-model 密钥路径 · 日志扫 | safeStorage 边界 · 密钥不进 log · 测 | **DONE** · `6da7ecd`/`fcb35a0` · origin · 合入待人 |
| 3 | **M-MS-harden-abort** | `ms-harden-abort` | stream-cancel · owned-stream-runner · core Abort | 流式 Abort **可测**路径绿 | **DONE** · `bf8e419` · origin · 合入待人 |
| 4 | **M-MS-harden-preload-csp** | `ms-harden-preload-csp` | preload · webPreferences · window-security | 隔离/CSP 审计+小修 | **DONE** · `5132986` · origin |
| 5 | **M-MS-harden-updater-surface** | `ms-harden-updater-surface` | update-handlers · update-config | 更新路径审计+小修 | **live** |
| 6 | **M-MS-core-api-boundary** | `ms-core-api-boundary` | core exports / electron 子路径 | 边界与泄漏面 | **DONE** · `f375cee`/`6638045` · origin |
| 7 | **M-MS-test-gate-stabilize** | `ms-test-gate-stabilize` | core 既有红测 | gate 红修 | **DONE** · `6257056` · origin |
| 8 | **M-MS-ext-mcp-smoke-docs** | `ms-ext-mcp-smoke-docs` | extension / mcp-server | 冒烟说明 | **DONE** · `131260b` · origin |
| 9 | **M-MS-deps-audit** | `ms-deps-audit` | residual deps 文档 | 审计不升 major | **DONE** · `d871aee` · origin |
| 10 | **M-MS-electron-harden-verify** | `ms-electron-harden-verify` | 综合 gate 矩阵 | 回归 evidence | **live** |
| 4–11 | 见 `WEEK-BACKLOG.md` W4–W11 | — | preload-csp / updater / core API / test gate / ext-mcp / deps / verify / 文档收口 | 一周续航 | **queued** |

触及面：`pnpm -F @mindsync/desktop` 既有 node test / `pnpm -F @mindsync/core test:gate` 等 · evidence 落 `docs/ops/ms-harden-*-evidence-YYYY-MM-DD.md` · commit · **不** asar · **不** push develop 除非另授。

---

## 继承债（本波可顺手，非主刀）

| ID | 债 | 与本波关系 |
|----|-----|------------|
| D-TEST-CORE6 | core 6 fail（含 cancellation / tool-calls） | **abort 切片**优先碰 cancellation |
| D-UI-TSC | CodeMirror 双版本 | 本波不碰除非阻塞 |
| D-DOCS-TIP | CURRENT tip lag | 可选 docs-only 子刀 · 非阻塞 |
| D-DEPS-RES | esbuild / hono major | **不**本波升 major |
| T-* | Tauri fleet / dirty ADR 文档 | **冻结** · 不实现 · dirty 文档不阻塞 harden wt（base develop tip） |

---

## IPC 硬化焦点（给 M1）

| 焦点 | 路径 | 已知事实 |
|------|------|----------|
| 协议 | `channel-manifest.js` · **1.1.0** | 领域 invoke ~160 · 默认 runtime **不**强制 assert（兼容） |
| 安全包装 | `ipc-security.js` · `registerSensitiveIpc` | sender 主 frame + URL 门闩 |
| 装配 | `register-domain-handlers.js` + `*-handlers.js` | 域拆分 |
| 测 | `packages/desktop/config/*.test.js` · `scripts/desktop-ipc-handlers.test.mjs` | day-quality：89 + 11 绿 |
| 未授权面 | preload 暴露 vs manifest vs main `ipcMain.handle` | scout：对齐缺口 = 本刀主产出 |

---

## 不做

- 换壳实现 / 删 Electron / 双壳功能双写  
- 假绿 · 无 exit code 的完成声明  
- stop `D:\orca` / `name:orca`
