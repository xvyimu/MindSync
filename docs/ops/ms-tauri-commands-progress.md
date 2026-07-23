# MS-TAURI-COMMANDS · progress · 2026-07-24

> **任务：** M2-impl `ms-tauri-commands`（orch `task_29f8c53fecea`）  
> **分支：** `xvyimu/ms-tauri-commands`（base: shell + merged facade）  
> **状态：** P0 实现完成；原 agent exit -1，总控补 capabilities 权限文件 + 验证 + 本地 commit  
> **禁守：** 无 push · 未删 Electron · 未换 UI

## 交付

| 层 | 内容 |
|----|------|
| Rust P0 | `app-get-version` · `preference-get/set`（内存）· `desktop-ping` · `shell-openExternal`（http/https only） |
| 信封 | `{ success, data }` / `{ success:false, error:{code,message} }` |
| TS | `createTauriDesktopBackend` · `tryInstallTauriDesktopApi` · web `main.ts` 挂载前安装 |
| Electron | 可选 `desktop-ping` polyfill（manifest/system/preload） |
| ACL | `permissions/mindsync-p0.toml` + capability `allow-mindsync-p0`（修复 inline permission 导致 build fail） |

## 验证（本机实跑）

| 命令 | Exit |
|------|-----:|
| `pnpm -F @mindsync/core exec vitest run tests/unit/desktop/facade.test.ts` | **0** · 15 pass |
| `node --test scripts/desktop-ipc-handlers.test.mjs` | **0** · 11 pass |
| `vcvars64` + `cargo check --manifest-path packages/desktop-tauri/src-tauri/Cargo.toml` | **0** |

GUI e2e 开窗未强制；`pnpm dev:desktop-tauri` 在 vcvars 下可人工验。

## Stream wt 接口提示

- 流式仍走 Electron `owned-stream-runner` 模型为目标；Tauri 侧下一步：`streamId` + cancel command + event emit。  
- P0 invoke 名表 SSOT：`DESKTOP_P0_COMMANDS` in `@mindsync/core`。  
- 新 command 须同步：Rust handler · permissions toml · capability · `tauri-backend` payload map。

## 风险

| 风险 | 缓解 |
|------|------|
| preference 仅内存 | M5 B2 再持久化 |
| agent 崩溃未写 progress | 总控补本文 |
| capability 自定义 permission 路径 | 用 `src-tauri/permissions/*.toml` 非 inline object |
