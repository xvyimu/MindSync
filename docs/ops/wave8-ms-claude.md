# Wave8 · MindSync · Claude

| 项 | 值 |
|----|-----|
| **Agent** | claude |
| **日期** | 2026-07-22 |
| **Worktree** | `C:\Users\yuanjia\orca\workspaces\mindsync\wave8-ms-claude` |
| **Branch** | `xvyimu/wave8-ms-claude` |
| **Tip（开工）** | `80d78c85c92bfd36f35e0eb28ed351f488f1edff` · `test(desktop): absorb Dual-B Codex fail-closed AI-Core IPC handlers` |
| **主线** | `develop`（合入由总控） |
| **Remote** | `origin` → `git@github.com:xvyimu/MindSync.git` |
| **题单** | `D:\orca\.planning\wave8-crosscut\prompts\ms.md` + `_shared.md` |

> 独立 worktree 一刀。未 push / 未 merge develop / 未真 publish / 未覆盖 asar。

---

## 1. 做了什么

### 1.1 模式 A 本地 sidecar 最短 runbook

- 新增 [`docs/ops/ai-core-local-sidecar-runbook.md`](./ai-core-local-sidecar-runbook.md)
  - venv → `AI_CORE_LOCAL_DEV=1` → `uvicorn … 127.0.0.1:8091` → `curl /health` + `ai-core-smoke.cjs`
  - 可选 bearer 配对、桌面 `.env.local` 联调、无 Electron 契约测试表、故障速查
  - 明确不做：asar / 生产默认 URL / Vue 评测接线 / 真 publish

### 1.2 契约入口链出

- [`docs/ops/ai-core-distribution-contract.md`](./ai-core-distribution-contract.md) §4 顶部增加 runbook 推荐入口链接（正文命令块保留）

### 1.3 验证（本 worktree 实跑）

见 §3。

---

## 2. 没做什么（题单 + 共享禁区）

- 未真 asar 覆盖、未默认打开 AI-Core 进生产路径
- 未 push / force-push / 开 PR / merge `develop`
- 未真 publish 镜像、未动 D7、未改生产 CSP/RLS、未做 ISS 功能
- 未实现 prompt-optimize 桌面 client/IPC 端到端（既有 stub 保持）
- 未改 Docker/打包把 Python 塞进发行物

---

## 3. 验证命令与 exit code

| 命令 | Exit | 结果 |
|------|-----:|------|
| `git rev-parse HEAD` | 0 | `80d78c85c92bfd36f35e0eb28ed351f488f1edff` |
| `git rev-parse --abbrev-ref HEAD` | 0 | `xvyimu/wave8-ms-claude` |
| `python -m pytest services/ai-core/tests -q` | **0** | **9 passed**（3 warnings：Starlette/httpx deprecation，非失败） |
| `node --test packages/desktop/config/ai-core-config.test.js packages/desktop/config/ai-core-client.test.js` | **0** | **9/9** pass |
| `node --test --test-name-pattern "preload IPC\|streaming contract\|composition root\|channel manifest\|preference bridge\|avoids renderer" scripts/desktop-ipc-handlers.test.mjs` | **0** | **6/6** pass（含 AI-Core 通道 Gate） |

**结论：** 模式 A 契约单测与 IPC 静态 Gate 在本 worktree **exit 0**。Live `uvicorn` 健康探针属开发者本机按 runbook 可选步骤，不阻塞本波文档一刀。

---

## 4. 变更文件清单

| 路径 | 动作 |
|------|------|
| `docs/ops/ai-core-local-sidecar-runbook.md` | 新增 |
| `docs/ops/ai-core-distribution-contract.md` | 链出 runbook |
| `docs/ops/wave8-ms-claude.md` | 本报告 |

---

## 5. 总控接手

- 审 docs 后决定是否 commit 本分支并合 `develop`
- 不要求本 agent 再开 PR
