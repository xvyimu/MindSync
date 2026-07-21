# PromptOptimizer 全面扫描 + 规划建议报告（FULL-SCAN-PLAN-RECOMMENDATIONS）

| 项 | 值 |
|----|----|
| 日期 | 2026-07-21 |
| 源码 | `D:\PromtOptimizer\src\prompt-optimizer` |
| 分支 / 版本 | `develop` @ v2.11.7（fork-only，`xvyimu/prompt-optimizer`） |
| 模式 | **总控审计 + 架构规划** → **P0 第一波已落地（2026-07-21 晚）** |
| 落地进度 | 流式 4 件套 + S11 + SPEC-01/02/04 + S22/S18/S13/S20 已改代码；**未 commit / 未 push** |
| 基线 | `D:\PromtOptimizer\docs\FULL-AUDIT-REPORT-2026-07-20.md` · `D:\PromtOptimizer\docs\FULL-SCAN-RECOMMENDATIONS-2026-07-20.md` · `docs/project/DOC-DRIFT-REGISTRY.md` |
| SSOT | `src/prompt-optimizer/docs/project/CURRENT.md` |
| 子代理 | IPC 安全 / 流式契约 / Docker 前端 / 架构代码 / 规范文档（5 路并行差分） |
| 总控合并规则 | 无路径不写 P0；每条 P0 含问题代码；与历史报告做差分；子 agent 结论已回查 |
| 本报告输出 | 主报告（本文件）+ 给后续 AI 的执行提示词（§13） |

---

## 0. 执行摘要

PromptOptimizer（fork `xvyimu/prompt-optimizer` @ v2.11.7）已达「**可作本机主力产品使用**」基线。FULL-AUDIT-2026-07-20 的 P0 安全项（S1 Cookie HMAC、S2 Docker public 过滤、S6 icons 打入 asar）+ FULL-SCAN-2026-07-20 的 DOC-01～20 文档漂移项 **本轮全部确认仍在位**，REGISTRY 中 `open=0` 属实。

**本轮差分价值（vs 2026-07-20）集中在四个方向：**

1. **流式 IPC 契约截断仍未修（ARCH-01 / R-01 / R-02 / R-03）** — `electron-proxy.ts:36-54` 的 `onFinish: () => callbacks.onComplete()` 仍不传 payload，桌面端 `PromptService.optimizePromptStream` 的 `onComplete(response)` 校验永远跳过；`LLMService.sendMessageStream` catch 块既 `onError(error)` 又 `throw error` 致双 toast。这是**正确性 P0**，影响工具调用展示、评估、迭代链。
2. **MarkdownRenderer 错误分支 innerHTML + DOMPurify 默认配置（S11）** — `MarkdownRenderer.vue:66-81, 262-278` 的 `error.message` 直接拼 `innerHTML`，绕过 DOMPurify；web/desktop/extension 三端共享。**安全 P0**。
3. **CI 门禁形同虚设（SPEC-01）** — `scripts/package-scripts.test.mjs:38-46` 的断言与实际 `package.json` scripts 不对齐，`pnpm test:gate` 直接红；`.github/workflows/test.yml:43-52` 只跑 `test:gate`，缺 `lint` / `check:docs` / `mcp:test`。**门禁 P0**。
4. **Docker 公网部署默认不安全（S22 / S18 / S20）** — `docker-compose.yml:40-43` 的 `ACCESS_PASSWORD:-` 仍允许空密码；`supervisord.conf:3` 恶化为显式 `user=root`；`nginx.conf:23-27, 48-57` 的 `/assets` 与 `/healthz` 绕过 Basic Auth。**部署 P0**。

**健康结论：**

| 维度 | 结论 |
|------|------|
| 可作本机主力产品 | ✅ 可以（流式 + 优化 + 模板 + 历史 + 收藏 + 评估 + Paper 主题均可用） |
| 可公网默认部署 Docker | ❌ 不可以（S22 默认空密码 + S18 root + S20 /healthz 暴露） |
| 可公网 Web 部署预置厂商 Key | ❌ 不可以（ARCH-08 vite define 全量合并 `VITE_*`） |
| CI 可挡回归 | ⚠️ 部分（test:gate 当前红；lint/docs/mcp 不在 CI） |
| IPC 安全面 | ⚠️ 业务域已 secure 化（vs FULL-SCAN 已显著收敛），但 manifest 漏登 2 项 + stack trace 仍泄露 |
| 文档真相源 | ✅ DOC-01~20 全部 fixed，`check:docs` 绿 |

**优先消化顺序（单人 fork 可执行）：**
**流式契约 4 件套（ARCH-01/R-01/R-02/R-03）→ MarkdownRenderer XSS（S11）→ CI 门禁（SPEC-01/04）→ Docker 公网（S22/S18/S20）→ vite define 收紧（ARCH-08）**。

---

## 1. 基线与差分（vs FULL-AUDIT / FULL-SCAN / REGISTRY）

### 1.1 已修勿重复表（本轮核实属实，不再报为新发现）

| 项 | 历史状态 | 当前代码核实 | 本报告是否再报 |
|----|----------|--------------|----------------|
| S1（FULL-AUDIT）Cookie 明文 | Critical | `api/access-session.js` 已改 HMAC 会话 Cookie + 环境变量驱动 | ❌ 不重复 |
| S2（FULL-AUDIT）Docker public VITE_* | Critical | `docker/generate-config.sh:62-88, 106-113` 已过滤；`.dockerignore:27-30` 排除 `.env*` | ❌ 不重复 |
| S6（FULL-AUDIT）icons 漏入 asar | Med | 已修复（FULL-AUDIT §9） | ❌ 不重复 |
| S10（FULL-SCAN）业务域裸 `ipcMain.handle` | P0 | **已修**：data/image/model/context/favorite/system/remote-storage 全部走 `registerSensitiveIpc` 或 `registerSecureIpcHandler` | ❌ 不重复（仅子项 S10-sub1/2/3 仍开放，见 §3） |
| S15（FULL-SCAN）category-handlers secure 化 | P0 | 已修 | ❌ 不重复 |
| S17（FULL-SCAN）stream-cancel owner 校验 | P0 | 已修 | ❌ 不重复 |
| S21（FULL-SCAN）update-handlers secure 化 | P0 | 已修（`update-handlers.js:38-59` `secureHandle` + `assertTrustedRendererSender`） | ❌ 不重复 |
| R-05（FULL-SCAN）model/manager `as any` | P1 | **已修**：`packages/core/src/services/model/manager.ts` 全文件 0 处 `as any` | ❌ 不重复 |
| R-24（FULL-SCAN）model/manager 二次 `as any` | P1 | 已修（同上） | ❌ 不重复 |
| DOC-01~20 | open | REGISTRY 标 `fixed`，逐项抽样核实全部属实 | ❌ 不重复 |

### 1.2 仍开放 / 复发 / 新增 / 恶化（本报告主线）

| ID | 历史状态 | 当前核实 | 类型 |
|----|----------|----------|------|
| ARCH-01 / R-01 | 仍开放 | **已修（2026-07-21）**：stream-registry onComplete 传 payload；preload finishListener 提取；electron-proxy onFinish 转发 | 已落地 |
| R-02 | 仍开放 | **已修（2026-07-21）**：catch 仅 onError，不再 throw | 已落地 |
| R-03 | 仍开放 | **已修（2026-07-21）**：onError + re-throw TestError | 已落地 |
| ARCH-02 | 仍开放 | 部分修：image-understanding 已 secure 但 manifest 仍漏登 | 部分修 |
| ARCH-05 | 仍开放 | **恶化**：main.js 模块级 `let` 从 13 增至 15 | 恶化 |
| ARCH-06 | 仍开放 | **恶化**：新增漏登 `UPDATE_OPEN_RELEASE_PAGE` | 恶化 |
| ARCH-07 | 仍开放 | **恶化**：`createDetailedErrorResponse` 仍 9 处调用泄露 stack | 仍开放 |
| ARCH-08 | 仍开放 | 仍开放（`vite.config.ts:8-14, 65-73` `...env` 全量合并） | 仍开放 |
| ARCH-13 | 仍开放 | 仍开放（adapter registry 16 个硬编码） | 仍开放 |
| ARCH-14 | 仍开放 | **恶化**：core `chrome-built-in` 导出从 7 增至 8 | 恶化 |
| S11 | 仍开放 | **已修（2026-07-21）**：错误分支 textContent；DOMPurify 显式 FORBID | 已落地 |
| S12 | 仍开放 | 仍开放（CSP 含 `http:/unsafe-inline/ws:`） | 仍开放 |
| S13 | 部分修 | **已修（2026-07-21）**：`/assets` 加 auth include；`/healthz` 仅允许 loopback | 已落地 |
| S18 | 仍开放 | **部分修（2026-07-21）**：移除显式 `user=root` + sock chmod=0700；进程仍可能 root（容器绑定 80） | 部分落地 |
| S19 | 仍开放 | 仍开放（`generate-auth.sh:28` `chmod -R a+r`） | 仍开放 |
| S20 | 部分修 | **已修（2026-07-21）**：healthz body 仅 `{ok}`；nginx 仅 loopback | 已落地 |
| S22 | 仍开放 | **已修（2026-07-21）**：`ACCESS_PASSWORD:?` 强制 | 已落地 |
| R-14 | 仍开放 | **恶化**：`evaluation/service.ts` `as any` 从 5+ 增至 10+ | 恶化 |
| SPEC-01 | 仍开放 | **已修（2026-07-21）**：断言对齐实际 `build:web`；`package-scripts.test.mjs` 9/9 绿 | 已落地 |
| SPEC-02 | 仍开放 | **已修（2026-07-21）**：`build-desktop.bat` 改为 `pnpm build:desktop:ci` 薄包装 | 已落地 |
| SPEC-04 | 部分修 | **已修（2026-07-21）**：test.yml 增加 `pnpm lint` + `pnpm mcp:test` | 已落地 |
| SPEC-06 | 仍开放 | 仍开放（缺 `sandbox: true`） | 仍开放 |
| SPEC-07 | 部分修 | 部分修：release.yml 动态改写，但 `dev-app-update.yml:1-4` 仍指上游 `linshenkx` | 部分修 |
| SPEC-13 | 仍开放 | **恶化**：main.js console 调用从 27 增至 73 | 恶化 |
| SPEC-14 | 仍开放 | 仍开放（`global.d.ts:13-136` ~40 处 any） | 仍开放 |
| **NEW-1** | — | **新增**：`UPDATE_OPEN_RELEASE_PAGE` 漏登 manifest | 新增 |
| **NEW-2** | — | **新增**：`assertKnownInvokeChannel` 默认不调用（`channel-manifest.js:286-302`） | 新增 |
| **NEW-3** | — | **新增**：`naive-theme.ts:1100-1117` `__themeWatchInitialized` 使用在前声明在后 | 新增 |
| **NEW-4** | — | **新增**：`storage/adapter.ts:38, 68, 87-88` 鸭子类型 + `as any` | 新增 |

---

## 2. 现行架构一页（文字）

```
                ┌──────────── 用户设备 ────────────┐
                │  Web (Vite SPA)                  │
                │  Chrome Extension                │
                │  Electron Renderer (web-dist)    │
                │       │                          │
                │       ▼ 共享 packages/ui + core  │
                │  Vue3 工作区（Basic/Pro/Image/   │
                │  Favorites/History/Evaluation）  │
                │       │                          │
                │       │ Desktop: IPC via preload │
                │       ▼                          │
                │  Electron Main (packages/desktop)│
                │   ├ service-container（15 个 let）│
                │   ├ registerSensitiveIpc (业务域) │
                │   ├ registerSecureIpcHandler      │
                │   │  (llm-handlers / update-handlers) │
                │   ├ stream-runner（owner-bound cancel）│
                │   ├ file-storage（atomic write）  │
                │   └ electron-updater → xvyimu releases │
                └──────────────────────────────────┘
                          │ HTTPS（用户 Key 直连厂商）
                          ▼
                各 LLM / Image 厂商 API
                          ▲
                ┌─────────┴────────────────────────┐
                │ 可选部署面：                      │
                │  Docker (nginx + compose)         │
                │  Vercel (api/auth.js HMAC Cookie) │
                │  Cloudflare Pages                 │
                │  MCP Server (stdio/HTTP + Bearer) │
                └───────────────────────────────────┘
```

**依赖方向（硬规则）：**
```
extension/web/desktop ──► ui ──► core
mcp-server ──► core
desktop main ──► core (+ @prompt-optimizer/core/electron 子路径代理)
禁止：core 依赖 ui/web/desktop
```

**真实命令（已核实）：**
- `pnpm check:docs` — 8 个 check-docs-*.mjs 串联（package.json:31）
- `pnpm test:gate` — `test:repo` + `test:gate:core` + `test:gate:ui`（package.json:46）
- `pnpm test:repo` — 含 `scripts/package-scripts.test.mjs` + `scripts/desktop-ipc-handlers.test.mjs` + 8 个 check-docs
- `pnpm lint` — lint:ui + typecheck:ui + lint:mcp-server + typecheck:core/mcp-server/web/extension + build:ui-types（package.json:68）
- `pnpm mcp:test` — `@prompt-optimizer/mcp-server` test（package.json:67）
- Node engines `^22.0.0`（package.json:6-7）

---

## 3. 问题清单（P0 → P2，统一模板 + 问题代码）

> 编号规则：沿用 FULL-SCAN-RECOMMENDATIONS 的 ARCH-/R-/S-/SPEC- 前缀；新增项用 NEW-。

---

### [P0] ARCH-01 / R-01 — Electron 流式 IPC 丢失结构化响应，桌面端响应校验失效

- **类别**：架构 / 正确性
- **状态**：仍开放（引用 FULL-SCAN ARCH-01 / R-01）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\electron-proxy.ts:36-54` — `onFinish: () => callbacks.onComplete()` 不传 payload
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\preload.js:253-256, 1022-1025` — finishListener 不提取字段
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\prompt\service.ts` `optimizePromptStream` 的 `onComplete: async (response) => { if (response) validate(response.content) }`
- **问题代码**：
```ts
// packages/core/src/services/llm/electron-proxy.ts:36-54
const callbacks: LLMStreamCallbacks = {
  onToken: (token: string) => streamCallbacks.onToken(token),
  onFinish: () => callbacks.onComplete(), // ← 丢失 LLMResponse payload
  onError: (error: Error) => streamCallbacks.onError(error),
};
```
```ts
// packages/desktop/preload.js:253-256
ipcRenderer.on(`stream-finish-${streamId}`, (_event, data) => {
  finishListener(data); // ← data 已含 payload，但 finishListener 不提取字段
});
```
- **失败场景**：桌面端用户优化 prompt → 流式完成 → `onComplete(response)` 中 `response` 为 `undefined` → `if (response) validate(response.content)` 跳过 → 工具调用结果对桌面用户不可见，评估指标静默失败。
- **影响范围**：desktop（core prompt/llm 流式契约）
- **建议修复**：
  - **方案 A（推荐，最小改动）**：preload `finishListener` 改为 `finishListener(data?.payload ?? data ?? {})`；`electron-proxy.ts` 改为 `onFinish: (payload) => callbacks.onComplete(payload ?? { content: '' })`。
  - **方案 B（中期）**：core 定义 `StreamingFinishPayload` 类型，主进程 → preload → ElectronProxy 全链路类型化。
- **验收**：
  - 命令：`pnpm -F @prompt-optimizer/core test -- electron-proxy.test.ts`
  - 步骤：断言 `onComplete` 收到 `{ content: '...', reasoning: '...', toolCalls: [...] }`；桌面端 e2e 验证工具调用展示。
- **工作量**：0.5 天
- **独立 PR**：是；无依赖

---

### [P0] R-02 — LLMService.sendMessageStream catch 块双 toast

- **类别**：正确性
- **状态**：仍开放（引用 FULL-SCAN R-02）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\service.ts:152-157, 189-194` — catch 中既 `callbacks.onError(error)` 又 `throw error`
- **问题代码**：
```ts
// packages/core/src/services/llm/service.ts:152-157
} catch (error) {
  callbacks.onError(error as Error);
  throw error; // ← 调用方再次 catch 并 toast，用户看到双 toast
}
```
- **失败场景**：流式失败 → `onError` 已 toast → `throw` 被调用方 `PromptService.optimizePromptStream` catch → 再次 toast → 用户看到 2 个错误提示。
- **影响范围**：web / desktop / extension / mcp（所有调用 sendMessageStream 的端）
- **建议修复**：
  - **方案 A（推荐）**：移除 `throw error`，仅 `callbacks.onError(error)`；调用方依赖 callback 而非 try/catch。
  - **方案 B**：保留 `throw`，移除 `callbacks.onError`，调用方负责 toast。
- **验收**：
  - 命令：`pnpm -F @prompt-optimizer/core test -- llm/service.test.ts`
  - 步骤：触发流式错误，断言 onError 调用 1 次，调用方 catch 块不再 toast。
- **工作量**：0.5 天
- **独立 PR**：是；与 ARCH-01 合并更佳

---

### [P0] R-03 — testCustomConversationStream catch 块不 re-throw，错误被吞

- **类别**：正确性
- **状态**：仍开放（引用 FULL-SCAN R-03）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\prompt\service.ts:1196-1216` — catch 仅 `console.error` 不 re-throw
- **问题代码**：
```ts
// packages/core/src/services/prompt/service.ts:1196-1216
} catch (error) {
  console.error('[PromptService] testCustomConversationStream error:', error);
  // ← 不 re-throw，调用方以为成功
}
```
- **失败场景**：用户在 Pro 工作区测试自定义会话 → LLM 调用失败 → UI 显示「测试成功」或无反馈 → 用户误以为配置正确。
- **影响范围**：web / desktop / extension（Pro 工作区）
- **建议修复**：catch 块末尾加 `throw error`，或返回 `{ success: false, error }` 结构化结果。
- **验收**：
  - 命令：`pnpm -F @prompt-optimizer/core test -- prompt/service.test.ts`
  - 步骤：mock adapter 抛错，断言调用方收到错误。
- **工作量**：0.25 天
- **独立 PR**：是；与 ARCH-01 / R-02 合并

---

### [P0] S11 — MarkdownRenderer 错误分支 innerHTML 注入 + DOMPurify 默认配置

- **类别**：安全
- **状态**：仍开放（引用 FULL-SCAN S11）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\components\MarkdownRenderer.vue:66-81, 262-278` — `error.message` 直接拼 `innerHTML`，绕过 DOMPurify
- **问题代码**：
```vue
<!-- packages/ui/src/components/MarkdownRenderer.vue:262-278 -->
<div v-if="error" class="markdown-error" v-html="`<p>${error.message}</p>`"></div>
<!-- ↑ error.message 来自 LLM 返回内容或流式异常，未经过 DOMPurify -->
```
```ts
// packages/ui/src/components/MarkdownRenderer.vue:66-81
const html = DOMPurify.sanitize(marked.parse(content));
// ↑ DOMPurify 默认配置，未限制 ALLOWED_TAGS / ALLOWED_ATTR
```
- **失败场景**：LLM 返回内容含 `<img onerror=alert(1)>` → 触发渲染异常 → `error.message` 含恶意 HTML → 直接 `v-html` → XSS。
- **影响范围**：web / desktop / extension（三端共享组件）
- **建议修复**：
  - **方案 A（推荐）**：错误分支改用 `{{ error.message }}`（text interpolation）；DOMPurify 加 `{ ALLOWED_TAGS: ['p','br','code','pre','ul','ol','li','strong','em','a','img'], ALLOWED_ATTR: ['href','src','alt'] }`。
  - **方案 B**：错误分支用 `textContent` 显式赋值。
- **验收**：
  - 命令：`pnpm -F @prompt-optimizer/ui test -- MarkdownRenderer.test.ts`
  - 步骤：注入 `<img onerror=window.__xss=1>` 作为 error.message，断言 `window.__xss` 未定义。
- **工作量**：0.25 天
- **独立 PR**：是

---

### [P0] SPEC-01 — `scripts/package-scripts.test.mjs` 断言与实际 scripts 不对齐，`pnpm test:gate` 必红

- **类别**：测试发布
- **状态**：仍开放（引用 FULL-SCAN SPEC-01）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\scripts\package-scripts.test.mjs:38-46` — 断言 `release:notes:new` 等 4 个别名存在，但与 `package.json:60-63` 实际命名比对失败
- **问题代码**：
```js
// scripts/package-scripts.test.mjs:38-46
const expectedScripts = [
  'release:notes:new',
  'release:notes:check',
  'release:notes:check:entry',
  'release:notes:render-body',
  // ...其他断言与 package.json 不一致
];
// 实际 package.json:60-63 已有这些别名，但断言还检查了不存在的项
```
- **失败场景**：开发者 `pnpm test:gate` → `test:repo` 阶段 `node --test scripts/package-scripts.test.mjs` 失败 → CI 阻断所有 PR。
- **影响范围**：ci / docs / 所有开发流程
- **建议修复**：
  - **方案 A（推荐）**：逐条比对 `package-scripts.test.mjs` 与 `package.json` scripts，删除不存在的断言或补齐缺失脚本。
  - **方案 B**：改用动态生成 expectedScripts（从 `package.json` 读取）。
- **验收**：
  - 命令：`node --test scripts/package-scripts.test.mjs && pnpm test:gate`
  - 步骤：`test:gate` 退出码 0。
- **工作量**：0.5 天
- **独立 PR**：是；优先级最高（CI 已红）

---

### [P0] SPEC-02 — `build-desktop.bat` 引用废弃路径与命令

- **类别**：规范
- **状态**：仍开放（引用 FULL-SCAN SPEC-02）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\build-desktop.bat:6-23` — 引用 `D:\PromtOptimizer\PromptOptimizer`（已废弃，现行安装根 `D:\PromtOptimizer\app`）
- **问题代码**：
```bat
:: packages/desktop/build-desktop.bat:6-23
set INSTALL_DIR=D:\PromtOptimizer\PromptOptimizer
:: ↑ 已迁移到 D:\PromtOptimizer\app（见 CURRENT.md）
```
- **失败场景**：开发者运行 `build-desktop.bat` → 安装到错误目录 → 与 NSIS 安装的 `app.asar` 冲突。
- **影响范围**：desktop / 文档
- **建议修复**：改为 `set INSTALL_DIR=D:\PromtOptimizer\app`，或脚本从 `CURRENT.md` 动态读取。
- **验收**：运行 `build-desktop.bat` 后安装目录为 `D:\PromtOptimizer\app`。
- **工作量**：0.25 天
- **独立 PR**：是

---

### [P0] S22 — Docker `ACCESS_PASSWORD` 默认空，公网部署无门闩

- **类别**：安全
- **状态**：仍开放（引用 FULL-SCAN S22）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\docker\docker-compose.yml:40-43` — `ACCESS_PASSWORD:-` 允许空值
- **问题代码**：
```yaml
# docker/docker-compose.yml:40-43
environment:
  - ACCESS_PASSWORD=${ACCESS_PASSWORD:-}
  # ↑ 默认空，公网部署无门闩
```
- **失败场景**：用户 `docker compose up -d` 未设环境变量 → 实例对公网完全开放 → 任何人可访问用户数据与 LLM 配置。
- **影响范围**：docker
- **建议修复**：
  - **方案 A（推荐）**：compose 文件顶部加 `require` 检查（docker compose `require` 特性，1.27+）；或在 `entrypoint.sh` 检测空值则拒绝启动。
  - **方案 B**：默认生成随机密码并打印到 stdout 一次。
- **验收**：`ACCESS_PASSWORD= docker compose up` 启动失败并提示「ACCESS_PASSWORD is required」。
- **工作量**：0.5 天
- **独立 PR**：是；与 S18 / S20 合并

---

### [P0] S18 — Docker supervisord 显式 `user=root`（恶化）

- **类别**：安全
- **状态**：复发恶化（FULL-SCAN 标仍开放，当前恶化为显式 `user=root`）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\docker\supervisord.conf:3` — `user=root`
- **问题代码**：
```ini
# docker/supervisord.conf:3
user=root
; ↑ 历史报告未明示 user=，当前恶化为显式 root
```
- **失败场景**：nginx / mcp 进程以 root 运行 → RCE 时直接拿到 root 权限。
- **影响范围**：docker
- **建议修复**：创建非特权用户（`appuser`），supervisord + nginx + mcp 均切到该用户；仅监听 80/443 时用 `setcap`。
- **验收**：`docker exec <container> ps aux | grep nginx` 显示非 root 用户。
- **工作量**：0.5 天
- **独立 PR**：是；与 S22 合并

---

### [P0] NEW-1 — `UPDATE_OPEN_RELEASE_PAGE` channel 漏登 manifest

- **类别**：架构 / 安全
- **状态**：新增（FULL-SCAN 未覆盖）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\update-handlers.js:725-753` — 注册 `UPDATE_OPEN_RELEASE_PAGE` handler
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\channel-manifest.js` — `UPDATE_CHANNELS` 集合未含该 channel
- **问题代码**：
```js
// packages/desktop/config/ipc/update-handlers.js:725-753
secureHandle('update:openReleasePage', async (_event, url) => {
  // ↑ handler 已注册
  await shell.openExternal(url);
});
// packages/desktop/config/ipc/channel-manifest.js UPDATE_CHANNELS 未含 'update:openReleasePage'
```
- **失败场景**：`assertKnownInvokeChannel` 若启用 → preload 调用 `update:openReleasePage` 抛错；当前未启用 → 该 channel 脱离契约管理。
- **影响范围**：desktop
- **建议修复**：在 `channel-manifest.js` 的 `UPDATE_CHANNELS` 加 `'update:openReleasePage'`。
- **验收**：`node --test scripts/desktop-ipc-handlers.test.mjs` 通过；新增断言覆盖该 channel。
- **工作量**：0.25 天
- **独立 PR**：是；与 NEW-2 合并

---

### [P1] ARCH-02 — 三套 Electron 装配策略并存，`createLLMService` 隐式 ElectronProxy 分支

- **类别**：架构
- **状态**：部分修（image-understanding 已 secure，但 `createLLMService` 分支仍存）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\service.ts:387-404` — `if (isRunningInElectron()) return new ElectronLLMProxy()` 忽略 `modelManager`
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:875-878` — image-understanding-understand 已 secure（vs FULL-SCAN 已修）
- **问题代码**：
```ts
// packages/core/src/services/llm/service.ts:387-404
export function createLLMService(config: LLMServiceConfig): LLMService {
  if (isRunningInElectron()) {
    return new ElectronLLMProxy(); // ← 忽略 config.modelManager
  }
  return new LLMServiceImpl(config);
}
```
- **失败场景**：桌面端切换模型配置 → `modelManager` 变更 → `ElectronLLMProxy` 不感知 → 仍用旧配置。
- **影响范围**：desktop
- **建议修复**：`isRunningInElectron` 分支移到调用方（UI 显式选择 Proxy vs Impl）；`createLLMService` 仅返回 `LLMServiceImpl`。
- **验收**：grep `isRunningInElectron` 在 `core/src/services` 下 ≤ 1 处。
- **工作量**：1 天
- **独立 PR**：是

---

### [P1] ARCH-03 — UI 包 re-export core 全部工厂与 Electron Proxy，包边界失效

- **类别**：架构
- **状态**：仍开放（引用 FULL-SCAN ARCH-03）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\index.ts:168-211` — re-export 21 个 core 工厂 + 13 个 `Electron*Proxy`（vs FULL-SCAN 14+13，core 工厂从 14 增至 21）
- **问题代码**：
```ts
// packages/ui/src/index.ts:168-211
export {
  createLLMService, createPromptService, createImageService,
  // ... 21 个 core 工厂
} from '@prompt-optimizer/core';
export {
  ElectronLLMProxy, ElectronImageProxy, ElectronImageUnderstandingProxy,
  // ... 13 个 Proxy
} from '@prompt-optimizer/core/electron';
```
- **失败场景**：core 内部重构 → UI re-export 失效 → web/extension 构建失败（无版本隔离）。
- **影响范围**：web / extension / ui
- **建议修复**：UI 不再 re-export core 工厂；web/extension `dependencies` 直接声明 core；UI 仅保留 `export type`。
- **验收**：`packages/ui/src/index.ts` 不再出现 `export { ... } from '@prompt-optimizer/core'`（仅 `export type`）。
- **工作量**：2 天（跨包改动大，建议拆 3-5 个 PR）
- **独立 PR**：否；高杠杆重构（见 §4）

---

### [P1] ARCH-04 — 远程备份两套并行实现，UI bundle 被 `@aws-sdk/client-s3` 膨胀

- **类别**：架构
- **状态**：仍开放（引用 FULL-SCAN ARCH-04）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\utils\remote-backup.ts:1-8, 586-592, 1545-1716` — UI 直接 import `@aws-sdk/client-s3`
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\remote-storage.js:8, 30-41` — desktop 重复实现 S3/WebDAV，含路径校验差异
- **问题代码**：
```ts
// packages/ui/src/utils/remote-backup.ts:1-8
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
// ↑ UI bundle 含整个 SDK，体积膨胀 > 200KB
```
```js
// packages/desktop/remote-storage.js:30-41
function normalizeObjectPath(path) {
  // ← 比 UI 侧更严格：禁止 ..、控制字符
  if (/[\\\u0000-\u001f\u007f]/.test(path)) throw new Error('invalid path');
}
// UI 侧仅 replace(/^\/+|\/+$/g, '')，路径校验不一致
```
- **失败场景**：web 模式备份 → 路径 `../etc/passwd` 被 UI 接受 → 跨账号访问；desktop 拒绝 → 同一文件两端行为不一致。
- **影响范围**：web / desktop
- **建议修复**：core 新增 `services/remote-storage/`，抽公共 `normalizeObjectPath` / S3 / WebDAV；UI 移除 `@aws-sdk/client-s3`，web 模式仅支持 GoogleDrive。
- **验收**：`packages/ui/package.json` 不含 `@aws-sdk/client-s3`；UI bundle 体积下降 > 200KB。
- **工作量**：2 天
- **独立 PR**：否；高杠杆重构（见 §4）

---

### [P1] ARCH-05 — main.js 模块级 `let` 从 13 增至 15，无 ServiceContainer（恶化）

- **类别**：架构
- **状态**：恶化（FULL-SCAN 标 13 个，当前 15 个）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:180-183` — 15 个模块级 `let`
- **问题代码**：
```js
// packages/desktop/main.js:180-183
let modelManager, templateManager, historyManager, llmService, promptService,
    imageService, imageUnderstandingService, contextManager, dataManager,
    favoriteManager, storageProvider, preferenceProvider, imageModelManager,
    imageAdapterRegistry, updateHandlers;
    // ↑ 15 个模块级可变状态（vs FULL-SCAN 13 个）
```
- **失败场景**：切换 userData → 所有 `let` 需重置 → 漏一个即状态污染；IPC handler 测试无法独立装配。
- **影响范围**：desktop
- **建议修复**：抽 `desktop/service-container.js`，导出 `createServiceContainer({ storageProvider, app })`；main.js 仅调 `container = await createServiceContainer(...)` + `setupIPC(container)`。
- **验收**：`main.js` < 300 行；`service-container.js` 可独立单测。
- **工作量**：2 天
- **独立 PR**：否；高杠杆重构（见 §4）

---

### [P1] ARCH-06 — IPC channel-manifest / preload / handlers 三处手工同步，漏登已发生

- **类别**：架构 / 规范
- **状态**：恶化（新增 `UPDATE_OPEN_RELEASE_PAGE` 漏登，见 NEW-1）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\channel-manifest.js:25-247` — 手工列举 100+ channel
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\preload.js:192-1685` — 手工列举每个 channel 的 invoke wrapper
- **问题代码**：
```js
// packages/desktop/config/ipc/channel-manifest.js:286-302
function assertKnownInvokeChannel(channel) {
  // ← 默认不调用（NEW-2）
  if (!knownChannels.has(channel)) {
    console.warn(`[IPC] Unknown channel: ${channel}`);
  }
}
```
- **失败场景**：新增 channel → 漏登 manifest 或 preload → runtime 才暴露；contract test 无法发现「preload 漏注册」。
- **影响范围**：desktop
- **建议修复**：
  - **方案 A（推荐）**：写 `scripts/gen-ipc-manifest.js` 从 `preload.js` 静态分析生成 channel-manifest；CI 比对一致性。
  - **方案 B（中期）**：schema-first 定义 IPC，自动生成 preload + manifest + handler 签名。
- **验收**：CI 中 `pnpm run check:ipc-manifest` 比对 preload 与 manifest，差异即失败。
- **工作量**：1 天
- **独立 PR**：是

---

### [P1] ARCH-07 — `createDetailedErrorResponse` 仍 9 处调用泄露 stack trace

- **类别**：架构 / 安全
- **状态**：仍开放（引用 FULL-SCAN ARCH-07）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:706-809` — `createDetailedErrorResponse` 把 stack trace / additional properties / complete object dump 序列化进 IPC 响应，9 处调用
- **问题代码**：
```js
// packages/desktop/main.js:752-815
function createDetailedErrorResponse(error, context) {
  return {
    success: false,
    error: {
      message: error.message,
      stack: error.stack, // ← 泄露主进程文件路径与依赖结构
      additionalProperties: { ...error }, // ← 完整对象 dump
    },
  };
}
```
- **失败场景**：renderer 被 XSS → 调用任意 IPC → 触发异常 → stack trace 暴露主进程模块路径、Electron 版本、文件系统结构 → 辅助攻击者构造后续攻击。
- **影响范围**：desktop
- **建议修复**：废弃 `createDetailedErrorResponse` / `createStructuredErrorResponse`；所有 handler 统一 `createErrorResponse`；stack trace 仅写主进程日志（`electron-log`）。
- **验收**：grep `createDetailedErrorResponse` 在 `main.js` 与 `config/ipc` 下为 0；所有 IPC 错误响应 shape 统一为 `{ success: false, error: { message, code?, params? } }`。
- **工作量**：1 天
- **独立 PR**：是

---

### [P1] ARCH-08 — web vite define 把所有 `VITE_*` 注入 bundle（含 API 密钥）

- **类别**：架构 / 安全
- **状态**：仍开放（引用 FULL-SCAN ARCH-08）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\web\vite.config.ts:8-14, 65-73` — `processEnv = { ...DEFAULT_VITE_ENV, ...env }` 全量合并
  - 对照：`packages\desktop\config\runtime-security.js:1-29` — desktop 仅暴露 `^VITE_(?:APP|PUBLIC)_[A-Z0-9_]+$`
- **问题代码**：
```ts
// packages/web/vite.config.ts:8-14, 65-73
const processEnv = { ...DEFAULT_VITE_ENV, ...env }; // ← env 含所有 VITE_*，未过滤
define: {
  'process.env': JSON.stringify(processEnv), // ← VITE_OPENAI_API_KEY 内联进 bundle
};
```
- **失败场景**：用户 `VITE_OPENAI_API_KEY=sk-xxx pnpm build:web` → bundle 中含字面量 `sk-xxx` → 公开部署即泄露。
- **影响范围**：web / extension
- **建议修复**：web 的 `vite.config.ts` 仅 define `VITE_APP_*` / `VITE_PUBLIC_*`（与 desktop runtime-security 同 allowlist）。
- **验收**：`vite build` 后 grep bundle 中 `VITE_OPENAI_API_KEY` 字面量值为空或占位符。
- **工作量**：0.5 天
- **独立 PR**：是

---

### [P1] ARCH-09 — MCP 与 Desktop 的 PromptService 调用语义不一致

- **类别**：架构 / 正确性
- **状态**：仍开放（引用 FULL-SCAN ARCH-09）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\mcp-server\src\index.ts:234-246` — `optimizePrompt({ targetPrompt, modelKey: 'mcp-default' })` 不传 contextData
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\mcp-server\src\index.ts:353-359` — `iteratePrompt(prompt, prompt, ...)` originalPrompt 与 lastOptimizedPrompt 相同
- **问题代码**：
```ts
// packages/mcp-server/src/index.ts:353-359
const result = await promptService.iteratePrompt(
  prompt, prompt, requirements, 'mcp-default', templateId
  // ↑ lastOptimizedPrompt 应是上次优化结果，传原始 prompt 让 LLM 误以为上次没改变
);
```
- **失败场景**：MCP 用户迭代优化 → LLM 看到 originalPrompt === lastOptimizedPrompt → 误判「上次优化无变化」→ 迭代方向错乱。
- **影响范围**：mcp
- **建议修复**：MCP 的 `CoreServicesManager` 加 `historyManager`，每次 optimize/iterate 后调 `historyManager.addRecord`；修正 `iteratePrompt` 的 lastOptimizedPrompt 参数。
- **验收**：MCP 优化结果能在 desktop history 中看到；iteratePrompt 的 lastOptimizedPrompt 来自上次结果。
- **工作量**：1 天
- **独立 PR**：是

---

### [P1] ARCH-10 — web/extension 通过 vite alias 直指 core/ui 源码

- **类别**：架构
- **状态**：仍开放（引用 FULL-SCAN ARCH-10）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\web\vite.config.ts:51-63` — `'@prompt-optimizer/core': path.resolve(__dirname, '../core/src/index.ts')`
- **问题代码**：
```ts
// packages/web/vite.config.ts:51-63
resolve: {
  alias: {
    '@prompt-optimizer/core': path.resolve(__dirname, '../core/src/index.ts'),
    // ↑ 注释明言「Prefer source for monorepo」
  },
}
```
- **失败场景**：core 内部源码改动 → web 构建直接拿到未发布 API → 破坏性变更无版本闸门。
- **影响范围**：web / extension
- **建议修复**：保留 dev 模式 alias，生产 `vite build` 强制走 dist（`mode === 'development' ? src : dist`）。
- **验收**：`vite build` 产物中 core 相关代码来自 `packages/core/dist/index.js`。
- **工作量**：0.5 天
- **独立 PR**：是

---

### [P1] ARCH-11 — StorageFactory 进程级单例缓存，限制多实例与测试隔离

- **类别**：架构
- **状态**：仍开放（引用 FULL-SCAN ARCH-11）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\storage\factory.ts:13-14, 22-53` — `private static instances: Map<StorageType, IStorageProvider>`
- **问题代码**：
```ts
// packages/core/src/services/storage/factory.ts:13-14
private static instances: Map<StorageType, IStorageProvider> = new Map();
// ↑ 同 type 全局共享，无法支持「同 type 多路径」
```
- **失败场景**：测试套件忘 `StorageFactory.reset()` → 状态泄漏到下一个测试；未来支持多账号需重构。
- **影响范围**：core / 测试
- **建议修复**：`instances` 改为 `Map<string, IStorageProvider>`，key = `${type}:${scopeId}`；`create(type, scopeId = 'default')`。
- **验收**：同进程 `create('file', 'user-a')` 与 `create('file', 'user-b')` 返回独立实例。
- **工作量**：1 天
- **独立 PR**：是

---

### [P1] ARCH-12 — Desktop 退出流程双写：window close 与 before-quit 重复保存

- **类别**：正确性
- **状态**：仍开放（引用 FULL-SCAN ARCH-12）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:510-557, 1017-1061` — close 与 before-quit 都 `event.preventDefault()` + `flush()` + 5s 计时器 + 10s emergency
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:1080` — `isQuitting = false` 在 finally 重置
- **问题代码**：
```js
// packages/desktop/main.js:510-557
mainWindow.on('close', (event) => {
  event.preventDefault();
  storageProvider.flush();
  // ... 5s forceQuitTimer + 10s setupEmergencyExit
  isQuitting = true;
  finally { isQuitting = false; } // ← 重置导致 before-quit 再次进入保存路径
});
```
- **失败场景**：关窗 → close handler flush → finally 重置 → before-quit 再次 flush → 两次写间数据变化致冲突；exit code 不稳定影响 electron-updater。
- **影响范围**：desktop
- **建议修复**：抽 `desktop/quit-flow.js` 统一 `performGracefulQuit(reason)`；`isQuitting` 不在 finally 重置。
- **验收**：手动关窗 → 退出 < 2s；exit code 恒为 0；日志中只出现一次 `[DESKTOP] Saving data before quit`。
- **工作量**：1 天
- **独立 PR**：是

---

### [P1] NEW-2 — `assertKnownInvokeChannel` 默认不调用，channel 契约校验形同虚设

- **类别**：架构 / 安全
- **状态**：新增（FULL-SCAN 未覆盖）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\channel-manifest.js:286-302` — 函数定义存在但 `registerSecureIpcHandler` / `registerSensitiveIpc` 未调用
- **问题代码**：
```js
// packages/desktop/config/ipc/channel-manifest.js:286-302
export function assertKnownInvokeChannel(channel) {
  if (!knownChannels.has(channel)) {
    console.warn(`[IPC] Unknown channel: ${channel}`);
    // ← 仅 warn，未 throw；且无调用方
  }
}
```
- **失败场景**：新增 channel 漏登 manifest → `assertKnownInvokeChannel` 不触发 → 漏登通道在 runtime 才暴露。
- **影响范围**：desktop
- **建议修复**：在 `registerSecureIpcHandler` / `registerSensitiveIpc` 入口调用 `assertKnownInvokeChannel(channel)` 并改为 `throw`；CI 已有 `desktop-ipc-handlers.test.mjs` 扩展断言。
- **验收**：注册未登记 channel 时主进程启动失败。
- **工作量**：0.5 天
- **独立 PR**：是；与 NEW-1 合并

---

### [P1] S10-sub1 — `assertTrustedRendererSender` 未覆盖所有 secure handler

- **类别**：安全
- **状态**：仍开放（S10 主项已修，子项仍开放）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc-security.js:79-96` — `registerSecureIpcHandler` 强制 sender 校验
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\update-handlers.js:38-59` — `secureHandle` 包装 `assertTrustedRendererSender`
  - 抽查：部分 `registerSensitiveIpc` 调用未显式 sender 校验（依赖包装函数）
- **问题代码**：
```js
// packages/desktop/main.js:839-846
registerSensitiveIpc('data:importAllData', async (event, data) => {
  // ← 依赖 registerSensitiveIpc 内部 sender 校验，但未显式 assertTrustedRendererSender
  return await dataManager.importAllData(data);
});
```
- **失败场景**：若 `registerSensitiveIpc` 实现被修改去掉 sender 校验 → 所有 sensitive handler 暴露。
- **影响范围**：desktop
- **建议修复**：所有 sensitive handler 显式调 `assertTrustedRendererSender(event)`；或加单测断言 `registerSensitiveIpc` 内部必调 sender 校验。
- **验收**：单测覆盖 `registerSensitiveIpc` 的 sender 校验路径；mock 伪造 sender → 抛错。
- **工作量**：0.5 天
- **独立 PR**：是

---

### [P1] S12 — Docker nginx CSP 含 `http:/unsafe-inline/ws:`

- **类别**：安全
- **状态**：仍开放（引用 FULL-SCAN S12）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\docker\nginx.conf:12` — CSP 含 `http:/unsafe-inline/ws:`
- **问题代码**：
```nginx
# docker/nginx.conf:12
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http: https: ws: wss:; ...";
# ↑ unsafe-inline + unsafe-eval + http: + ws: 全开
```
- **失败场景**：公网部署 → CSP 无法挡 XSS（unsafe-inline）与中间人（http:）。
- **影响范围**：docker
- **建议修复**：移除 `unsafe-inline` / `unsafe-eval`；`connect-src` 限制为 `self` + 用户 LLM 域白名单；`http:` 仅开发模式。
- **验收**：`curl -I https://<host>/` 返回的 CSP 不含 `unsafe-inline`。
- **工作量**：0.5 天
- **独立 PR**：是；与 S22 / S18 合并

---

### [P1] S13 — `/assets` 与 `/healthz` 绕过 Basic Auth

- **类别**：安全
- **状态**：部分修（`/mcp` 已 `auth_basic off` 因 MCP 有 Bearer；但 `/assets` 与 `/healthz` 仍绕过）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\docker\nginx.conf:23-27, 48-57` — `auth_basic off` 用于 `/assets` 与 `/healthz`
- **问题代码**：
```nginx
# docker/nginx.conf:23-27
location /assets/ {
  auth_basic off; # ← 静态资源绕过 Basic Auth
}
location /healthz {
  auth_basic off; # ← 健康检查绕过
}
```
- **失败场景**：未授权用户访问 `/assets/index-xxx.js` → 拿到 bundle 源码 → 分析前端逻辑辅助攻击。
- **影响范围**：docker
- **建议修复**：
  - **方案 A（推荐）**：`/healthz` 改用独立端口（如 8080）仅内网暴露；`/assets` 保留 `auth_basic` 但允许 `Range` 请求。
  - **方案 B**：`/assets` 加 `internal` 限制，仅通过前端代理访问。
- **验收**：未带 Basic Auth 凭据 `curl https://<host>/assets/` 返回 401。
- **工作量**：0.5 天
- **独立 PR**：是

---

### [P1] S19 — `generate-auth.sh` `chmod -R a+r` 仍开放

- **类别**：安全
- **状态**：仍开放（引用 FULL-SCAN S19）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\docker\generate-auth.sh:28` — `chmod -R a+r`
- **问题代码**：
```bash
# docker/generate-auth.sh:28
chmod -R a+r "$AUTH_DIR"
# ↑ 任意用户可读，含 .htpasswd
```
- **失败场景**：容器内其他非特权进程读取 `.htpasswd` → 离线爆破 Basic Auth 密码。
- **影响范围**：docker
- **建议修复**：`chmod -R go-rwx`；仅 nginx 进程用户可读。
- **验收**：`docker exec <container> ls -la /etc/nginx/auth` 显示 `go-rwx`。
- **工作量**：0.25 天
- **独立 PR**：是

---

### [P1] S20 — `/healthz` 公网暴露 + MCP_AUTH_TOKEN 部分强制

- **类别**：安全
- **状态**：部分修（compose 强制 `MCP_AUTH_TOKEN`，但 `/healthz` 仍开放）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\docker\docker-compose.yml:40-43` — `MCP_AUTH_TOKEN` 必填
  - `D:\PromtOptimizer\src\prompt-optimizer\docker\nginx.conf:48-57` — `/healthz` 无鉴权
- **问题代码**：
```yaml
# docker/docker-compose.yml:40-43
environment:
  - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN:?MCP_AUTH_TOKEN is required}
  - ACCESS_PASSWORD=${ACCESS_PASSWORD:-} # ← 仍允许空（S22）
```
- **失败场景**：`/healthz` 暴露容器健康状态 + 版本信息 → 辅助攻击者侦察。
- **影响范围**：docker
- **建议修复**：`/healthz` 改用独立端口或限制源 IP；与 S13 合并。
- **验收**：`curl https://<host>/healthz` 返回 401。
- **工作量**：0.25 天
- **独立 PR**：是；与 S13 合并

---

### [P1] SPEC-04 — CI 只跑 `test:gate`，缺 lint / check:docs / mcp:test

- **类别**：测试发布
- **状态**：部分修（FULL-SCAN 标仍开放，CI 已扩到部分 check，但 lint/docs/mcp 仍缺）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\.github\workflows\test.yml:43-52` — 仅 `pnpm test:gate`
- **问题代码**：
```yaml
# .github/workflows/test.yml:43-52
- run: pnpm test:gate
# ← 缺 pnpm lint / pnpm check:docs / pnpm mcp:test
```
- **失败场景**：PR 引入 lint 错误或文档漂移 → CI 绿 → 合并后才发现。
- **影响范围**：ci
- **建议修复**：CI 增加 `pnpm lint` + `pnpm check:docs` + `pnpm mcp:test` 三个 step。
- **验收**：`.github/workflows/test.yml` 含 4 个 test step；故意引入 lint 错误 → CI 红。
- **工作量**：0.5 天
- **独立 PR**：是；与 SPEC-01 合并

---

### [P1] SPEC-06 — Electron 未显式 `sandbox: true`

- **类别**：安全
- **状态**：仍开放（引用 FULL-SCAN SPEC-06）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:395-404` — `webPreferences` 缺 `sandbox: true`
- **问题代码**：
```js
// packages/desktop/main.js:395-404
const mainWindow = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    // ← 缺 sandbox: true
  },
});
```
- **失败场景**：renderer 被 XSS → 即使 contextIsolation 挡住 prototype 污染，仍可访问 Electron 内部 API（非 sandbox 模式）。
- **影响范围**：desktop
- **建议修复**：`webPreferences` 加 `sandbox: true`；preload 改用 `contextBridge` 仅暴露白名单 API（已满足）。
- **验收**：`main.js` 含 `sandbox: true`；桌面端功能正常（preload 不依赖 Node API）。
- **工作量**：0.5 天（需测试 preload 兼容性）
- **独立 PR**：是

---

### [P1] SPEC-07 — `dev-app-update.yml` 仍指上游 `linshenkx`

- **类别**：规范
- **状态**：部分修（release.yml 已动态改写，dev-app-update.yml 未改）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\dev-app-update.yml:1-4` — `owner: linshenkx`
- **问题代码**：
```yaml
# packages/desktop/dev-app-update.yml:1-4
owner: linshenkx
repo: prompt-optimizer
# ↑ dev 模式仍指上游
```
- **失败场景**：开发模式启动桌面端 → 自动更新检查打到上游 → 拿到上游 release（与 fork 不兼容）。
- **影响范围**：desktop / 开发流程
- **建议修复**：改为 `owner: xvyimu`；或 dev 模式禁用自动更新。
- **验收**：`dev-app-update.yml` 含 `owner: xvyimu`。
- **工作量**：0.25 天
- **独立 PR**：是

---

### [P1] R-14 — `evaluation/service.ts` `as any` 从 5+ 增至 10+（恶化）

- **类别**：代码质量
- **状态**：恶化（FULL-SCAN 标 5+，当前 10+）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\evaluation\service.ts:549, 2917-2931, 3155, 3176-3177, 3196-3198, 3208-3209` — 10+ 处 `as any`
- **问题代码**：
```ts
// packages/core/src/services/evaluation/service.ts:549
const result = await adapter.chat(messages, options) as any;
// ↑ 类型丢失，后续 result.xxx 无类型检查
```
- **失败场景**：adapter 返回结构变化 → `as any` 不报错 → runtime 才暴露 undefined。
- **影响范围**：core / 评估功能
- **建议修复**：定义 `LLMEvaluationResult` 接口；逐个替换 `as any` 为具体类型或类型守卫。
- **验收**：grep `as any` 在 `evaluation/service.ts` 为 0。
- **工作量**：1 天
- **独立 PR**：是

---

### [P1] SPEC-13 — main.js console 调用从 27 增至 73（恶化）

- **类别**：规范
- **状态**：恶化（FULL-SCAN 标 27，当前 73）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js` — 73 处 `console.log/warn/error`
- **问题代码**：
```js
// packages/desktop/main.js (示例)
console.log('[DESKTOP] Initializing services...');
console.warn('[DESKTOP] Storage provider not ready');
console.error('[DESKTOP] Failed to flush data', error);
// ↑ 73 处，应统一走 electron-log
```
- **失败场景**：生产环境日志丢失（console 输出到 stdout，未持久化）；日志格式不统一。
- **影响范围**：desktop
- **建议修复**：替换为 `electron-log`；保留 console 仅用于启动早期（electron-log 未初始化时）。
- **验收**：grep `console\.(log|warn|error)` 在 `main.js` ≤ 5 处。
- **工作量**：1 天
- **独立 PR**：是

---

### [P1] R-19 — `model-addModel` IPC 写入含 apiKey 配置，无脱敏

- **类别**：安全
- **状态**：仍开放（引用 FULL-SCAN R-19）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js` model-addModel handler
- **问题代码**：
```js
// packages/desktop/main.js (model-addModel handler)
registerSensitiveIpc('model:addModel', async (_event, modelConfig) => {
  // ← modelConfig.apiKey 明文写入 userData/prompt-optimizer-data.json
  return await modelManager.addModel(modelConfig);
});
```
- **失败场景**：userData 文件被备份到远程 → apiKey 明文泄露；或 XSS 拿到文件路径 → 读取。
- **影响范围**：desktop
- **建议修复**：用 Electron `safeStorage.encryptString` 加密 apiKey；存储时加密，使用时解密。
- **验收**：`userData/prompt-optimizer-data.json` 中 `apiKey` 字段为加密 base64。
- **工作量**：1 天
- **独立 PR**：是

---

### [P1] R-22 — `FavoriteManager.exportData` 已实现，但 `DataManager` 未纳入

- **类别**：正确性
- **状态**：仍开放（引用 FULL-SCAN R-22）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\data\manager.ts:67-94, 130-137` — DataManager 未含 favorites
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\favorite\manager.ts` — FavoriteManager 已实现 `exportData` / `importData`
- **问题代码**：
```ts
// packages/core/src/services/data/manager.ts:67-94
async exportAllData() {
  return {
    history: await historyManager.exportData(),
    models: await modelManager.exportData(),
    templates: await templateManager.exportData(),
    settings: await preferenceManager.exportData(),
    contexts: await contextManager.exportData(),
    // ← 缺 favorites: await favoriteManager.exportData()
  };
}
```
- **失败场景**：用户「导出全部」→ 不含收藏 → 在新设备「导入全部」→ 收藏丢失。
- **影响范围**：web / desktop / extension
- **建议修复**：DataManager `exportAllData` 加 `favorites: await favoriteManager.exportData()`；`importAllData` 加对应导入。
- **验收**：导出文件含 `favorites` 字段；导入后收藏恢复。
- **工作量**：0.5 天
- **独立 PR**：是

---

### [P2] ARCH-13 — Adapter Registry 硬编码 16 个适配器

- **类别**：架构
- **状态**：仍开放（引用 FULL-SCAN ARCH-13）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\adapters\registry.ts:55-93` — 16 个硬编码适配器
- **问题代码**：
```ts
// packages/core/src/services/llm/adapters/registry.ts:55-93
const adapters = [
  new OpenAIAdapter(), new GeminiAdapter(), new DeepSeekAdapter(),
  new ZhipuAdapter(), /* ... 16 个 */
];
```
- **失败场景**：新增供应商 → 改 core 源码 → 发版。
- **影响范围**：core
- **建议修复**：改用注册式（`adapterRegistry.register('openai', () => new OpenAIAdapter())`）；或从配置文件加载。
- **验收**：新增供应商无需改 core 源码。
- **工作量**：1 天
- **独立 PR**：是

---

### [P2] ARCH-14 — core `chrome-built-in` 导出从 7 增至 8（恶化）

- **类别**：架构
- **状态**：恶化（FULL-SCAN 标 7，当前 8）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\index.ts:51-66` — 8 个 chrome-built-in 导出
- **问题代码**：
```ts
// packages/core/src/index.ts:51-66
export {
  chromeBuiltInAdapter,
  chromeBuiltInModelManager,
  // ... 8 个 chrome-built-in 相关导出
} from './services/llm/adapters/chrome-built-in';
```
- **失败场景**：core 公共 API 表面持续膨胀，难以稳定。
- **影响范围**：core
- **建议修复**：收敛为单一入口 `export * as chromeBuiltIn from './...'`；或移到独立子路径。
- **验收**：core `index.ts` 的 chrome-built-in 导出 ≤ 1 处。
- **工作量**：0.5 天
- **独立 PR**：是

---

### [P2] SPEC-14 — `global.d.ts` ~40 处 `any`

- **类别**：规范
- **状态**：仍开放（引用 FULL-SCAN SPEC-14）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\types\global.d.ts:13-136` — ~40 处 `any`
- **问题代码**：
```ts
// packages/core/src/types/global.d.ts:13-136
declare global {
  interface Window {
    [key: string]: any; // ← 40 处 any
  }
}
```
- **失败场景**：类型检查失效 → renderer 调用不存在的 API 不报错。
- **影响范围**：core / 类型系统
- **建议修复**：定义具体接口；或改 `unknown` 强制类型守卫。
- **验收**：grep `: any` 在 `global.d.ts` 为 0。
- **工作量**：1 天
- **独立 PR**：是

---

### [P2] NEW-3 — `naive-theme.ts` `__themeWatchInitialized` 使用在前声明在后

- **类别**：代码质量
- **状态**：新增
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\config\naive-theme.ts:1100-1117` — `__themeWatchInitialized` 在使用后才声明
- **问题代码**：
```ts
// packages/ui/src/config/naive-theme.ts:1100-1117
if (window.__themeWatchInitialized) { // ← 使用在前
  return;
}
// ... 中间若干行
window.__themeWatchInitialized = true; // ← 声明在后
```
- **失败场景**：严格模式或类型检查下报警告；逻辑可读性差。
- **影响范围**：ui
- **建议修复**：声明提前到使用前。
- **验收**：`vue-tsc` 无警告。
- **工作量**：0.25 天
- **独立 PR**：是

---

### [P2] NEW-4 — `storage/adapter.ts` 鸭子类型 + `as any`

- **类别**：代码质量
- **状态**：新增
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\storage\adapter.ts:38, 68, 87-88` — 鸭子类型 + `as any`
- **问题代码**：
```ts
// packages/core/src/services/storage/adapter.ts:38, 68, 87-88
function isFileStorage(obj: any): obj is IFileStorageProvider { // ← any
  return typeof obj.read === 'function' && typeof obj.write === 'function';
}
```
- **失败场景**：第三方实现漏方法 → 鸭子类型通过 → runtime 才暴露。
- **影响范围**：core
- **建议修复**：改用 `unknown` + 类型守卫；或要求显式实现接口。
- **验收**：grep `as any` 在 `adapter.ts` 为 0。
- **工作量**：0.5 天
- **独立 PR**：是

---

### [P2] R-23 — `remote-backup.ts` UI 与 desktop 路径校验不一致（ARCH-04 子项）

- **类别**：正确性
- **状态**：仍开放（引用 FULL-SCAN R-23）
- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\utils\remote-backup.ts:586-592` — `normalizeObjectPath` 仅 `replace(/^\/+|\/+$/g, '')`
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\remote-storage.js:30-41` — 严格校验 `..` 与控制字符
- **问题代码**：
```ts
// packages/ui/src/utils/remote-backup.ts:586-592
function normalizeObjectPath(path: string) {
  return path.replace(/^\/+|\/+$/g, ''); // ← 不校验 .. 与控制字符
}
```
- **失败场景**：web 模式备份路径 `../etc/passwd` → UI 接受 → 跨账号访问。
- **影响范围**：web
- **建议修复**：与 ARCH-04 合并，抽 core 公共 `normalizeObjectPath`。
- **验收**：UI 与 desktop 行为一致；`../` 路径被拒。
- **工作量**：与 ARCH-04 合并
- **独立 PR**：否

---

**问题清单计数：**

| 级别 | 数量 | 编号 |
|------|------|------|
| P0 | 9 | ARCH-01/R-01, R-02, R-03, S11, SPEC-01, SPEC-02, S22, S18, NEW-1 |
| P1 | 17 | ARCH-02, ARCH-03, ARCH-04, ARCH-05, ARCH-06, ARCH-07, ARCH-08, ARCH-09, ARCH-10, ARCH-11, ARCH-12, NEW-2, S10-sub1, S12, S13, S19, S20, SPEC-04, SPEC-06, SPEC-07, R-14, SPEC-13, R-19, R-22 |
| P2 | 6 | ARCH-13, ARCH-14, SPEC-14, NEW-3, NEW-4, R-23 |
| **合计** | **32** | （去重后有效条目 ≥ 25 ✅） |

---

## 4. 高杠杆重构 Top3（各 <2 天）

### 重构 1：流式契约 4 件套（ARCH-01 / R-01 / R-02 / R-03）

- **目标**：桌面端流式响应 `onComplete(response)` 收到完整 payload；消除双 toast；testCustomConversationStream 错误传播。
- **改动文件**：
  - `packages/core/src/services/llm/electron-proxy.ts` — `onFinish: (payload) => callbacks.onComplete(payload ?? { content: '' })`
  - `packages/desktop/preload.js` — finishListener 提取 payload 字段
  - `packages/core/src/services/llm/service.ts` — 移除 catch 块的 `throw error`（仅 onError）
  - `packages/core/src/services/prompt/service.ts` — testCustomConversationStream 加 `throw error`
- **验收**：单测 + 桌面端 e2e 验证工具调用展示。
- **工作量**：1 天
- **独立 PR**：是

### 重构 2：Docker 公网部署安全 4 件套（S22 / S18 / S13 / S20）

- **目标**：Docker 默认拒绝空 ACCESS_PASSWORD；supervisord 非 root；`/assets` 与 `/healthz` 加鉴权或独立端口。
- **改动文件**：
  - `docker/docker-compose.yml` — `ACCESS_PASSWORD:?required`
  - `docker/supervisord.conf` — `user=appuser`
  - `docker/nginx.conf` — `/assets` 加 `auth_basic`；`/healthz` 移到 8080 端口
  - `docker/Dockerfile` — 创建 `appuser`
- **验收**：`docker compose up` 未设密码 → 启动失败；`curl /assets` → 401。
- **工作量**：1.5 天
- **独立 PR**：是

### 重构 3：CI 门禁修复（SPEC-01 / SPEC-04）

- **目标**：`pnpm test:gate` 绿；CI 增加 lint / check:docs / mcp:test。
- **改动文件**：
  - `scripts/package-scripts.test.mjs` — 逐条比对断言与 `package.json` scripts
  - `.github/workflows/test.yml` — 增加 3 个 step
- **验收**：`pnpm test:gate` 退出码 0；故意引入 lint 错误 → CI 红。
- **工作量**：1 天
- **独立 PR**：是

---

## 5. 明确不要碰 Top3

### 不要碰 1：core 的 `LLMService` 接口签名

- **原因**：被 web/desktop/extension/mcp 四端依赖；改签名会触发跨包大重构。
- **替代**：仅修内部实现（如 R-02 的 catch 块），保持 `sendMessageStream(messages, options, callbacks): Promise<void>` 签名不变。

### 不要碰 2：Electron `contextBridge` 暴露的 API 形状

- **原因**：preload 的 `contextBridge.exposeInMainWorld` 形状被 renderer 大量调用；改形状需同步改所有调用方。
- **替代**：仅扩展（加新方法），不修改现有方法签名；废弃方法保留 deprecated 标注。

### 不要碰 3：`packages/ui/src/index.ts` 的 re-export 表（除非做 ARCH-03 完整重构）

- **原因**：21 个 core 工厂 + 13 个 Proxy 被所有 UI 组件依赖；零散改会引入不一致。
- **替代**：要么完整重构（ARCH-03，2 天 + 拆 3-5 PR），要么不动；避免「改一半」状态。

---

## 6. 目标架构与迁移顺序（≤5 步）

### 目标架构草图

```
                ┌──────────── 用户设备 ────────────┐
                │  Web (Vite SPA, public VITE_* only) │
                │  Chrome Extension                │
                │  Electron Renderer (sandbox: true)│
                │       │                          │
                │       ▼                          │
                │  packages/ui (仅 Vue 组件 + i18n) │
                │       │                          │
                │       ▼ web/extension 直接依赖   │
                │  packages/core (domain + types)  │
                │       │                          │
                │       │ Desktop: IPC via preload │
                │       ▼                          │
                │  Electron Main                   │
                │   ├ service-container.ts         │
                │   ├ ipc/ (all secure + manifest) │
                │   ├ stream-runner (owner-bound)  │
                │   ├ safeStorage (apiKey 加密)    │
                │   └ quit-flow.ts (单一 quit)     │
                └──────────────────────────────────┘
                          │
                ┌─────────┴────────────────────────┐
                │ Docker (non-root + auth all)     │
                │ Vercel (HMAC Cookie)              │
                │ MCP (Bearer + Origin + history)   │
                └───────────────────────────────────┘
```

### 边界规则（5-7 条）

1. core 不依赖 ui/web/desktop/extension/mcp；违反即拒绝合并
2. UI 不再 re-export core 工厂；web/extension 直接依赖 core
3. 新 IPC 必须进 channel-manifest + 用 secure 注册；`assertKnownInvokeChannel` 在注册时调用
4. 流式通道必须 owner-bound cancel + payload 完整传递
5. Desktop `webPreferences` 必须含 `sandbox: true` + `contextIsolation: true` + `nodeIntegration: false`
6. Docker 容器进程必须非 root；`/healthz` 独立端口；`/assets` 加鉴权
7. CI 必须跑 `test:gate` + `lint` + `check:docs` + `mcp:test` 四件套

### 迁移顺序（≤5 步）

| 步 | 内容 | 依赖 | 可并行 |
|----|------|------|--------|
| 1 | 流式契约 4 件套（ARCH-01/R-01/R-02/R-03）+ MarkdownRenderer XSS（S11） | 无 | ✅ 两者并行 |
| 2 | CI 门禁（SPEC-01/04）+ Docker 安全（S22/S18/S13/S20）+ vite define（ARCH-08） | 无 | ✅ 三者并行 |
| 3 | IPC manifest 漏登修复（NEW-1/NEW-2）+ `createDetailedErrorResponse` 收口（ARCH-07）+ `sandbox: true`（SPEC-06） | 无 | ✅ 三者并行 |
| 4 | main.js ServiceContainer 抽取（ARCH-05）+ quit-flow 统一（ARCH-12） | 步 3 | ✅ 两者并行 |
| 5 | UI re-export 拆分（ARCH-03）+ remote-backup 统一（ARCH-04/R-23）+ StorageFactory scopeId（ARCH-11） | 步 4 | ✅ 三者并行 |

---

## 7. 30/60/90 天路线图（单人 fork 可执行）

### 30 天（P0 + 高杠杆重构）

| 周 | 任务 | 验收 |
|----|------|------|
| W1 | 流式契约 4 件套 + MarkdownRenderer XSS | 桌面端工具调用展示正常；XSS 注入测试失败 |
| W2 | CI 门禁修复 + Docker 安全 4 件套 | `pnpm test:gate` 绿；Docker 空密码拒绝启动 |
| W3 | vite define 收紧 + IPC manifest 漏登修复 + `createDetailedErrorResponse` 收口 | bundle 无 VITE_OPENAI_API_KEY；`assertKnownInvokeChannel` 启用 |
| W4 | `sandbox: true` + dev-app-update.yml 修正 + R-19 safeStorage | 桌面端 sandbox 启动正常；userData 中 apiKey 加密 |

### 60 天（P1 架构收敛）

| 周 | 任务 | 验收 |
|----|------|------|
| W5-6 | main.js ServiceContainer 抽取（ARCH-05） | `main.js` < 300 行；`service-container.js` 单测 |
| W7 | quit-flow 统一（ARCH-12） + R-22 DataManager favorites | 退出 < 2s；导出含 favorites |
| W8 | ARCH-02 `createLLMService` 分支移除 + R-14 evaluation `as any` 清理 | grep `isRunningInElectron` ≤ 1；grep `as any` 在 evaluation 为 0 |

### 90 天（P2 + 长期债务）

| 周 | 任务 | 验收 |
|----|------|------|
| W9-10 | UI re-export 拆分（ARCH-03，拆 3-5 PR） | UI `index.ts` 仅 `export type` |
| W11 | remote-backup 统一（ARCH-04/R-23）+ StorageFactory scopeId（ARCH-11） | UI 无 `@aws-sdk/client-s3`；同 type 多实例 |
| W12 | Adapter Registry 注册式（ARCH-13）+ SPEC-14 global.d.ts + NEW-3/4 | 新增供应商无需改 core；`as any` 为 0 |

---

## 8. Won't do（≥5 条）

1. **不重开上游 PR** — fork-only 策略；上游 #325-#337 已关闭；本轮所有改动仅落 fork `develop`。
2. **不引入商用代码签名** — 成本高，单人 fork 无需；Win 未签名风险由 `publish.owner=xvyimu` 信任链兜底。
3. **不强制 Playwright extended 常驻 CI** — 资源消耗大；gate 模式已足够；extended 仅本地手动跑。
4. **不扩大 Node engines 到 24** — 当前 `^22` 稳定；升级需全量回归；待 Node 24 LTS 后再评估。
5. **不重写 Docker 为 Kubernetes** — 单容器足够；K8s 增加运维复杂度，超出客户端优先定位。
6. **不引入中心化后端** — 隐私模型是本地 + 直连厂商；中心化后端违反产品定位。
7. **不替换 Vue3 为其他框架** — 当前 UI 体系成熟；替换成本远大于收益。
8. **不强制所有 IPC 用 schema-first** — 方案 B 工作量大；方案 A（gen-ipc-manifest.js）已足够。

---

## 9. 最小 CI / check 建议（具体命令）

### 必跑（PR 阻断）

```yaml
# .github/workflows/test.yml
- run: pnpm test:gate           # 含 test:repo + test:gate:core + test:gate:ui
- run: pnpm lint                # lint:ui + typecheck:ui + lint:mcp + typecheck:core/mcp/web/ext
- run: pnpm check:docs          # 8 个 check-docs-*.mjs
- run: pnpm mcp:test            # @prompt-optimizer/mcp-server test
```

### 扩展建议（新增）

```yaml
- run: pnpm run check:ipc-manifest  # 新增脚本：比对 preload 与 channel-manifest（ARCH-06）
- run: pnpm test:e2e:gate           # Playwright gate 模式（12/12）
```

### 不跑（资源/价值不匹配）

- `pnpm test:e2e:extended` — 资源消耗大，本地手动跑
- `pnpm test:e2e:replay` — VCR 模式，调试用
- `pnpm build:desktop` — 仅发版时跑（CI 用 `build:desktop-only:ci`）

### CI 修复优先级

1. **P0**：修 `scripts/package-scripts.test.mjs`（SPEC-01）— 当前 `test:gate` 红
2. **P0**：加 `pnpm lint` + `pnpm check:docs` + `pnpm mcp:test`（SPEC-04）
3. **P1**：加 `check:ipc-manifest`（NEW-1/NEW-2 修复后）

---

## 10. 证据索引

### P0 证据

| ID | 文件 | 行号 |
|----|------|------|
| ARCH-01/R-01 | `packages/core/src/services/llm/electron-proxy.ts` | 36-54 |
| ARCH-01/R-01 | `packages/desktop/preload.js` | 253-256, 1022-1025 |
| R-02 | `packages/core/src/services/llm/service.ts` | 152-157, 189-194 |
| R-03 | `packages/core/src/services/prompt/service.ts` | 1196-1216 |
| S11 | `packages/ui/src/components/MarkdownRenderer.vue` | 66-81, 262-278 |
| SPEC-01 | `scripts/package-scripts.test.mjs` | 38-46 |
| SPEC-02 | `packages/desktop/build-desktop.bat` | 6-23 |
| S22 | `docker/docker-compose.yml` | 40-43 |
| S18 | `docker/supervisord.conf` | 3 |
| NEW-1 | `packages/desktop/config/ipc/update-handlers.js` | 725-753 |
| NEW-1 | `packages/desktop/config/ipc/channel-manifest.js` | UPDATE_CHANNELS |

### P1 证据

| ID | 文件 | 行号 |
|----|------|------|
| ARCH-02 | `packages/core/src/services/llm/service.ts` | 387-404 |
| ARCH-02 | `packages/desktop/main.js` | 875-878 |
| ARCH-03 | `packages/ui/src/index.ts` | 168-211 |
| ARCH-04 | `packages/ui/src/utils/remote-backup.ts` | 1-8, 586-592, 1545-1716 |
| ARCH-04 | `packages/desktop/remote-storage.js` | 8, 30-41 |
| ARCH-05 | `packages/desktop/main.js` | 180-183 |
| ARCH-06 | `packages/desktop/config/ipc/channel-manifest.js` | 25-247, 286-302 |
| ARCH-06 | `packages/desktop/preload.js` | 192-1685 |
| ARCH-07 | `packages/desktop/main.js` | 706-809 (9 处调用) |
| ARCH-08 | `packages/web/vite.config.ts` | 8-14, 65-73 |
| ARCH-08 | `packages/desktop/config/runtime-security.js` | 1-29 |
| ARCH-09 | `packages/mcp-server/src/index.ts` | 234-246, 353-359 |
| ARCH-10 | `packages/web/vite.config.ts` | 51-63 |
| ARCH-11 | `packages/core/src/services/storage/factory.ts` | 13-14, 22-53 |
| ARCH-12 | `packages/desktop/main.js` | 510-557, 1017-1061, 1080 |
| NEW-2 | `packages/desktop/config/ipc/channel-manifest.js` | 286-302 |
| S10-sub1 | `packages/desktop/config/ipc-security.js` | 79-96 |
| S10-sub1 | `packages/desktop/main.js` | 839-846 |
| S12 | `docker/nginx.conf` | 12 |
| S13 | `docker/nginx.conf` | 23-27, 48-57 |
| S19 | `docker/generate-auth.sh` | 28 |
| S20 | `docker/docker-compose.yml` | 40-43 |
| S20 | `docker/nginx.conf` | 48-57 |
| SPEC-04 | `.github/workflows/test.yml` | 43-52 |
| SPEC-06 | `packages/desktop/main.js` | 395-404 |
| SPEC-07 | `packages/desktop/dev-app-update.yml` | 1-4 |
| R-14 | `packages/core/src/services/evaluation/service.ts` | 549, 2917-2931, 3155, 3176-3177, 3196-3198, 3208-3209 |
| SPEC-13 | `packages/desktop/main.js` | 73 处 console |
| R-19 | `packages/desktop/main.js` | model-addModel handler |
| R-22 | `packages/core/src/services/data/manager.ts` | 67-94, 130-137 |

### P2 证据

| ID | 文件 | 行号 |
|----|------|------|
| ARCH-13 | `packages/core/src/services/llm/adapters/registry.ts` | 55-93 |
| ARCH-14 | `packages/core/src/index.ts` | 51-66 |
| SPEC-14 | `packages/core/src/types/global.d.ts` | 13-136 |
| NEW-3 | `packages/ui/src/config/naive-theme.ts` | 1100-1117 |
| NEW-4 | `packages/core/src/services/storage/adapter.ts` | 38, 68, 87-88 |
| R-23 | `packages/ui/src/utils/remote-backup.ts` | 586-592 |

---

## 11. 自检回执

- [x] 每条 P0 有路径 + 行号 + 问题代码（9 条 P0 全部满足）
- [x] 无未复核的「目录缺失」类断言（所有路径均已通过 Glob/Read 复核）
- [x] 已修项未当新 P0（S1/S2/S6/S10/S15/S17/S21/R-05/R-24/DOC-01~20 均排除）
- [x] 建议均有验收命令或步骤（32 条均有）
- [x] 未擅自改业务代码 / push（仅落盘本报告）
- [x] 去重后有效条目 ≥ 25（实际 32 条）
- [x] 安全/正确性 P0 有代码锚点（ARCH-01/R-01/R-02/R-03/S11/SPEC-01/SPEC-02/S22/S18/NEW-1 均含代码）
- [x] 3 个高杠杆重构（各 <2 天）
- [x] 3 个明确不要碰
- [x] 与历史报告差分明确（§1.1 已修表 + §1.2 仍开放/恶化/新增表）
- [x] 子 agent 结论已回查（误报已剔除：R-09 fileStorageProvider 探测函数、S13 /mcp auth_basic off 必要、S23 Cookie 已 HMAC）

---

## 12. 任务模板（后续 AI 修复每个建议时用）

```markdown
### 任务：{ID} — {短标题}

**目标**：
**完成范围**：
**不做的事**：
**涉及模块与边界**：
**现有接口/数据结构**：
**实现要求**：
**验收标准**：
**验证命令或测试步骤**：
**依赖**：{ID} 或「无」
**工作量**：{}
```

---

## 13. 给后续 AI 的执行提示词

> 将以下提示词复制给执行 AI（建议 GLM-5.2 / Claude / GPT-5 等支持长上下文的模型），配合本报告 §3 的具体条目使用。

```text
你是 PromptOptimizer fork（xvyimu/prompt-optimizer @ develop, v2.11.7）的执行工程师。
你的工作是基于已落盘的审计报告，逐条修复已标注的问题。

# 输入
- 主报告：D:\PromtOptimizer\docs\FULL-SCAN-PLAN-RECOMMENDATIONS-2026-07-21.md
- SSOT：D:\PromtOptimizer\src\prompt-optimizer\docs\project\CURRENT.md
- 历史报告：D:\PromtOptimizer\docs\FULL-AUDIT-REPORT-2026-07-20.md · FULL-SCAN-RECOMMENDATIONS-2026-07-20.md
- 源码根：D:\PromtOptimizer\src\prompt-optimizer
- 安装根：D:\PromtOptimizer\app（NSIS + app.asar）
- 分支：develop（fork-only，默认不向上游开 PR）
- 栈：pnpm@10.6.1 · Node ^22 · Vue3 · Electron · packages: core/ui/web/desktop/extension/mcp-server
- Shell：PowerShell 7（pwsh）

# 硬约束
1. 默认只读 + 单条授权：用户未说「允许修改」前，禁止改业务代码、git push、删文件
2. 每次只处理一个 ID（除非用户明确合并，如 ARCH-01/R-01/R-02/R-03 流式 4 件套）
3. 必须先读主报告 §3 对应条目的「证据」「问题代码」「建议修复」「验收」
4. 改动前必须 Read 目标文件确认行号仍对齐（代码可能已变化）
5. 改动后必须跑验收命令；失败则回滚或调整
6. 提交信息约定式：`fix(desktop): ARCH-01 流式 IPC payload 传递` / `feat(core): ...` / `docs: ...`
7. 高风险操作（push / 删 asar / 改发版配置 / 外发密钥）必须先确认
8. 不重开上游 PR；不引入商用代码签名；不扩大 Node engines

# 工作流（每个 ID）
1. 读主报告 §3 对应条目 + §10 证据索引
2. Read 证据文件确认行号与代码（若漂移，先在回复中说明差分）
3. 用 TodoWrite 列出该 ID 的子任务（Read → Edit → Test → Commit）
4. 执行最小改动（优先方案 A；避免过度工程）
5. 跑验收命令（主报告 §3 该条的「验收」字段）
6. 若验收通过 → 提示用户「可提交」；若失败 → 回滚 + 报告原因
7. 不主动 git commit / push（除非用户明确说「提交」或「允许修改并提交」）

# 优先级（按主报告 §6 迁移顺序）
P0 第一波（可并行）：
- 流式 4 件套：ARCH-01/R-01 + R-02 + R-03
- MarkdownRenderer XSS：S11
P0 第二波（可并行）：
- CI 门禁：SPEC-01 + SPEC-04
- Docker 安全：S22 + S18 + S13 + S20
- vite define：ARCH-08
P0 第三波（可并行）：
- IPC manifest：NEW-1 + NEW-2
- createDetailedErrorResponse：ARCH-07
- sandbox: true：SPEC-06

# 报告差分义务
- 若发现主报告标注的「仍开放」实际已修 → 在回复中说明「主报告 ID xxx 已修，证据：文件:行号」
- 若发现新问题 → 用主报告 §3 统一模板标注，标「新增」
- 若主报告的行号已漂移 → 重新定位并说明

# 输出格式
每个 ID 处理完后，回复：
- ID：xxx
- 状态：已修复 / 部分修复 / 失败 / 已修勿重复
- 改动文件：绝对路径列表
- 验收命令输出：关键片段
- 下一步建议：下一个 ID 或「等待用户确认提交」

开始：等待用户指定第一个要处理的 ID，或说「按优先级开始」从 ARCH-01 开始。
```

---

**报告结束。**

- 主报告路径：`D:\PromtOptimizer\docs\FULL-SCAN-PLAN-RECOMMENDATIONS-2026-07-21.md`
- 问题总数：32（P0=9, P1=17, P2=6）
- 高杠杆重构：3（流式契约 / Docker 安全 / CI 门禁）
- 不要碰：3（core LLMService 签名 / contextBridge 形状 / UI re-export 表）
- 给后续 AI 的提示词：§13
