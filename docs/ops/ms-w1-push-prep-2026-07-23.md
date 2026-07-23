# MS-W1 · push 前预检 · 2026-07-23

> **范围：** 复核 MS-W1 CURRENT tip 对齐在 `develop` 上是否可交付。**未 push。**  
> **禁止已守：** `git push` · asar 重打 · redesign/glass 默认 ON · 生产密钥 · 恢复 upstream。

## 结论：**READY**（人可口头授权 `push develop`）

本地 `develop` 干净树，ahead **5** vs `origin/develop`。全部契约/测试绿；唯一「FAIL」是 tip 自指门闩，为 **lag-1 预期**（见下）。

## 将推送的 commit（`origin/develop..HEAD`）

| # | commit | 说明 |
|---|--------|------|
| 1 | `82043f3` | MS-W1 align CURRENT tip/branch to develop live |
| 2 | `80eafcf` | re-pin CURRENT tip to MS-W1 content commit |
| 3 | `1826519` | MS-W1 evidence + re-pin CURRENT tip to 80eafcf |
| 4 | `dc97d2a` | refresh MS-W1 evidence tip table after land |
| 5 | 本轮 HEAD | **本轮**：re-pin CURRENT tip to `dc97d2a` + 本证据（restore lag-1，单 commit 同 W4 `1826519`） |

父基线：`d760c2d`（D1 README hub · = `origin/develop`）。全为 **docs-only**；无业务代码 / 依赖 / flag 默认改动。  
第 5 条本轮 commit hash 以 `git rev-parse --short HEAD` 为准（含本证据 md，故 amend 后前移）。

## 本轮改动（step 5 最小修复）

进树时 CURRENT tip 行钉 `80eafcf`，而 HEAD 已到 `dc97d2a` → **lag-2**（`dc97d2a` 只刷了证据表却未 re-pin tip 行）。  
按 W4 自指惯例修复为 **lag-1**：tip 行 → `dc97d2a`，与本证据 md 合入**同一** commit（本轮 HEAD）；doc tip 落在其父 `dc97d2a` = lag-1。

## 验证（exit · 本轮实跑）

| 命令 | Exit | 备注 |
|------|-----:|------|
| `pnpm check:docs`（全 9 子脚本） | **1** | 仅 `check-docs-current-tip` FAIL；余 8 全绿 |
| `pnpm check:docs-tip`（提交后） | **1** | doc `dc97d2a` ≠ HEAD（本轮 commit）→ **lag-1 预期** |
| `uv run --extra dev pytest`（`services/ai-core`） | **0** | **9 passed** |
| `node --test …/ai-core-config.test.js …/ai-core-client.test.js` | **0** | **10/10** |
| `node --test scripts/desktop-ipc-handlers.test.mjs` | **0** | **11/11** |

### tip 自指门闩说明（与 W4 同）

`check-docs-current-tip` 要求文档 tip hash = 当前 git HEAD 短前缀。把 tip 写进 commit 后 HEAD 前移，干净树必然 **滞后 1 次提交**。  
push `develop` 后若 CI 强制该门闩：在 `origin/develop` 上再补一行 CURRENT tip=push 后 HEAD 的 commit，或在内容 commit 树上跑检。此为已知惯例，非回归。

## push 前检查表

- [x] 工作树干净（`git status` clean）
- [x] 仅 docs-only commit（无代码/依赖/flag 改动）
- [x] AI-Core pytest 绿（9）
- [x] ai-core node 契约绿（10）· desktop-ipc-handlers 绿（11）
- [x] docs 门闩除 tip 外 8/8 绿
- [x] tip 自指为 lag-1 预期（已恢复）
- [x] 未恢复 upstream · 未开 PR · 单仓 `origin`
- [ ] **`git push`** — 待人口头授权（本 agent 不执行）

## DEFER

| 项 | 原因 |
|----|------|
| push `develop` | 等人说 push |
| asar / R5 / Mode B | 人 gate / 另题 |
| Dependabot open alerts | 另刀 |
