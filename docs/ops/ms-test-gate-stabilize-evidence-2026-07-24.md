# M-MS-test-gate-stabilize · core 测试门闩 · 2026-07-24

> **模块：** M-MS-test-gate-stabilize · G0=B · W7  
> **分支：** `xvyimu/ms-test-gate-stabilize`  
> **基线：** `develop@221b767`  
> **禁止已守：** `git push develop` · asar · Tauri · 假绿 · 大爆炸 · 为绿而删测

## 结论

| 项 | 值 |
|----|-----|
| 交付 | core 既有 6 fail 全修（abort + 流式预检 reject + import-export 对齐脱敏契约） |
| HEAD | 见 commit 后 `git rev-parse --short HEAD` |
| 相对 develop | feature 支；**未** push develop |
| push | **仅** feature 支可选；**不** push develop |

**交付态：** DONE + in-review。

---

## 基线复现（修前）

| 命令 | Exit | 结果 |
|------|-----:|------|
| `pnpm -F @mindsync/core exec vitest run tests/unit/llm/tool-calls.test.ts tests/unit/llm/provider-cancellation.test.ts tests/unit/data/import-export-integration.test.ts` | **1** | **6 failed · 21 passed** |

| 文件 | 现象 | 根因 |
|------|------|------|
| `provider-cancellation.test.ts` | abort 后 promise **resolve** | `LLMService` catch 吞 Abort → 只 `onError` |
| `tool-calls.test.ts` ×4 | 校验应 reject 却 resolve | 同上：`RequestConfigError` 被吞进 `onError` |
| `import-export-integration.test.ts` | image `apiKey` 导入后 `undefined` | 默认 `exportAllData()` 脱敏（B4）；测期望明文往返未 `includeSecrets: true` |

W3（`origin/xvyimu/ms-harden-abort` @ `bf8e419`）未合入 develop；本刀 **独立再修** abort（不整支 cherry desktop 测）。

---

## 变更（最小）

| 路径 | 变更 |
|------|------|
| `packages/core/src/services/llm/service.ts` | `isStreamAbort` / `toAbortError` / `handleStreamFailure`：**Abort** 与 **RequestConfigError** 向上 reject；其余运行时错误仍只走 `onError`（防双 toast） |
| `packages/core/src/services/llm/adapters/local-model-adapter.ts` | stub 预 abort 抛 `name=AbortError`（与 W3 一致） |
| `packages/core/tests/unit/data/import-export-integration.test.ts` | 断言默认脱敏；含密钥往返改 `exportAllData({ includeSecrets: true })` |

**未改：** 生产 export 默认仍脱敏；channel/IPC 契约名；desktop 主路径；不删测。

---

## 验证（本条消息实跑 · exit code）

| # | 命令 | Exit | 结果 |
|---|------|-----:|------|
| 1 | `pnpm -F @mindsync/core test:gate` | **0** | **21/21** |
| 2 | vitest：tool-calls + provider-cancellation + import-export-integration + service + export-secrets | **0** | **44/44**（含原 6 fail 全绿） |
| 3 | `pnpm -F @mindsync/core typecheck` | **0** | |
| 4 | `pnpm -F @mindsync/core build` | **0** | tsup cjs/esm + dts |

---

## 风险（一句）

流式 **RequestConfigError / Abort** 现会 reject；原先只依赖 `onError` 且假定 stream promise 永不 reject 的路径可能多一次 catch（通常与 toast 同文案）。运行时 API 错误仍只走 `onError`。

---

## DEFER

| 项 | 原因 |
|----|------|
| push `develop` | 红线 · 等人说 push |
| cherry 整支 `ms-harden-abort` desktop 补测 | 本刀 core 门闩；desktop 测已在 W3 支，可另合 |
| ui typecheck CodeMirror 双版本 | day-quality 既有债 · 非本模块 |
| 全量 core 再扫其它 skip/flaky | 任务范围 = 既有 6 fail |

---

## 不做 / 红线

- 不 push `develop`  
- 不 asar / 不 Tauri  
- 不为绿删测 / 不假绿  
- 不大爆炸重构 LLMService  
