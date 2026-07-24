# MindSync · Electron 硬化 · 一周续航 BACKLOG

| 项 | 值 |
|----|-----|
| **G0** | **B** · Electron 硬化（禁换壳实现） |
| **北极星** | IPC / 密钥 / Abort / 减负 / 测试门闩 · 默认交付 Electron |
| **周期** | ~7 日续航 · 日循环：收 DONE → 审 evidence → stop/rm child → 开下一项 |
| **live 上限** | **≤3** |
| **基线** | develop tip 随整合推进；开波 `221b767` |
| **红线** | 禁新开 Tauri 实现 wt · 禁 React 平行 UI · 禁 asar 重打 · 禁 push develop 除非另授 · 不拆 `packages/desktop` 主路径 |

进度 SSOT：`progress.md` · 债表 `ELECTRON-HARDEN-DEBT.md` · 整合 `INTEGRATE.md`

---

## 切片顺序（W1–W11）

| # | wt / 模块 | 目标 | 边界摘要 | 状态 |
|---|-----------|------|----------|------|
| **W1** | `ms-harden-ipc` · M-MS-harden-ipc | manifest / 通道清单 / 未授权面 | desktop IPC + preload 暴露 + 契约测 | **DONE · 总控审通过** · `881cca9` · 待合入 |
| **W2** | `ms-harden-secrets` · M-MS-harden-secrets | safeStorage / keytar 边界 · 密钥不进日志 | `safe-storage-secrets.js` · model/image-model 密钥路径 · 日志扫 | **DONE** · `6da7ecd`+`fcb35a0` · origin tip · 审过 |
| **W3** | `ms-harden-abort` | 流式 Abort 可测 | stream-cancel · owned-stream-runner · core cancellation | **live** · term_d1332e27… · base `221b767` |
| **W4** | `ms-harden-preload-csp` | preload 面与上下文隔离 | preload · webPreferences · CSP 相关 | queued |
| **W5** | `ms-harden-updater-surface` | 更新路径审计 | update-handlers · 只文档+安全小修 | queued |
| **W6** | `ms-core-api-boundary` | `@mindsync/core` 边界与泄漏面 | core 公开 API / electron 子路径 | queued |
| **W7** | `ms-test-gate-stabilize` | pnpm gate 红/慢修 | core 6 fail 等 · 触及面 | queued |
| **W8** | `ms-ext-mcp-smoke-docs` | 扩展/MCP 入口冒烟说明 | docs + 既有 smoke · **不换栈** | queued |
| **W9** | `ms-deps-audit` | 依赖审计 · 无用可选依赖说明 | residual 卡对照 · **禁大爆炸升级** | queued |
| **W10** | `ms-electron-harden-verify` | 综合 gate | 全波触及面回归 | queued |
| **W11** | 文档收口 | 刷新 DEBT + INTEGRATE 终态 | `ms-long-wave/*` · ops evidence 索引 | queued |

---

## 日循环（总控）

1. `orca terminal list` / 读 worker progress + evidence  
2. 审核门：边界 · gate exit · 无密钥 · evidence · 验收  
3. DONE → `orca terminal stop`（仅该 wt）→ `orca worktree rm --force`（child）  
4. 更新 INTEGRATE / progress / 本 BACKLOG 状态  
5. live <3 时 `orca worktree create --repo name:MindSync --name ms-<短名> --no-parent --agent claude --prompt …`  
6. **永不** stop `name:orca` / `path:D:\orca`  
7. 合 develop / push：**人另授**

---

## W1 回执（已收）

| 项 | 值 |
|----|-----|
| branch | `xvyimu/ms-harden-ipc` |
| commit | **`881cca9`** `fix(desktop): harden IPC surface — drop ghost channels, expose openReleasePage` |
| invoke | 160→**156** · preload ≡ manifest ≡ secure |
| 动作 | 删 4 幽灵 channel · 补 `updater.openReleasePage` · 契约测加固 · matrix+evidence |
| 协议 | **1.1.0** 未 bump |
| 总控复跑 | 见 progress 日志（config 89 · ipc-handlers 13 · domain+security 21） |
| 风险 | 旧名直接 invoke 失败（预期收敛） |
| 合入 | **pending 人授** · 不 push develop |

---

## 不做

- Tauri Phase3 / 新 `ms-tauri-*` 实现  
- AI-Core 默认 asar · glass 默认 ON  
- 假绿 · 无 exit code 完成声明  

---

## 变更日志

| 时点 | 事件 |
|------|------|
| 2026-07-24 | 建 WEEK-BACKLOG · W1 DONE 审过 · 派 W2 secrets |
| 2026-07-24 | W1 wt stop/rm · branch 保留 `881cca9` · secrets create ok |
| 2026-07-24 催办 | W2 DONE 审过 · push feature tips · 开 W3 abort |
