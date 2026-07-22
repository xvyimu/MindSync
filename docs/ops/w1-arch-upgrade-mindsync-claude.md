# W1 · MindSync · 架构/栈升级 · Claude

| 项 | 值 |
|----|-----|
| **Agent** | claude |
| **日期** | 2026-07-23 |
| **Worktree（绝对路径）** | `C:\Users\yuanjia\orca\workspaces\mindsync\w1-ms-claude` |
| **Branch** | `xvyimu/w1-ms-claude` |
| **Tip（开工）** | `bed4ac4aca53812a7805c41bc67b01dbbb19e0f8` · `docs(ops): wave8 AI-Core local sidecar runbook (mode A)` |
| **Tip（本波结束）** | 见 commit 后 `git rev-parse HEAD`（本文件随 commit 落盘） |
| **主线** | `develop`（合入 / push 由总控） |
| **Remote** | `origin` → `git@github.com:xvyimu/MindSync.git` |
| **题单** | `D:\orca\.planning\portfolio-arch-upgrade-2026h2\prompts\w1-ms.md` + `w1-shared.md` |
| **蓝图** | `task_plan.md` · `repos/ms.md` · `crosscut.md` |

> 独立 worktree · solo · **未 push** · **未 asar 覆盖** · **未默认开 redesign 生产** · **未 Docker 真推**。

---

## 1. 做了什么

### 1.1 stack-matrix

- 新增 [`docs/ops/stack-matrix-2026-07.md`](./stack-matrix-2026-07.md)
  - Node **24** · pnpm · Electron **41** · Vue **3.5** / Vite **8** · AI-Core Python
  - 列：当前 → 半年目标 → **本波已做**
  - 明确不做 + W2 挂钩

### 1.2 CURRENT tip SSOT

- [`docs/project/CURRENT.md`](../project/CURRENT.md)
  - 日期 → **2026-07-23**
  - 分支 → feature `xvyimu/w1-ms-claude`（主线仍 develop）
  - **本仓 tip SSOT** 与 `git rev-parse --short HEAD` 对齐（修陈旧 `700643a`）
  - 远端 develop tip 改为「以 origin 复核」参考行（本波未 push）

### 1.3 pnpm 11.5 对齐 spike → **可装通，已升级**

| 字段 | 值 |
|------|-----|
| **改前** | `packageManager`: `pnpm@10.6.1` |
| **改后** | `packageManager`: `pnpm@11.5.3`（11.5 线补丁；目标「11.5」） |
| **本机** | corepack prepare → `pnpm -v` = **11.5.3** · Node **v24.16.0** |
| **lock** | `lockfileVersion: '9.0'` **未变**（11.5 可消费；`pnpm install` resolution skipped / up to date） |
| **首装** | 首次 `pnpm install` 下包成功后 **exit 1**：`ERR_PNPM_IGNORED_BUILDS`（electron / esbuild / msw / protobufjs / electron-winstaller） |
| **修复** | `pnpm approve-builds --all`；`pnpm-workspace.yaml`：`allowBuilds: {electron,electron-winstaller,esbuild,msw,protobufjs: true}`；**移除**与 allow 冲突的 `ignoredBuiltDependencies` |
| **再装** | `pnpm install` **exit 0**（905ms · Already up to date） |
| **CI** | `pnpm/action-setup@v4` 读 `packageManager` · 无需另钉 version |
| **回滚** | 还原 `packageManager` + `pnpm-workspace.yaml` · `corepack prepare pnpm@10.6.1 --activate` |

**结论：** 升 11.5 **无结构性阻断**。必做配套是 workspace **allowBuilds**（pnpm 11 忽略 package.json `pnpm` 字段；旧 `ignoredBuiltDependencies` 会挡 postinstall）。

### 1.4 回归（本 worktree 实跑）

见 §3。契约测 / check:docs / AI-Core pytest / **IPC 全量（含 S3）** 均 **exit 0**。

### 1.5 可选：IPC 全量假红（s3）根因

| 项 | 说明 |
|----|------|
| **历史假红** | wave6：`node --test scripts/desktop-ipc-handlers.test.mjs` 全量 4 fail · `@aws-sdk/client-s3` **MODULE_NOT_FOUND**（空/残缺 `node_modules`，非契约回归） |
| **根因一句** | remote-storage 测试 `import` 真实 `@aws-sdk/client-s3`；未 `pnpm install` 时模块缺失即红；测试本体已用注入 mock `S3Client`，**不缺 mock 设计** |
| **本波** | 干净 `pnpm install`（11.5.3）后 **11/11 pass** · **exit 0** |
| **最小 mock** | **不需再改代码**；环境装通即绿。若未来要「无 install 可跑静态 Gate」可把 SDK require 再懒加载，**非 W1 范围** |

---

## 2. 没做什么

| 禁止项 | 状态 |
|--------|------|
| push / force-push / 开 PR / merge `develop` | 未做 |
| asar 覆盖 · 真 NSIS Release | 未做 |
| redesign 生产默认 ON | 未做 |
| Docker 真推 / publish | 未做 |
| AI-Core 打进 asar / Docker Web | 未做 |
| Electron major / 换前端框架 | 未做 |
| Python 锁文件（uv/poetry） | 留给 W2 |
| AI-Core 发行 ADR 深化 | 留给 W2 |

---

## 3. 验证命令与 exit code

| 命令 | Exit | 结果 |
|------|-----:|------|
| `git rev-parse HEAD`（开工） | 0 | `bed4ac4aca53812a7805c41bc67b01dbbb19e0f8` |
| `git rev-parse --abbrev-ref HEAD` | 0 | `xvyimu/w1-ms-claude` |
| `node -v` | 0 | `v24.16.0` |
| `corepack prepare pnpm@11.5.3 --activate` · `pnpm -v` | 0 | `11.5.3` |
| `pnpm install`（approve 后） | **0** | Already up to date · 7 workspace projects |
| `pnpm check:docs` | **0** | 8 子脚本全 OK · 2.11.7 一致 |
| `python -m pytest services/ai-core/tests -q` | **0** | **9 passed**（3 Starlette/httpx deprecation warnings） |
| `node --test packages/desktop/config/ai-core-config.test.js packages/desktop/config/ai-core-client.test.js` | **0** | **9/9** |
| `node --test --test-name-pattern "preload IPC\|streaming contract\|composition root\|channel manifest\|preference bridge\|avoids renderer" scripts/desktop-ipc-handlers.test.mjs` | **0** | **6/6** |
| `node --test scripts/desktop-ipc-handlers.test.mjs`（全量） | **0** | **11/11**（含 S3/WebDAV/AI-Core fail-closed） |
| `node --test packages/desktop/config/*.test.js` | **0** | **88/88** |

**验收对照题单：** CURRENT tip 对齐 · check:docs 0 · 契约测 0 · stack-matrix · pnpm 结论明确（**已升 11.5.3 并装通**）。

---

## 4. 变更文件清单

| 路径 | 动作 |
|------|------|
| `docs/ops/stack-matrix-2026-07.md` | **新增** |
| `docs/ops/w1-arch-upgrade-mindsync-claude.md` | **本报告** |
| `docs/project/CURRENT.md` | tip / 日期 / 分支 SSOT |
| `package.json` | `packageManager` → `pnpm@11.5.3` |
| `pnpm-workspace.yaml` | `allowBuilds` 放行 + 去掉冲突 `ignoredBuiltDependencies` |

`pnpm-lock.yaml`：**无 diff**（resolution 未重写）。

---

## 5. 总控接手

1. 审本分支 diff → 决定 commit（若本 agent 已 commit 则审 tip）→ 合 `develop`
2. **勿**本 agent push；asar / 生产 flip 仍人 gate
3. W2 建议：Python 依赖锁 + AI-Core status 进桌面探针 + Electron 安全补丁窗

---

## 6. 停止点

W1 题单交付完成；证据表 §3；**未 push**。
