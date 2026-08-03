# M-MS-harden-abort · W3 Abort 可测硬化 · 2026-07-24

> **模块：** M-MS-harden-abort · G0=B Electron 硬化 · W3  
> **分支：** `xvyimu/ms-harden-abort`  
> **基线：** `develop@221b767`  
> **禁止已守：** `git push develop` · asar · Tauri · 假绿 · 大爆炸  

## 结论

| 项 | 值 |
|----|-----|
| 交付 | Abort 真缺口最小修 + 可测补全 |
| HEAD | 见 commit 后 `git rev-parse --short HEAD` |
| 相对 develop | feature 支独立 abort 刀；**未** cherry W1/W2 |
| push | **仅** feature 支可选；**不** push develop |

**交付态：** DONE + in-review。

---

## Scout 摘要

### 流式 channel / streamId / owner

| 域 | invoke | event 前缀 | streamId |
|----|--------|------------|----------|
| LLM | `llm-sendMessageStream` · `llm-sendMessageStreamWithTools` | `stream-content` / `stream-thinking` / `stream-tool-call` / `stream-finish` / `stream-error` + `-${streamId}` | preload `generateStreamId()` |
| Prompt | `prompt-optimize*Stream` · `prompt-test*Stream` 等 5 路 | `stream-token` / `stream-reasoning-token` / `stream-tool-call` / finish / error | 同上 |
| Image（可取消生成） | `image-generate*` ×4 | 非 token 流；`streamId` 可选 → registry | 有 signal 才生成 streamId |
| 取消 | **`stream-cancel`**（llm-handlers 注册） | — | owner-only |

- **owner abort：** `stream-registry.cancel(sender, streamId)` → `AbortController.abort()` + 删除登记。  
- **non-owner：** `IPC_STREAM_NOT_OWNER`。  
- **preload 竞速：** `createStreamAbortRace`：`Promise.race(invoke, abortPromise)`；`signal.aborted` 预取消不 invoke；abort → `stream-cancel` + `IPC_STREAM_CANCELLED`。

### core 6 fail 中 provider-cancellation

| 文件 | 现象 | 本刀 |
|------|------|------|
| `provider-cancellation.test.ts` | abort 后 promise **resolve** 而非 AbortError | **修** |
| `import-export-integration.test.ts` | image apiKey 脱敏 | **不修**（非 abort） |
| `tool-calls.test.ts` ×4 | tools 校验 resolve | **不修**（非 abort） |

**根因：** `LLMService.sendMessageStream` / `WithTools` 的 `catch` 把含 AbortError 在内的错误只送 `callbacks.onError` 后 **resolve**，IPC/测试看不到 reject。

---

## 变更（最小）

| 路径 | 变更 |
|------|------|
| `packages/core/src/services/llm/service.ts` | `isStreamAbort` / `toAbortError`；Abort **rethrow**，不走 onError toast 通道 |
| `packages/core/src/services/llm/adapters/local-model-adapter.ts` | stub 预 abort 抛 `name=AbortError`（与协作取消语义一致） |
| `packages/desktop/config/ipc-domain-handlers.test.js` | `stream-cancel` owner/non-owner；owned-runner cancel 停转发；image streamId → `IPC_STREAM_CANCELLED` |
| `packages/desktop/config/preload-stream-cancellation.test.js` | 预 aborted signal 不 invoke |

**未改：** channel 契约名、owned-stream-runner 生产逻辑（已正确）、W1/W2 cherry。

---

## 验证（本条消息实跑 · exit code）

| 命令 | Exit | 结果 |
|------|-----:|------|
| `pnpm -F @mindsync/core exec vitest run tests/unit/llm/provider-cancellation.test.ts` | **0** | **5/5** |
| `node --test` stream-registry + preload-stream-cancellation + ipc-domain-handlers | **0** | **26/26** |
| `node --test packages/desktop/config/*.test.js` | **0** | **93/93**（+4 新测） |

---

## 风险（一句）

Abort 现会 **reject** 到 prompt 等上层；原先只依赖 `onError` 且假定 stream promise 永不 reject 的路径可能多一次 catch（通常仍与 toast 同文案）；IPC `runOwnedStream` 取消后 complete 竞态已有 registry 容忍。

---

## 不做 / 红线

- 不 push `develop`  
- 不 asar / 不 Tauri / 不拆 desktop 主路径  
- 不修 tool-calls / import-export 非 abort 4+1 fail  
- 不强制 cherry W1/W2  
