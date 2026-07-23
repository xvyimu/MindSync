# MS-TAURI-STREAM · progress · 2026-07-24

> **任务：** M4 `ms-tauri-stream`（orch `task_5f129ee9552f`）  
> **分支：** `xvyimu/ms-tauri-stream`  
> **状态：** 流式 + Abort 最小路径已落地（mock，无真实 API key）  
> **禁守：** 无 push · 未删 Electron · 未换 UI · UI 未散落 `@tauri-apps/api`

---

## 1. 设计对齐（Electron → Tauri）

| Electron 契约 | Tauri M4 映射 |
|---------------|---------------|
| client 生成 `stream_${ts}_${rand}` | `generateDesktopStreamId()`（`@mindsync/core`） |
| `STREAM_ID_PATTERN = /^[A-Za-z0-9_-]{1,96}$/` | Rust `is_valid_stream_id` + TS `isValidDesktopStreamId` |
| invoke `llm-sendMessageStream` + `streamId` | **`desktop-stream-demo`**（mock 子集；证明 cancel，不接 provider） |
| invoke **`stream-cancel`** | 同名 command `stream-cancel` |
| events `stream-content\|thinking\|finish\|error-${streamId}` | 同前缀 emit（demo 发 content/finish；error 通道保留） |
| preload `AbortSignal` → cancel + `IPC_STREAM_CANCELLED` | `createDesktopStreamClient` 同语义 race |
| `stream-registry` 所有权 + Abort flag | Rust `StreamRegistry`（streamId → AtomicBool） |

**取舍：** 本切片用 `desktop-stream-demo` 而非完整 `llm-sendMessageStream`，避免密钥/provider 依赖；cancel 通道与 event 名与 Electron 对齐，后续 B4 可把 demo 替换为真 LLM 而不改 facade 取消路径。

**Facade 纪律：** UI / core 只走 `@mindsync/core` desktop 模块；Tauri 通过 `withGlobalTauri`（`__TAURI__.core.invoke` / `__TAURI__.event.listen`），**禁止** UI 直接 import `@tauri-apps/api`。

---

## 2. 代码落点

| 路径 | 角色 |
|------|------|
| `packages/desktop-tauri/src-tauri/src/stream.rs` | mock stream registry + `desktop-stream-demo` / `stream-cancel` |
| `packages/desktop-tauri/src-tauri/src/lib.rs` | 注册 handlers + `StreamRegistry` state |
| `packages/desktop-tauri/src-tauri/permissions/mindsync-p0.toml` | 放行 stream 两命令 |
| `packages/desktop-tauri/src-tauri/capabilities/default.json` | `core:event:default` + p0 permission |
| `packages/core/src/desktop/commands.ts` | `DESKTOP_STREAM_COMMANDS` / event prefixes SSOT |
| `packages/core/src/desktop/stream.ts` | stream client：listen + invoke + AbortSignal |
| `packages/core/src/desktop/mock-stream.ts` | 可测 mock 传输（start→abort→无后续 chunk） |
| `packages/core/src/desktop/tauri-backend.ts` | payload map 含 stream 命令 |
| `packages/core/tests/unit/desktop/stream.test.ts` | 自动化：start / abort / pre-abort / cancel |

### 命令表（M4）

| invoke 名 | 参数 | 返回（unwrap 后） |
|-----------|------|-------------------|
| **`desktop-stream-demo`** | `streamId`, optional `chunkCount`, `intervalMs` | `null`（chunk 走事件） |
| **`stream-cancel`** | `streamId` | `{ cancelled: true }` |

---

## 3. 验证（本消息内实跑）

| 命令 | Exit | 结果 |
|------|-----:|------|
| `pnpm -F @mindsync/core exec vitest run tests/unit/desktop/facade.test.ts tests/unit/desktop/stream.test.ts` | **0** | 2 files · **21** tests passed（含 start→abort→无继续 chunk） |
| `vcvars64` + `cargo check --manifest-path packages/desktop-tauri/src-tauri/Cargo.toml` | **0** | Finished dev profile |
| `vcvars64` + `cargo test --manifest-path packages/desktop-tauri/src-tauri/Cargo.toml --lib` | **0** | **3** passed（stream id + registry cancel） |

**Abort 证据（vitest）：** `AbortSignal cancels mid-stream and rejects with IPC_STREAM_CANCELLED; no more chunks after abort` — 首 chunk 后 abort，token 数 < 20，200ms 后再数不变，且 `state.cancelled` 含该 streamId、未 finish。

GUI e2e 开窗未强制；`pnpm dev:desktop-tauri` 可在 vcvars 下人工验 demo。

---

## 4. 明确不做（本切片）

- 真实 LLM / API key  
- 完整 `llm-sendMessageStream` / tools stream  
- UI Stop 按钮接线（facade 已可被 proxy 消费）  
- 删 Electron / 换 UI / push  
- 密钥路径（M3）

---

## 5. 后续（非本任务）

| 项 | 备注 |
|----|------|
| B4 真 LLM stream | 复用 `stream-cancel` + event 前缀；替换 demo invoke |
| ElectronLLMProxy Tauri 路径 | 可接 `createTauriDesktopStreamClient` |
| G2 人审 | cutover-plan 垂直切片问句 |

---

*M4 ms-tauri-stream · 无 push · 2026-07-24*
