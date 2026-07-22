# W3 · MindSync · 架构/栈升级 · Claude

**ASAR COVER: NOT EXECUTED**

| 项 | 值 |
|----|-----|
| **Agent** | claude |
| **日期** | 2026-07-23 |
| **Worktree** | `C:\Users\yuanjia\orca\workspaces\mindsync\w3-ms-claude` |
| **Branch** | `xvyimu/w3-ms-claude` |
| **Tip（开工）** | `e6d113c` · merge form-stack SSOT before W2 land |
| **Tip（本波结束）** | 以 commit 后 `git rev-parse --short HEAD` + `pnpm check:docs-tip` 为准 |
| **主线** | `develop`（合入 / push 由总控） |
| **题单** | `portfolio-arch-upgrade-2026h2/prompts/w3-ms.md` + `w3-shared.md` |

> **未 push** · **未 asar** · **未 redesign 生产默认 ON** · **未 Docker 真推** · **Mode B 未默认捆绑**。

---

## 1. 做了什么

1. **Mode A 加固** — `toPublicAiCoreStatus` 增 `healthState`（`disabled` / `config_error` / `not_probed` / `ok` / `error`）；runbook + distribution contract 与 IPC 对齐；无 bearer。
2. **可选本地模型适配器（flag 默认 OFF）** — `MINDSYNC_LOCAL_MODEL_ADAPTER` / `VITE_LOCAL_MODEL_ADAPTER`；`LocalModelAdapter` stub；registry 仅 ON 时注册；文档 `local-model-adapter-flag-w3.md`。
3. **CURRENT tip 门闩** — `scripts/check-docs-current-tip.mjs` 进 `pnpm check:docs` / `check:docs-tip` / `test:repo`。
4. **IPC** — Google Drive 拒路径在加载 AWS SDK 之前（无 install 假红修）；AI-Core status 断言 `healthState`。
5. **stack-matrix** — 增 W3 列；Python 锁文件书面延期至 W4。
6. **core** — 显式 `vite` devDep（vitest peer，便于干净 worktree 跑测）。

---

## 2. 明确不做

| 项 | 状态 |
|----|------|
| asar 覆盖 / NSIS / ISS | **NOT EXECUTED** |
| push / PR / merge develop | 未做 |
| Mode B 默认 / Mode C 生产 | 未做 |
| 本地模型 flag 默认 ON / 真密钥 / 真 runtime 绑生产 | 未做 |
| redesign 生产 ON · Docker 真推 | 未做 |
| Python 锁文件 | 延期 W4（报告 §4） |

---

## 3. 验证（exit code）

| 命令 | Exit | 结果 |
|------|-----:|------|
| `pnpm check:docs` | **0** | 9 子脚本（含 tip） |
| `python -m pytest services/ai-core/tests -q` | **0** | 9 passed |
| `node --test packages/desktop/config/ai-core-config.test.js packages/desktop/config/ai-core-client.test.js` | **0** | 10/10 |
| `node --test scripts/desktop-ipc-handlers.test.mjs` | **0** | 11/11 |
| `pnpm -F @mindsync/core test -- tests/unit/llm/local-model-adapter.test.ts` | **0** | 5/5 |

---

## 4. 延期 · Python 锁文件

无生产装机依赖 AI-Core（Mode A）；pytest 已绿。W4 再做 uv/pip-tools；禁止无限沉默 DEFER。

---

## 5. 总控

1. 审本分支 tip → 合 `develop`  
2. **勿**本 agent push；asar / Mode B 仍人 gate  
3. 停止点：W3 题单交付 · **ASAR NOT EXECUTED** · **未 push**
