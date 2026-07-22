# W2 · MindSync · 架构/栈升级 · Claude

| 项 | 值 |
|----|-----|
| **Agent** | claude |
| **日期** | 2026-07-23 |
| **Worktree（绝对路径）** | `C:\Users\yuanjia\orca\workspaces\mindsync\w2-ms-claude` |
| **Branch** | `xvyimu/w2-ms-claude` |
| **Tip（开工）** | `2b7cd413a8bc2f21ef7063b5041250fc7fdc927d` · `chore(docs): W1 stack-matrix + CURRENT tip + pnpm align` |
| **Tip（本波结束）** | 以 `git rev-parse HEAD` 为准（若已 commit） |
| **主线** | `develop`（合入 / push 由总控） |
| **Remote** | `origin` → `git@github.com:xvyimu/MindSync.git` |
| **题单** | `D:\orca\.planning\portfolio-arch-upgrade-2026h2\prompts\w2-ms.md` + `w2-shared.md` |
| **蓝图** | `task_plan.md` · `repos/ms.md` · `w1-scores.md` · W1 报告 tip `2b7cd41` |

> 独立 worktree · solo · **未 push** · **未 asar 覆盖** · **未默认开 redesign 生产** · **未 Docker 真推**。

---

## 1. 做了什么

### 1.1 AI-Core 发行 ADR（Mode A/B/C）

- **新增** [`docs/ops/adr-ai-core-distribution-w2.md`](./adr-ai-core-distribution-w2.md)
  - **A Accepted（默认）**：开发者自启 sidecar；终端用户安装包无 AI-Core
  - **B Deferred**：可选捆绑 · W3+ 人 gate · 禁止默认 ON
  - **C Rejected as default**：远程/容器非默认；桌面拒非 loopback；Web 镜像不含 Python
  - 默认 UX + 非目标 + 安全契约 + 演进波次
- 同步 [`ai-core-distribution-contract.md`](./ai-core-distribution-contract.md)（链 ADR · B/C 措辞）
- 代码锚点：`DISTRIBUTION_MODE = 'A'` · `toPublicAiCoreStatus().distributionMode`

### 1.2 IPC 全绿 · S3 假红硬化

| 项 | 说明 |
|----|------|
| **历史假红** | 空/残缺 `node_modules` 时 top-level `require('@aws-sdk/client-s3')` → MODULE_NOT_FOUND（wave6 假红；W1 装通后 11/11 绿） |
| **W2 硬化** | `packages/desktop/remote-storage.js`：**懒加载** AWS SDK（`loadS3Sdk` 内 `require`）；模块装载与静态 Gate 不再依赖 SDK 已装 |
| **契约** | 仍保留字面量 `require('@aws-sdk/client-s3')` 供 Gate grep；测试断言 top-level 前缀无 require |
| **结论** | 全量 `desktop-ipc-handlers` **11/11 pass · exit 0**；无「仍缺项」阻断列表 |

### 1.3 Status / runbook 健康集成

| 面 | 变更 |
|----|------|
| **Public status** | `enabled` · `baseUrl` · `error` · **`distributionMode: 'A'`** · **`lastHealth`**（probe 后缓存；默认 `null`；**无 bearer**） |
| **IPC** | `ai-core-probe-health` 写 `lastHealth`；`ai-core-get-status` 读出（桌面 status 面板可消费） |
| **Runbook** | [`ai-core-local-sidecar-runbook.md`](./ai-core-local-sidecar-runbook.md) 联调表 + 全量 IPC 命令 |
| **stack-matrix** | 增 **W2** 列（发行 ADR · IPC · status） |

### 1.4 stack-matrix / CURRENT

- [`stack-matrix-2026-07.md`](./stack-matrix-2026-07.md)：波次标 W1+W2；W2 列写清已做与不做
- [`docs/project/CURRENT.md`](../project/CURRENT.md)：分支 → `xvyimu/w2-ms-claude`

---

## 2. 没做什么

| 禁止项 | 状态 |
|--------|------|
| push / force-push / 开 PR / merge `develop` | 未做 |
| asar 覆盖 · 真 NSIS Release | 未做 |
| redesign 生产默认 ON | 未做 |
| Docker 真推 / publish / re-publish-runtime | 未做 |
| AI-Core 打进 asar / Docker Web | 未做 |
| Mode B 默认捆绑 / Mode C 远程生产 | 未做（ADR 明确） |
| Python uv/poetry 锁文件 | 留给 W3 |
| Vue 生产评测按钮接 stub | 未做 |
| Electron major / 换前端框架 | 未做 |

---

## 3. 验证命令与 exit code

| 命令 | Exit | 结果 |
|------|-----:|------|
| `git rev-parse HEAD`（开工） | 0 | `2b7cd413a8bc2f21ef7063b5041250fc7fdc927d` |
| `git rev-parse --abbrev-ref HEAD` | 0 | `xvyimu/w2-ms-claude` |
| `node -v` | 0 | `v24.16.0` |
| `pnpm -v` | 0 | `11.5.3` |
| `python --version` | 0 | `3.14.5` |
| `pnpm check:docs` | **0** | 8 子脚本全 OK · 2.11.7 一致 |
| `python -m pytest services/ai-core/tests -q` | **0** | **9 passed**（3 Starlette/httpx deprecation warnings） |
| `node --test packages/desktop/config/ai-core-config.test.js packages/desktop/config/ai-core-client.test.js` | **0** | **9/9**（含 distributionMode + lastHealth） |
| `node --test scripts/desktop-ipc-handlers.test.mjs`（全量） | **0** | **11/11**（S3 lazy · AI-Core fail-closed · lastHealth） |
| `node --test packages/desktop/config/remote-storage.test.js` | **0** | **3/3** |

**验收对照题单：** ADR 存在 · IPC 测结论明确（**全绿**）· `check:docs` 0 · 无 asar/push。

---

## 4. 变更文件清单

| 路径 | 动作 |
|------|------|
| `docs/ops/adr-ai-core-distribution-w2.md` | **新增** ADR |
| `docs/ops/w2-arch-upgrade-mindsync-claude.md` | **本报告** |
| `docs/ops/ai-core-distribution-contract.md` | 链 ADR · B/C · status 字段 |
| `docs/ops/ai-core-local-sidecar-runbook.md` | status API 表 · 全量 IPC |
| `docs/ops/stack-matrix-2026-07.md` | W2 列 |
| `docs/project/CURRENT.md` | 分支 / tip 行 |
| `packages/desktop/remote-storage.js` | AWS SDK 懒加载 |
| `packages/desktop/config/ai-core-config.js` | `DISTRIBUTION_MODE` · status 扩展 |
| `packages/desktop/config/ai-core-config.test.js` | status 断言 |
| `packages/desktop/config/ipc/ai-core-handlers.js` | `lastHealth` 缓存 |
| `scripts/desktop-ipc-handlers.test.mjs` | lastHealth · lazy S3 契约 |

---

## 5. IPC 结论（阻断列表）

**无阻断。** 全量 11/11 绿。

| 域 | 状态 |
|----|------|
| preload ↔ main handlers | 绿 |
| streaming / composition / manifest | 绿 |
| remote-storage S3 / WebDAV / GDrive reject | 绿（SDK 懒加载） |
| preference bridge | 绿 |
| AI-Core fail-closed + lastHealth | 绿 |

历史 s3 假红：**环境装通即绿（W1）**；**模块装载不依赖 SDK（W2）**。

---

## 6. 总控接手

1. 审本分支 diff → 决定 commit（若本 agent 已 commit 则审 tip）→ 合 `develop`
2. **勿**本 agent push；asar / 生产 flip / Mode B 仍人 gate
3. W3 建议：Python 锁文件 · 可选本地模型 flag · Mode B 仅设计/spike

---

## 7. 停止点

W2 题单交付完成；证据表 §3；**未 push** · **未 asar**。
