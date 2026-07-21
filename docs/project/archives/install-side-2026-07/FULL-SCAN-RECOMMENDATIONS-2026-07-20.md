# PromptOptimizer 全面扫描建议报告（FULL-SCAN-RECOMMENDATIONS）

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-20 |
| 源码 | `D:\PromtOptimizer\src\prompt-optimizer` |
| 分支 / 版本 | `develop` @ v2.11.7（fork-only，`xvyimu/prompt-optimizer`） |
| 基线 | `D:\PromtOptimizer\docs\FULL-AUDIT-REPORT-2026-07-20.md`（已修 S1/S2/S6、A1–A5 仍开放） |
| SSOT | `src/prompt-optimizer/docs/project/CURRENT.md` |
| 模式 | **只读全面扫描**，未改代码、未 git push、未删除 |
| 子代理 | 架构 / 规范 / 代码 / 文档 / 安全（并行） |
| 总控合并规则 | 无路径不写 P0；与 FULL-AUDIT 做差分；大重构默认降级 |

> **方法论说明**：本报告由 5 个子代理并行扫描后由总控合并，证据门槛为「绝对路径 + 行号/文件锚点」。所有 P0 均附可直接验证的证据。子代理草稿在合并阶段已做证据回查：规范代理与文档代理曾因 LS 工具 40000 字符截断误判「`packages/web/` 缺失」，经 Glob 复核（`packages/web/package.json`、`vite.config.ts`、`src/App.vue`、`dist/index.html` 等均存在）已剔除相关误报，保留独立有效条目。

---

## 0. 执行摘要

PromptOptimizer 在 fork `develop` 分支上已达「可日常使用 + 可维护」基线。FULL-AUDIT-2026-07-20 已关闭的 P0 安全项（S1 Cookie 改 HMAC、S2 Docker public 过滤、S6 icons 打入 asar）在本轮确认仍在位；本轮扫描的增量价值集中在四个方向：

1. **Electron IPC 安全面仍未收口**：除 `llm-handlers` 外，data / image / model / context / favorite / update / system / remote-storage 共 8 类 handler 全部裸 `ipcMain.handle`，渲染端一旦被污染即可调用 `shell.openPath`、`data-importAllData` 覆盖本地数据、`model-addModel` 写入含 apiKey 配置（见 S10 / R-19）。这是当前最大的「单点失守 = 全盘失守」风险。
2. **MarkdownRenderer 错误分支 innerHTML 注入 + DOMPurify 默认配置**：LLM 返回内容触发渲染异常时，`error.message` 直接拼进 `innerHTML`，绕过 DOMPurify（见 S11）。这是 web/desktop/extension 三端共享组件的真实 XSS 路径。
3. **流式响应 IPC 契约被截断**：`ElectronLLMProxy` 的 `onFinish: () => callbacks.onComplete()` 不传 payload，导致桌面端 `PromptService.optimizePromptStream` 的 `onComplete: async (response) => { if (response) validate(response.content) }` 永远跳过响应校验；同时 `LLMService.sendMessageStream` catch 块既 `callbacks.onError(error)` 又 `throw error`，用户在桌面端会看到双 toast（见 R-01 / R-02 / R-03）。
4. **文档与脚本漂移集中且可机器化守住**：HANDOFF §6/§7 仍指向上游/废弃路径；`release-notes.md` 推荐的 `pnpm release:notes:*` 命令在 `package.json` 中不存在；`scripts/package-scripts.test.mjs` 的多条断言与实际 scripts 不对齐。`check:docs` 当前只守 1 个版本号 + 2 个冻结横幅，可低成本扩展到 9 条断言（见文档章节 §5）。

**结论**：项目可作为本机主力产品使用，但**不应在公网以默认配置部署 Docker**（S22 默认空 ACCESS_PASSWORD），**不应在公网 Docker 实例预置厂商 API Key**（仍开放的 S2 配套约束）。优先消化「IPC 全量 secure 化 + MarkdownRenderer XSS + 流式契约 + 文档漂移」四件套即可显著抬升健康度。

---

## 1. 架构

> 与 FULL-AUDIT §2.8 A1–A5 做增量，不重复。

### [P0] ARCH-01 Electron 流式 IPC 丢失结构化响应，桌面端响应校验失效

- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\electron-proxy.ts:49,72`（`onFinish: () => callbacks.onComplete()` 不传参数）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\prompt\service.ts` 的 `optimizePromptStream` 中 `onComplete: async (response) => { if (response) validate(response.content) }`
- **问题 / 影响**：Electron 环境下 `LLMResponse`（content/reasoning/toolCalls）在跨 IPC 时被丢弃；桌面端永远不会执行响应校验，工具调用结果对桌面用户不可见。
- **方案 A 最小改动**：preload 的 `stream-finish-${streamId}` 事件让主进程回传 `{ content, reasoning, toolCalls }` 序列化对象；`ElectronLLMProxy` 改为 `onFinish: (payload) => callbacks.onComplete(payload ?? { content: '' })`。
- **方案 B 中期**：定义 `StreamingFinishPayload` 类型，主进程 → preload → ElectronProxy 全链路类型化。
- **推荐 / 不做代价 / 验收**：方案 A；不做的代价是桌面端任何依赖 `onComplete(response)` 的逻辑（校验、工具调用展示、评估）永远不工作；验收：`packages/core/tests/unit/llm/electron-proxy.test.ts` 断言 `onComplete` 收到 `{ content: '...' }`。可独立 PR。

### [P0] ARCH-02 三套 Electron 装配策略并存，新增服务无统一约定

- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\service.ts:392-404`（`createLLMService` 内部 `if (isRunningInElectron()) return new ElectronLLMProxy()`）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:675-690`（main.js 自己 `createImageService`，不走 Proxy）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:885-892`（`image-understanding-understand` IPC handler 内联在 main.js，未走 `registerImageUnderstandingIpcHandlers` 模式）
- **问题 / 影响**：三种模式并存（工厂内部分支 / main 装真实 + renderer Proxy / main 装真实 + renderer 直 IPC）；`image-understanding-understand` 既未走 secure 注册也未登记到 `channel-manifest.js` 的 `IMAGE_CHANNELS`，是 S10 的子集。
- **方案 A 最小改动**：把 image-understanding handler 抽到 `config/ipc/image-understanding-handlers.js` + 登记到 channel-manifest；`createLLMService` 的 `isRunningInElectron` 分支移到调用方。
- **方案 B 中期**：core 引入 `ServiceHost` 抽象，每个服务显式声明 runtime（main/renderer/browser）下的实现。
- **推荐 / 不做代价 / 验收**：方案 A；不做的代价是每个新服务都会随机选一种模式，长期没有事实标准；验收：grep `isRunningInElectron` 在 `core/src/services` 下 ≤ 1 处。可独立 PR。

### [P1] ARCH-03 UI 包 re-export core 全部工厂与 Electron Proxy，包边界失效

- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\index.ts:168-211`（从 core re-export 14 个工厂 + 13 个 `Electron*Proxy`）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\web\package.json:16-19`、`packages\extension\package.json:14-17`（web/extension 仅声明依赖 UI，未声明 core）
- **问题 / 影响**：UI 实际承担「core 二次装配 + Electron Proxy 路由 + 组件库」三合一；core 破坏性改动会同时打穿 UI/web/extension 三层。
- **方案 A 最小改动**：UI 不再 re-export core 工厂；web/extension `dependencies` 直接声明 core；UI 仅保留 `export type`。
- **方案 B 中期**：把 `Electron*Proxy` 拆到独立 `@prompt-optimizer/electron-renderer` 子路径。
- **推荐 / 不做代价 / 验收**：方案 A；不做的代价是 core 任何内部改动都可能打破 web/extension，没有版本隔离；验收：`packages/ui/src/index.ts` 不再出现 `export { ... } from '@prompt-optimizer/core'`（仅 `export type`）。**高杠杆但跨包改动大，建议拆 3-5 个 PR**。

### [P1] ARCH-04 远程备份两套并行实现，UI bundle 被 `@aws-sdk/client-s3` 膨胀

- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\utils\remote-backup.ts:1-8, 1545-1716`（UI 内部直接 import `@aws-sdk/client-s3`，含 S3/R2/WebDAV/GoogleDrive 四种 store）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\remote-storage.js:1-9, 172-486`（desktop 再实现一遍 S3/WebDAV）
  - 行为差异：UI 侧 `normalizeObjectPath` 仅 `replace(/^\/+|\/+$/g, '')`；desktop 侧校验 `[\\\u0000-\u001f\u007f]` 并禁止 `.`/`..` 段（line 30-44）
- **问题 / 影响**：A4 的根因；同一份备份文件在 web/desktop 上传后路径可能不同；UI bundle 持续膨胀；新增 provider 要两处加。
- **方案 A 最小改动**：core 新增 `services/remote-storage/`，把 `normalizeObjectPath` / `joinRemotePath` / S3 / WebDAV 抽公共；GoogleDrive 保留在 UI。
- **方案 B 中期**：UI 移除 `@aws-sdk/client-s3`；web 模式只支持 GoogleDrive（浏览器 OAuth），S3/WebDAV 走 desktop IPC。
- **推荐 / 不做代价 / 验收**：方案 B（与 A4 一并解决）；不做的代价是每次修 WebDAV bug 要改两处；验收：`packages/ui/package.json` 不含 `@aws-sdk/client-s3`；UI bundle 体积下降 > 200KB。

### [P1] ARCH-05 main.js 用 13+ 模块级可变 let 装配，无 ServiceContainer

- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:179-182`（`let modelManager, templateManager, historyManager, llmService, promptService, ...`）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:572-709`（`initializeServices()` 顺序硬编码：storage → preference → model → templateLanguage → template → history → model.ensureInitialized → imageAdapter → imageModel → undici proxy → llm → imageUnderstanding → prompt → image → context → data → favorite）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:819-837`（`createUpdateHandlers` 通过 getter 注入可变状态，已意识到问题但未根治）
- **问题 / 影响**：任何「重启服务」需求（切换 userData / 账号 / 备份恢复）都要 reload 整个 Electron；IPC handler 测试无法独立装配；任一步失败整个 app 启动失败，无局部降级。
- **方案 A 最小改动**：抽 `desktop/service-container.js`，导出 `createServiceContainer({ storageProvider, app })`；main.js 仅调 `container = await createServiceContainer(...)` + `setupIPC(container)`。
- **方案 B 中期**：每个服务定义 `init(deps)` 接口，container 按拓扑排序装配；失败时返回部分容器。
- **推荐 / 不做代价 / 验收**：方案 A；不做的代价是 main.js 持续膨胀（已 1092 行）；验收：`main.js` < 300 行；`service-container.js` 可独立单测。**大重构，建议拆分多 PR**。

### [P1] ARCH-06 IPC channel-manifest / preload / handlers 三处手工同步，已发生漏登

- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\channel-manifest.js:25-247`（手工列举 100+ channel）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\preload.js:192-1685`（手工列举每个 channel 的 invoke wrapper）
  - 漏登证据：`packages\desktop\main.js:885` 注册 `image-understanding-understand`，但 `channel-manifest.js:41-64` 的 `IMAGE_CHANNELS` 没有该 channel；`channel-manifest.js:83` 列了 `template-getSupportedLanguages`，但 `preload.js` 无对应方法
- **问题 / 影响**：A5 的精确化定位；channel 拼写错误只在 runtime 暴露；contract test 只能断言已知集合，无法发现「preload 漏注册」或「handler 漏注册」。
- **方案 A 最小改动**：写 `scripts/gen-ipc-manifest.js` 从 `preload.js` 静态分析生成 channel-manifest；CI 比对一致性。
- **方案 B 中期**：schema-first 定义 `ipc.handler('llm-testConnection', { args: [string], returns: Promise<void> })`，自动生成 preload + manifest + handler 签名。
- **推荐 / 不做代价 / 验收**：方案 A；不做的代价是每次新增 channel 都可能漏登；验收：CI 中 `pnpm run check:ipc-manifest` 比对 preload 与 manifest，差异即失败。可独立 PR。

### [P1] ARCH-07 IPC 错误信封四种混用，错误 i18n 在字符串分支丢失

- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:711-815`（`createSuccessResponse` / `createErrorResponse` / `createStructuredErrorResponse` / `createDetailedErrorResponse` 四个 helper）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:752-815`（`createDetailedErrorResponse` 把 stack trace / additional properties / complete object dump 序列化进 IPC 响应）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\preload.js:48-83`（`createIpcError` 对 string payload 包装成 `Error`，对 object payload 直接 spread 抛 plain object，`instanceof Error` 失效）
- **问题 / 影响**：错误 i18n 仅在 `normalizeIpcError` 路径能拿到 `code + params`；`createDetailedErrorResponse` 路径丢失结构化 code 并向 renderer 泄露 stack trace。
- **方案 A 最小改动**：废弃 `createDetailedErrorResponse` / `createStructuredErrorResponse`；所有 handler 统一 `createErrorResponse`；stack trace 仅写主进程日志。
- **方案 B 中期**：core 定义 `IpcError` 类含 `code / params / message / cause`，所有 handler 抛 `IpcError`，preload 还原为 `IpcError` 实例。
- **推荐 / 不做代价 / 验收**：方案 A；不做的代价是错误处理长期黑盒，i18n 覆盖率无法提升；验收：grep `createDetailedErrorResponse` 在 main.js 与 `config/ipc` 下为 0；所有 IPC 错误响应 shape 统一为 `{ success: false, error: { message, code?, params? } }`。可独立 PR。

### [P1] ARCH-08 web 模式 vite define 把所有 VITE_* 注入 bundle（含 API 密钥）

- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\web\vite.config.ts:11-14, 65-73`（`processEnv = { ...DEFAULT_VITE_ENV, ...env }`，`define: { 'process.env': { ...all VITE_* } }`）
  - 对照：`D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\runtime-security.js:1-29`（desktop 仅暴露 `^VITE_(?:APP|PUBLIC)_[A-Z0-9_]+$`）
- **问题 / 影响**：desktop 模式有 runtime-security 过滤，web 模式没有；`VITE_OPENAI_API_KEY` 等密钥会作为字符串字面量内联进 web bundle，浏览器 DevTools 可见。这是 S5 的根因证据。
- **方案 A 最小改动**：web 的 `vite.config.ts` 仅 define `VITE_APP_*` / `VITE_PUBLIC_*`（与 desktop runtime-security 同 allowlist）。
- **方案 B 中期**：废弃 `process.env.VITE_*` 注入；web 改为运行时 fetch `/config.js`（desktop 已有此机制）。
- **推荐 / 不做代价 / 验收**：方案 A 立即修；不做的代价是任何用户用 web 部署 + `.env.local` 配密钥就等于公开密钥；验收：`vite build` 后 grep bundle 中 `VITE_OPENAI_API_KEY` 字面量值为空或占位符。**P0 级安全影响，建议立即修**。可独立 PR。

### [P1] ARCH-09 MCP 与 Desktop 的 PromptService 调用语义不一致，且无历史链

- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\mcp-server\src\index.ts:234-246`（`optimizePrompt({ targetPrompt, modelKey: 'mcp-default', ... })` 不传 contextData）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\mcp-server\src\index.ts:353-359`（`iteratePrompt(prompt, prompt, requirements, 'mcp-default', templateId)` —— originalPrompt 与 lastOptimizedPrompt 相同）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:679-686`（desktop 的 promptService 装配含 historyManager；MCP 的 CoreServicesManager 不持有）
- **问题 / 影响**：A5 的精确化；`iteratePrompt(prompt, prompt, ...)` 语义可疑：lastOptimizedPrompt 应是上次优化结果，传原始 prompt 会让 LLM 误以为「上次优化没改变任何东西」，迭代方向错乱。
- **方案 A 最小改动**：MCP 的 `CoreServicesManager` 加 `historyManager`，每次 optimize/iterate 后调 `historyManager.addRecord`；修正 `iteratePrompt` 的 lastOptimizedPrompt 参数语义。
- **方案 B 中期**：MCP 支持「连到正在运行的 desktop main」模式，共享服务实例。
- **推荐 / 不做代价 / 验收**：方案 A；不做的代价是 MCP 用户拿不到历史链，迭代语义错误；验收：MCP 优化结果能在 desktop history 中看到。可独立 PR。

### [P1] ARCH-10 web/extension 通过 vite alias 直指 core/ui 源码，包发布形态失效

- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\web\vite.config.ts:51-63`（`'@prompt-optimizer/core': path.resolve(__dirname, '../core/src/index.ts')`，注释明言「Prefer source for monorepo」）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\package.json:9-19`（`exports` 声明 `./dist/index.js`）
- **问题 / 影响**：core/package.json 声明 dist 为入口，但 web 构建绕过 dist 走源码；core tree-shaking 失效；没有「core 发版 → UI 升级 → web 升级」的版本闸门。
- **方案 A 最小改动**：保留 dev 模式 alias，生产 `vite build` 强制走 dist（条件化 alias：`mode === 'development' ? src : dist`）。
- **方案 B 中期**：移除 alias，dev 也走 dist + watch。
- **推荐 / 不做代价 / 验收**：方案 A；不做的代价是 core 任何内部源码改动都可能打破 web/extension；验收：`vite build` 产物中 core 相关代码来自 `packages/core/dist/index.js`。

### [P1] ARCH-11 StorageFactory 进程级单例缓存，限制多实例与测试隔离

- **证据**：`D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\storage\factory.ts:13-14, 22-53`（`private static instances: Map<StorageType, IStorageProvider>`；`create('file')` 直接抛错但 `getSupportedTypes()` 把 `file` 列出）
- **问题 / 影响**：同 type 实例全局共享，无法支持「同 type 多路径」（多账号 profile、测试隔离）；测试套件若忘 `StorageFactory.reset()` 会泄漏状态。
- **方案 A 最小改动**：`instances` 改为 `Map<string, IStorageProvider>`，key = `${type}:${scopeId}`；`create(type, scopeId = 'default')`。
- **方案 B 中期**：废弃单例，改 `createStorageProvider({ type, scopeId })` 工厂函数。
- **推荐 / 不做代价 / 验收**：方案 A；不做的代价是未来支持多账号要重构；验收：同进程 `create('file', 'user-a')` 与 `create('file', 'user-b')` 返回独立实例。可独立 PR。

### [P1] ARCH-12 Desktop 退出流程双写：window close 与 before-quit 重复保存

- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:516-563`（`mainWindow.on('close')` 做 `event.preventDefault()` + `storageProvider.flush()` + `forceQuitTimer` 5s + `setupEmergencyExit` 10s）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:1041-1085`（`app.on('before-quit')` 同样 `event.preventDefault()` + `flush()` + `forceAppQuitTimer` 5s + `setupEmergencyExit` 10s）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:1080`（`isQuitting = false` 在 finally 重置）
- **问题 / 影响**：close handler finally 重置 `isQuitting`，导致 before-quit 再次进入保存路径；两次 `flush()` 间数据变化可能写冲突；exit code 不稳定（0 vs 1）影响 electron-updater 安装退出。
- **方案 A 最小改动**：抽 `desktop/quit-flow.js` 统一 `performGracefulQuit(reason)`；`close` 与 `before-quit` 都调它；单一 `isQuitting` 标志 + 单一计时器；`isQuitting` 不在 finally 重置。
- **方案 B 中期**：FileStorageProvider 改异步写 + WAL，flush 近乎即时。
- **推荐 / 不做代价 / 验收**：方案 A；不做的代价是退出慢（最坏 10s）、exit code 不稳定；验收：手动关窗 → 退出 < 2s；exit code 恒为 0（除 updater 安装）；日志中只出现一次 `[DESKTOP] Saving data before quit`。可独立 PR。

### [P2] ARCH-13 Adapter Registry 硬编码 16 个适配器实例化，新增供应商必须改 core 源码

- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\adapters\registry.ts:55-93`（`TextAdapterRegistry.initializeAdapters()` 把 16 个具体适配器 `new` 硬塞进 `this.adapters.set(...)`）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\adapters\abstract-registry.ts:10-77`（提供抽象但未暴露 `registerAdapter` 公开 API）
- **问题 / 影响**：fork 用户想新增供应商必须改 core 源码并重新发版；违反开闭原则。
- **方案 A 最小改动**：`AbstractAdapterRegistry` 暴露 `registerAdapter(id, adapter | factory)`；`initializeAdapters` 改名 `registerBuiltInAdapters` 由构造函数调用但仍允许外部后注册。
- **方案 B 中期**：内置适配器列表抽到 `defaultTextAdapterFactories.ts`，`createTextAdapterRegistry({ extraAdapters })` 支持注入。
- **推荐 / 不做代价 / 验收**：方案 A；不做的代价是每次新增供应商都要碰 core；验收：新建 `examples/custom-adapter.ts` 在不修改 core 任何文件的前提下能注册并使用自定义适配器。

### [P2] ARCH-14 chrome-built-in 模型在 core 顶层导出 7 个特殊函数

- **证据**：`D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\index.ts:51-66`（导出 `CHROME_BUILT_IN_MODEL_ID` / `canAutoEnableChromeBuiltInConfig` / `checkChromeBuiltInAvailability` / `markChromeBuiltInAutoEnabled` / `markChromeBuiltInUserConfigured` / `prepareChromeBuiltInModel`）
- **问题 / 影响**：core 知道「Chrome 浏览器内置模型」具体业务概念并在顶层导出 7 个函数；UI 直接调用绕过 model manager；其他供应商无此待遇，长期 core 顶层会持续膨胀。
- **方案 A 最小改动**：把 chrome-built-in 状态机移到 `ChromeBuiltInAdapter` 内部，提供 `adapter.canAutoEnable()` / `adapter.checkAvailability()` / `adapter.markUserConfigured()` 接口。
- **方案 B 中期**：扩展 `ITextProviderAdapter` 接口，所有 adapter 可选实现 `canAutoEnable` / `checkAvailability`。
- **推荐 / 不做代价 / 验收**：方案 A；不做的代价是 core 顶层持续膨胀；验收：`packages/core/src/index.ts` 不再导出 `CHROME_BUILT_IN_*` 函数。

### 目标架构草图

```
web (browser)  │  extension (Chrome)  │  desktop (Electron renderer)
   直接 deps core + ui                │   deps core + ui + electron-renderer
                                      │   通过 electron-renderer 拿 Proxy
                       │
                @prompt-optimizer/ui
                - 仅组件 / router / i18n / themes
                - 不再 re-export core 工厂或 Electron Proxy
                       │
                @prompt-optimizer/core
                - 领域服务（llm / prompt / template / history / favorite / ...）
                - AdapterRegistry.registerAdapter() 公开 API
                - createLLMService(modelManager, { registry? }) 不再分支 isElectron
                - services/remote-storage/（共享 S3 / WebDAV / Google Drive）
                       │
        ┌──────────────┼──────────────────┐
   desktop main   mcp-server     electron-renderer
   - ServiceContainer（DI）   - 独立进程    - 所有 Electron*Proxy 集中
   - IPC handlers（schema）                  - 供 renderer 使用
   - 单一 RemoteStorageAdapter
   - 单一 quit-flow
   - runtime-security 强制 allowlist
```

关键边界规则：(1) UI 不 re-export core；(2) core 不含 `isRunningInElectron` 分支；(3) AdapterRegistry 公开 `registerAdapter`；(4) Remote-storage 抽象在 core；(5) IPC channel 单源 schema → codegen；(6) 错误信封统一；(7) 配置注入统一走 allowlist。

### 迁移顺序（最多 5 步）

1. **解耦 UI 与 core**（ARCH-03）：UI 不再 re-export core 工厂；web/extension/desktop-renderer 直接 deps core；`Electron*Proxy` 拆到独立子路径。
2. **AdapterRegistry 公开注册 + Electron 分支移出 core**（ARCH-02 / ARCH-13）：`createLLMService` 不再内部 `if (isRunningInElectron)`；image-understanding handler 收口到 `config/ipc/`。
3. **抽 ServiceContainer + quit-flow**（ARCH-05 / ARCH-07 / ARCH-12）：main.js 拆 `service-container.js` + `quit-flow.js`；废弃 `createDetailedErrorResponse`；`safeSerialize` 改用 core 版本。
4. **抽 core/services/remote-storage**（ARCH-04）：UI 与 desktop 共享 S3/WebDAV；UI 移除 `@aws-sdk/client-s3`。
5. **配置与密钥注入收口**（ARCH-08）：web `vite.config.ts` 仅 define `VITE_APP_*` / `VITE_PUBLIC_*`；其他 `VITE_*` 改运行时 fetch `/config.js`；MCP `iteratePrompt` 语义修正 + 加 historyManager（ARCH-09）。

---

## 2. 框架规范

> 与 FULL-AUDIT §6 做增量；技术栈事实表见附录 A。

### [P0] SPEC-01 `scripts/package-scripts.test.mjs` 多条断言与实际 scripts 不对齐

- **证据**：`D:\PromtOptimizer\src\prompt-optimizer\scripts\package-scripts.test.mjs:38-46`
  - line 42: `assert.match(rootPackage.scripts['build:web'], /\bbuild:web:bundle\b/)` —— 实际 `build:web` = `pnpm -F @prompt-optimizer/web build`，不含 `build:web:bundle`
  - line 44: `assert.equal(typeof rootPackage.scripts?.['check:bundle-budget'], 'string')` —— 根 package.json 无此 script
  - line 45: `assert.match(rootPackage.scripts['test:repo'], /scripts\/check-bundle-budget\.test\.mjs/)` —— `test:repo` 不含此文件
- **影响**：`pnpm test:repo` 100% 失败；CI 红灯或被绕过。
- **动作**：(a) 删除 line 42/44/45 的过期断言；(b) 若 `check-bundle-budget` 是规划中能力，移到 `todo.mjs` 而非 `package-scripts.test.mjs`。
- **工作量**：≤ 30 分钟。
- **可独立 PR**：是。

### [P0] SPEC-02 `packages/desktop/build-desktop.bat` 引用不存在的 `desktop-standalone` 与过时工具链

- **证据**：`D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\build-desktop.bat:10,19,23`
  - `cd ../desktop-standalone`（目录不存在）
  - `npm install @electron/packager@latest`（与 monorepo 的 pnpm + electron-builder 路线冲突）
  - `--electron-version=33.0.0`（实际 `electron@^41.1.0`）
- **影响**：脚本一旦运行必失败；留作「考古脚本」误导新人。
- **动作**：删除该文件，或重写为 `pnpm -F @prompt-optimizer/desktop build:ci` 的薄包装。
- **工作量**：≤ 15 分钟（删除）或 1 小时（重写）。
- **可独立 PR**：是。

### [P1] SPEC-03 `image-understanding-understand` 与 `remote-storage:invoke` 两个 channel 绕过 manifest

- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:885`（`ipcMain.handle('image-understanding-understand', ...)`）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\remote-storage.js:525`（`ipcMain.handle(REMOTE_STORAGE_CHANNEL, ...)`）
  - `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\channel-manifest.js:41-64`（`IMAGE_CHANNELS` 不含 `image-understanding-understand`）
- **影响**：契约测试只断言「manifest ⊆ handlers」，未断言「handlers ⊆ manifest」；这两个 channel 长期漏登；与 ARCH-02 / S10 关联。
- **动作**：(a) 在 `channel-manifest.js` 补登两个 channel；(b) 在 `scripts/desktop-ipc-handlers.test.mjs:140-209` 增加反向断言：扫描所有 `ipcMain.handle(...)` 和 `registerSensitiveIpc(...)` 字符串字面量，断言每个都在 `ALL_DOMAIN_CHANNELS` 中。
- **工作量**：1-2 小时。
- **可独立 PR**：是。

### [P1] SPEC-04 CI 未跑 `pnpm lint` / `pnpm mcp:test` / `pnpm check:extension-release-secrets`

- **证据**：`D:\PromtOptimizer\src\prompt-optimizer\.github\workflows\test.yml`（只跑 `pnpm test:gate` + `pnpm test:gate:e2e`）；`test:gate` 链路不含 `lint` / `mcp:test` / `check:extension-release-secrets`
- **影响**：lint 配置漂移、MCP 测试失败、扩展发布带密钥等问题无法在 PR 阶段拦截。
- **动作**：CI workflow 依次跑 `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm test:repo` → `pnpm test:gate:core` → `pnpm test:gate:ui` → `pnpm -F @prompt-optimizer/mcp-server test` → `pnpm test:gate:e2e`。
- **工作量**：1 小时（改 workflow）+ 前置修 SPEC-01。
- **可独立 PR**：是（与 SPEC-01 一起）。

### [P1] SPEC-05 `docker.yml` 触发分支 `main|master`，fork 主分支 `develop` 永远不构建 Docker

- **证据**：`D:\PromtOptimizer\src\prompt-optimizer\.github\workflows\docker.yml:20`（`head_branch == 'main' || head_branch == 'master'`）
- **影响**：Docker 镜像永远不会为 develop 构建；fork 用户只能本地构建。
- **动作**：触发分支加 `develop`，或改为 `workflow_dispatch` + tag 触发。
- **工作量**：≤ 30 分钟。
- **可独立 PR**：是。

### [P1] SPEC-06 Electron BrowserWindow 未开 `sandbox: true`

- **证据**：`D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:405-409`（`webPreferences: { preload: ..., nodeIntegration: false, contextIsolation: true }` 缺 `sandbox: true`）
- **影响**：一旦 preload 出现原型污染或 IPC 渗漏，renderer 仍可触及 Node 世界更多面；与 FULL-AUDIT S6 同源。
- **动作**：所有 BrowserWindow 配置 `sandbox: true`；评估 preload 是否需要 `require`（sandbox 模式下受限）。
- **工作量**：1 小时（含 preload 适配验证）。
- **可独立 PR**：是。

### [P1] SPEC-07 `dev-app-update.yml` 与 fork-only 策略冲突

- **证据**：`D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\dev-app-update.yml:2-3`（`owner: linshenkx` `repo: prompt-optimizer-dev`）；`CURRENT.md:14` fork-only = `xvyimu/prompt-optimizer`
- **影响**：本地 dev 测试自动更新会查询上游 linshenkx 的 release，可能拉到不兼容版本。
- **动作**：改为 `owner: xvyimu` `repo: prompt-optimizer-dev`（或 fork 仓库的 dev 通道）；或用环境变量覆盖。
- **工作量**：≤ 15 分钟。
- **可独立 PR**：是。

### [P1] SPEC-08 Docker 镜像名与 fork 渠道分裂

- **证据**：
  - `D:\PromtOptimizer\src\prompt-optimizer\docker\docker-compose.yml:3`（`image: linshen/prompt-optimizer:latest`）
  - `D:\PromtOptimizer\src\prompt-optimizer\.github\workflows\docker.yml:12-16`（推到 `docker.io/linshen/prompt-optimizer` 与阿里云 `prompt-optimizer/prompt-optimizer`）
  - `D:\PromtOptimizer\src\prompt-optimizer\.github\workflows\release.yml`（推到 `${{ github.repository }}` = `xvyimu/prompt-optimizer`）
- **影响**：Docker 用户拉上游镜像，Desktop 用户拉 fork release，版本/能力不一致。
- **动作**：fork 决定是「Docker 跟 fork」还是「Docker 仍用上游」；若跟 fork，compose 改 `image: xvyimu/prompt-optimizer:latest` 并新建 fork 的 DockerHub 仓库。
- **工作量**：2 小时（含 DockerHub 配置）。
- **可独立 PR**：是。

### [P2] SPEC-09 `scripts/sync-versions.js` 仅同步 2 个文件，4 个子包永久版本漂移

- **证据**：`D:\PromtOptimizer\src\prompt-optimizer\scripts\sync-versions.js:10-22`（`versionFiles` 仅含 `packages/extension/public/manifest.json` 与 `packages/desktop/package.json`）；`packages/extension/package.json` = `0.0.0`、`packages/core/package.json` = `0.0.0`、`packages/ui/package.json` = `0.0.1`、`packages/mcp-server/package.json` = `0.1.0`
- **影响**：extension package.json 与 manifest 永久漂移；若未来 npm publish 子包，版本会错乱。
- **动作**：在 `sync-versions.js` 扩展 `versionFiles` 覆盖所有包；或在 CURRENT.md 明确「子包 version 不参与 SSOT」并加 lint 断言。
- **工作量**：1 小时。
- **可独立 PR**：是。

### [P2] SPEC-10 `core/tsconfig.json` 配置矛盾（`noEmit: true` + `declaration: true` + `outDir: "dist"`）

- **证据**：`D:\PromtOptimizer\src\prompt-optimizer\packages\core\tsconfig.json:13,17,19`
- **影响**：误导新人以为 tsc 会产出；typecheck 速度受 declaration 类型拉取影响。
- **动作**：移除 `declaration` 与 `outDir`（既然 `noEmit`）；build 交给 `tsup`。
- **工作量**：≤ 15 分钟。
- **可独立 PR**：是。

### [P2] SPEC-11 extension `vite.config.ts` 强制 HTTPS dev server

- **证据**：`D:\PromtOptimizer\src\prompt-optimizer\packages\extension\vite.config.ts:4,8,37`（`import basicSsl from '@vitejs/plugin-basic-ssl'`，`plugins: [vue(), basicSsl()]`，`server.https: {}`）
- **影响**：Chrome MV3 扩展 popup 走 HTTPS dev server 触发证书警告；与 web/desktop（无 basicSsl）不一致。
- **动作**：仅在 `mode === 'production'` 时启用 basicSsl，dev 默认 HTTP；或加环境变量 `EXT_HTTPS=1` 控制。
- **工作量**：≤ 30 分钟。
- **可独立 PR**：是。

### [P2] SPEC-12 `packages/desktop/preload.js` 生产残留 console 调试日志

- **证据**：`D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\preload.js:1579,1584,399`（`console.error('[DEBUG] Preload ...')`、`console.warn('getModels is deprecated...')`）
- **影响**：renderer 控制台噪音；deprecated 警告应在主进程日志而非 renderer console。
- **动作**：移除 `[DEBUG]` 日志；deprecated 警告改走 `console-logger.js`。
- **工作量**：≤ 30 分钟。
- **可独立 PR**：是。

### [P2] SPEC-13 `main.js` 大量 `console.log/error/warn`，未走 `console-logger.js`

- **证据**：`D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:140,262,280,286,302,318-331,338,347,349,370,372,396,398,441,500,506,510-511,519,532,539,546,548,574,578,615,630-632`（30+ 处 console 调用）
- **影响**：日志无统一格式、无级别、无落盘；`console-logger.js` 已存在但未强制使用。
- **动作**：替换为 `console-logger.js` 的 `log.info/warn/error`；保留 `console.error` 兜底。
- **工作量**：2 小时。
- **可独立 PR**：是。

### [P2] SPEC-14 `core/src/types/global.d.ts` 的 `electronAPI` type stub 几乎全 `any`

- **证据**：`D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\types\global.d.ts:16-120`（`sendMessage: (messages: any[], provider: string) => Promise<string>` 等）
- **影响**：renderer 调用 electronAPI 时类型门禁失效；与 FULL-AUDIT §3.4 UI build:types 同源。
- **动作**：从 `preload.js` 的 `contextBridge.exposeInMainWorld` 实际签名生成精确 type stub；或用 `export interface ElectronApi` 替代 `declare global`。
- **工作量**：4 小时。
- **可独立 PR**：是。

### 违规热点 Top15（文件级）

详见 SPEC-01 ~ SPEC-14；补充 4 条：

| # | 级别 | 路径 | 问题 |
|---|------|------|------|
| 15a | P2 | `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\utils\remote-backup.ts:242` | `getEnvVar('VITE_GOOGLE_DRIVE_CLIENT_ID')` 命名不符合 `VITE_APP_*` / `VITE_PUBLIC_*` 规范 |
| 15b | P2 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js:582-595` | env 检查列表用 `VITE_OPENAI_API_KEY` 等敏感名，虽仅做布尔判断但与 runtime-security.js 白名单规则视觉冲突 |
| 15c | P2 | `D:\PromtOptimizer\src\prompt-optimizer\findings.md` / `progress.md` | 根目录散落过程文档，应归档到 `.pipeline/` 或删除 |
| 15d | P2 | `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\components\ImageModelEditModal.vue:155` | `(selectedModel.capabilities as any)?.highResolution` 运行时类型断言绕过 |

### 最小可进 CI 的规范集

新增/修订根 `package.json` scripts：
- `lint:core` / `lint:extension` 新增（当前缺失）
- `lint` 改为 `node scripts/run-many.js lint:core lint:ui lint:mcp-server lint:extension typecheck:core typecheck:ui typecheck:mcp-server typecheck:extension`（移除 `typecheck:web`、`build:ui-types`，后者单独任务）
- `test:gate:mcp` 新增（当前无）
- `test:gate` 改为 `node scripts/run-many.js -s test:repo lint test:gate:core test:gate:ui test:gate:mcp`

CI workflow 最小集见 SPEC-04。

---

## 3. 代码优化

> 与 FULL-AUDIT §2.8 A1-A5、§3.4 已知项做增量。

### 代码问题清单（共 24 条）

| ID | 级别 | 位置 | 问题 | 补丁思路 | 预估 diff | 风险 |
|----|------|------|------|----------|-----------|------|
| R-01 | P0 | `packages\core\src\services\llm\electron-proxy.ts:49,72` | `onFinish: () => callbacks.onComplete()` 不传参，桌面端响应校验失效 | preload `stream-finish-${streamId}` 事件回传 `{ content, reasoning, toolCalls }`；ElectronLLMProxy 改为 `onFinish: (payload) => callbacks.onComplete(payload ?? { content: '' })` | 30-50 | 中（同步改 preload + main 的 finish 事件 payload） |
| R-02 | P0 | `packages\core\src\services\llm\service.ts:152-157,189-194` | `sendMessageStream` catch 中既 `callbacks.onError(error)` 又 `throw error`，用户看双 toast | 保留 throw、移除 `callbacks.onError` 调用，由 PromptService 统一转回调 | 6 | 低 |
| R-03 | P0 | `packages\core\src\services\prompt\service.ts:1196-1216` | `testCustomConversationStream` catch 不再 throw 时 Promise 仍 resolve，调用方无法感知失败 | 统一为始终 `callbacks.onError(...)` 后不再 throw（与 R-02 收敛） | 10 | 低 |
| R-04 | P1 | `packages\core\src\services\data\manager.ts:67-94,130-137` | `exportAllData` 与 `serviceMap` 未包含 favorites（A1 精确化） | `FavoriteManager` 增 `exportData(): Promise<FavoriteExportShape>` + `importData(arr): Promise<void>` 与 `IImportExportable` 对齐；DataManager 构造函数注入 `favoriteManager?` 并加入 `serviceMap` | 80-120 | 中（导出格式迁移，需测试） |
| R-05 | P1 | `packages\core\src\services\model\manager.ts:1235,1316,1334,1357` | `importData(data: any)` / `validateData(data: any)` / `validateSingleTextModel(item: any)` / `validateSingleModel(item: any)` 全 `any` | 定义 `ModelImportPayload` 联合类型；私有 `validate*` 用 `unknown` + 类型守卫 | 30 | 低 |
| R-06 | P1 | `packages\core\src\services\model\manager.ts:38-42` | `initPromise = this.init().catch(err => { ...; throw err; })` 永久 rejected 无法重试 | `ensureInitialized()` 检测 rejected 时重新 `this.initPromise = this.init()`；或 catch 中降级到默认配置 | 15 | 中 |
| R-07 | P1 | `packages\core\src\services\model\manager.ts:809-820` | `getModel(key)` 每次加载全部模型再 `models[key]`，O(N) + JSON.parse；LLMService 每次请求都走 | `ModelManager` 内部维护 `Map<key, TextModelConfig>` 缓存，写操作失效 | 40 | 中（缓存一致性需测试） |
| R-08 | P1 | `packages\core\src\services\storage\fileStorageProvider.ts:455-469` | 错误分类用 `error.message.includes('not found')` 字符串匹配，脆弱 | 业务错误实现标记接口（`BusinessError`）或用 `instanceof`；StorageError 保留 `cause` | 20 | 低 |
| R-09 | P1 | `packages\core\src\services\storage\fileStorageProvider.ts:128,302` 与 `packages\core\src\services\image-model\manager.ts:128` | `} catch {}` 静默吞错 + `validateJSON` 用 JSON.parse 失败即返回 false 无区分 | image-model init 双层 catch 至少 `console.error` + `this.initializationFailed = true` 暴露给 UI；FileStorageProvider 增 `diagnose()` 方法 | 15 | 低 |
| R-10 | P1 | `packages\core\src\services\prompt\service.ts:178-269 vs 610-720` | `optimizeMessage` 与 `optimizeMessageStream` 消息元数据准备逐行重复 | 抽 `buildMessageOptimizationContext(request)` 私有方法共用 | 60 | 低 |
| R-11 | P1 | `packages\core\src\services\prompt\service.ts:274-378 vs 725-846` | `iteratePrompt` 与 `iteratePromptStream` 模板获取 + 校验 + context 构造完全重复 | 抽 `buildIterationContext(...)` 私有方法 | 50 | 低 |
| R-12 | P1 | `packages\ui\src\composables\prompt\usePromptOptimizer.ts:110-215 vs 218-354` | `handleOptimizePrompt` 与 `handleOptimizePromptWithContext` 共享 90% 逻辑 | 抽 `runOptimization(request, advancedContext?)` 内部方法 | 80 | 低 |
| R-13 | P1 | `packages\core\src\services\llm\service.ts:392-404` | `createLLMService` 检测 Electron 时直接返回 `new ElectronLLMProxy()` 忽略 `modelManager`（A3 精确化） | 显式注入：`createLLMService(modelManager, { registry, forceBackend?: 'electron' \| 'in-process' })`；核心是修 R-01 | 20 | 中 |
| R-14 | P1 | `packages\core\src\services\evaluation\service.ts:549,2917-2931,2958,3108,3121` | 评估服务大量 `(x as any).score` / `(current as any).key`，类型系统未约束评估响应 | 定义 `EvaluationPayload` 判别联合，用 `type` 字段做 narrow；移除 `as any` | 100+ | 高（评估格式涉及模板与前端，改动面大） |
| R-15 | P1 | `packages\ui\src\config\naive-theme.ts:156-176` | `dark` 主题只覆盖 `common`，无组件级覆盖；深色下 Button/Input/Card/Tabs 回退到 Naive 默认 | 补齐 dark 主题组件级 overrides（参考 green/purple dark 模板） | 100 | 低 |
| R-16 | P1 | `packages\ui\src\config\naive-theme.ts:1101,1117` | `__themeWatchInitialized` 在第 1101 行使用、第 1117 行才用 `let` 声明，靠 JS hoisting | 把 `let __themeWatchInitialized = false` 上移到 `currentThemeId` 附近 | 2 | 极低 |
| R-17 | P1 | `packages\core\src\services\storage\adapter.ts:38,68,87` | `StorageAdapter` 用 `'updateData' in this.baseProvider && typeof ... === 'function'` 鸭子类型 + `(this.baseProvider as any).updateData(...)` | `IStorageProvider` 接口把 `updateData` / `batchUpdate` / `getCapabilities` 改为必填，删除鸭子类型 | 40 | 中（同步改所有 provider 实现） |
| R-18 | P2 | `packages\desktop\config\ipc\data-handlers.js:37-67` | `data-getStorageInfo` 在 `app.getPath('userData')` 异常时 `fs.promises.stat` 失败被 `statSafe` 静默吞掉返回 0 | `statSafe` 失败时 `console.warn` 并在响应中加 `mainFileError: string` 字段 | 10 | 低 |
| R-19 | P2 | `packages\desktop\config\ipc\channel-manifest.js:9,294-302` | `assertKnownInvokeChannel` 默认不调用（A5 精确化） | `registerSensitiveIpc` 内部默认调用 `assertKnownInvokeChannel`（dev 抛错、prod `console.warn`） | 15 | 低 |
| R-20 | P2 | `packages\core\src\services\prompt\service.ts:1015-1018,1064` | `getDefaultTemplateId` 内 `listTemplatesByType(templateType as any)` 双重 `as any` | 把 `TemplateType` 与 `getDefaultTemplateId` 联合类型对齐 | 20 | 低 |
| R-21 | P2 | `packages\core\src\services\llm\service.ts:105,229,278` | 多处 `catch (error: any)` 后 `error.message`，TS 5.x 推荐 `catch (error: unknown)` | 统一改 `unknown` + 类型守卫，或抽 `toErrorMessage(e: unknown): string` | 20 | 极低 |
| R-22 | P2 | `packages\core\src\services\storage\fileStorageProvider.ts:527-549` | `batchUpdate` catch `throw new StorageError('Batch update failed', 'write')` 完全丢弃原始 error | `throw new StorageError('Batch update failed: ' + msg, 'write', { cause: error })` | 5 | 极低 |
| R-23 | P2 | `packages\core\src\services\prompt\service.ts:1153,1160-1163,1186-1188,1199-1202` | `testCustomConversationStream` 多处 `console.log/error` 直接打在核心服务 | 移除 console，必要时通过 `callbacks.onDebug` 或注入 logger 接口 | 15 | 低 |
| R-24 | P2 | `packages\core\src\services\model\manager.ts:1016,1064,1075` | 多处 `as any` / `as Record<string, any>`，类型边界未收敛 | `IModelManager` 与 `ITemplateManager` 接口层补精确类型；私有方法用 `unknown` + 守卫 | 40 | 中 |

### 3 个高杠杆重构（各 < 2 天）

#### 重构 A：流式响应 IPC 契约修复（R-01 / R-02 / R-03）

**范围**：`packages/core/src/services/llm/electron-proxy.ts`、`packages/core/src/services/prompt/electron-proxy.ts`、`packages/desktop/preload.js`（stream-* 事件）、`packages/desktop/main.js`（finish 事件 payload）、`packages/core/src/services/llm/service.ts`（catch 双触发）、`packages/core/src/services/prompt/service.ts#1196-1216`。

**做法**：
1. 主进程在 `stream-finish-${streamId}` 事件带上 `{ content, reasoning, toolCalls }` 序列化对象。
2. preload 的 `finishListener` 接收 payload 并 `callbacks.onFinish(payload)` / `callbacks.onComplete(payload)`。
3. `ElectronLLMProxy` / `ElectronPromptServiceProxy` 把 `onFinish: (payload) => callbacks.onComplete(payload ?? { content: '' })`。
4. 统一 `LLMService.sendMessageStream` 的 catch：只回调不 throw。
5. `testCustomConversationStream` 的 catch 改为只回调。

**收益**：恢复桌面端响应校验、修复双 toast、解锁未来需要结构化响应的功能。

#### 重构 B：DataManager 收编 Favorites（R-04 / A1）

**范围**：`packages/core/src/services/favorite/manager.ts`、`packages/core/src/services/data/manager.ts`、`packages/desktop/main.js#696`、`packages/ui/src/components/DataManager.vue`。

**做法**：
1. `FavoriteManager` 增 `exportData(): Promise<{ favorites, categories, tags }>` 与 `importData(payload): Promise<void>`，与 `IImportExportable` 对齐。
2. 保留旧 `exportFavorites()` / `importFavorites()` 作薄包装（兼容）。
3. `DataManager` 构造函数增 `favoriteManager?` 可选参数，加入 `serviceMap`，导出键 `favorites`。
4. `main.js#696` 调 `createDataManager(..., favoriteManager)`。
5. 单测：`packages/core/tests/unit/data/import-export-integration.test.ts` 覆盖 favorites 往返。

**收益**：消除已知 A1 债务，导出包真正 "All Data"。

#### 重构 C：PromptService 流式方法去重（R-10 / R-11 / R-12）

**范围**：`packages/core/src/services/prompt/service.ts`、`packages/ui/src/composables/prompt/usePromptOptimizer.ts`。

**做法**：
1. 抽 `PromptService.buildMessageOptimizationContext(request): { messages, selectedMessage }`，被 `optimizeMessage` 与 `optimizeMessageStream` 共用。
2. 抽 `PromptService.buildIterationContext(...): { messages, template }`，被 `iteratePrompt` 与 `iteratePromptStream` 共用。
3. UI 侧 `usePromptOptimizer` 抽 `runOptimization(request, advancedContext?)`，`handleOptimizePrompt` / `handleOptimizePromptWithContext` 只负责 request 构造。
4. 回归测试确保流式与非流式行为一致。

**收益**：PromptService 减重 ~200 行，未来改消息元数据格式只改一处。

### 3 个不要碰区域

#### 不要碰 1：`packages/core/src/services/evaluation/service.ts`

3000+ 行，承载评估模板渲染、判别联合类型、patchPlan 生成、JSON 注入防护（已有大量 `*-json-injection.test.ts` 守护）。R-14 的 `as any` 是真问题，但任何 narrow 改动都会牵动评估模板、前端展示、evidence JSON 格式与 30+ 个测试。需要专门的评估域设计文档，不在「最小变更」范围内。除非有明确需求驱动，否则只做表面清理（移除 console.log）。

#### 不要碰 2：`packages/core/src/services/model/converter.ts` + `metadata-resolver.ts` + `manager.ts` 的迁移/兜底链路

`ModelManager.init` 里的「旧格式 → 新格式 → DeepSeek 补丁 → ProviderMeta 补丁 → backfill 连接字段 → 自动启用」链路是项目最复杂的迁移逻辑，每次改动都需要同时考虑：旧档兼容、DeepSeek 模型 ID 迁移（`deepseek-reasoner` → `deepseek-v4-pro`）、CORS 标签回填、内置模型自动启用、抑制预设集合（`SUPPRESSED_BUILTIN_PRESET_IDS`）。已有 `migration.integration.test.ts` + `config-conversion.test.ts` + `import-export.test.ts` 严密守护。R-06 / R-07 / R-08 都是真实问题，但修任何一个都需要完整跑迁移测试矩阵，且容易引入数据丢失回归。建议先补 e2e 烟测再动刀。

#### 不要碰 3：`packages/desktop/preload.js` 的流式事件监听注册顺序与 `createStreamAbortRace`

preload 的 `sendMessageStream` / `sendMessageStreamWithTools` / `optimizePromptStream` 等方法里 `generateStreamId → 注册 listener → invoke → cancellation race → cleanup` 的顺序看似重复，实则是为了正确处理：(1) 主进程在 invoke 返回前就发 finish 事件；(2) AbortSignal 触发时清理 listener；(3) 多个并发流不串台。`preload-stream-cancellation.test.js` 已覆盖取消语义。重构 A 必然要动这里（加 payload），但**不要顺手"简化"事件注册顺序** —— 一旦破坏取消语义，桌面端取消按钮会失效。只改 `finishListener` 接收 payload 这一行。

---

## 4. 文档

> 与 FULL-AUDIT §6.5 做增量。背景：方案 C（双层 SSOT + L2 冻结）已落地。

### 4.1 文档健康评分

| 维度 | 分（/10） | 理由 |
|------|----:|------|
| 结构 | 7 | 方案 C 层级清晰；`docs/README.md`、`DOCS_POLICY.md`、`DOC-SYSTEM-PLAN` 已就位；扣分：`docs/developer/README.md`、`docs/archives/README.md` 索引大面积失真；`CLOSEOUT.md` / `findings.md` / `progress.md` 等游离文档未明确分层 |
| 新鲜度 | 6 | `CURRENT.md`、`HANDOFF.md`、`FULL-AUDIT-REPORT`、`DOC-SYSTEM-PLAN`、`DOCS_POLICY`、`docs/README.md`、`docs/project/README.md`、`docs/archives/README.md`、`docs/workspace/README.md`、`.pipeline/INDEX.md`、`docs/architecture/README.md` 均带 2026-07-20 戳；扣分：`HANDOFF.md §6/§7`、`docs/archives/README.md`、`docs/developer/README.md`、`docs/project/prd.md`、`docs/project/release-notes.md`、`docs/project/version-sync.md` 仍写 07-18 或 v2.10.0 事实；`HANDOFF.md §10` 变更日志末条停在 2026-07-18 晚，首部却声明 2026-07-20 更新 |
| 可操作性 | 5 | L0 入口与命令清单基本可用；扣分：`release-notes.md` 推荐的 `pnpm release:notes:new/check` 不存在；`HANDOFF.md §7.3` 清理自检指向废弃路径跑必失败；`developer/README.md` 多处 `（待创建）` 实际已有；`archives/README.md` 列举 20+ 目录均已不存在 |
| 单一真相 | 6 | `CURRENT.md` 已立为版本/路径 SSOT，`check-docs-current-version.mjs` 守住一条；扣分：`HANDOFF.md §7.2` 禁删清单与 `CURRENT.md` 已废弃声明直接冲突；`sync-versions.js` 实际同步 2 个文件但 `version-sync.md` 只写 1 个；`HANDOFF.md §6` Git 路径与 `CURRENT.md` 路径分裂；`FULL-AUDIT §6.5` 真相源表未把 `CURRENT.md` 列为头号 SSOT；源码 `README.md` 不链 `CURRENT.md`/`HANDOFF.md` |

**总分：24/40（≈60%）** —— 入口止血完成，工程交接与归档索引仍有可见漂移。

### 4.2 P0 漂移清单（20 条）

#### `PROJECT_HANDOFF.md` 路径/分支漂移（5 条）

**DOC-01** 旧源码路径未清理
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\docs\PROJECT_HANDOFF.md:259`
- 证据：`cd C:\Users\yuanjia\Documents\Codex\2026-07-17\dui\work\source-extract\prompt-optimizer-develop`
- 事实：`CURRENT.md:23` 权威路径为 `D:\PromtOptimizer\src\prompt-optimizer`
- 动作：改为 `cd D:\PromtOptimizer\src\prompt-optimizer`；工作量 ≤ 5 分钟；可独立 PR。

**DOC-02** Git push 目标分支陈旧
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\docs\PROJECT_HANDOFF.md:263`
- 证据：`git push origin work/desktop-hardening-on-develop`
- 事实：同文件第 84 行声明该分支「考古」；`CURRENT.md:12` 权威分支为 `develop`
- 动作：改为 `git push origin develop`；工作量 ≤ 5 分钟；可独立 PR。

**DOC-03** 禁删清单含废弃路径（与 CURRENT 直接冲突）
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\docs\PROJECT_HANDOFF.md:291`
- 证据：`| D:\PromtOptimizer\PromptOptimizer\ | 可运行安装 |`
- 事实：`CURRENT.md:29` 明确该树已废弃；LS 实测该目录不存在（仅 `app\`、`audit\`、`custom-templates\`、`docs\`、`nsis-2026-07-20-*\`、`src\`、`tools\`）
- 动作：删除该行；工作量 ≤ 5 分钟；可独立 PR。

**DOC-04** 禁删清单含已不存在的 nsis 归档
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\docs\PROJECT_HANDOFF.md:292`
- 证据：`| D:\PromtOptimizer\nsis-2026-07-18\ | NSIS 安装包 |`
- 事实：LS 实测该目录不存在；现行归档为 `nsis-2026-07-20-paper-theme\` 与 `nsis-2026-07-20-develop-ux\`
- 动作：删除该行或改为现行归档；工作量 ≤ 5 分钟；可独立 PR。

**DOC-05** 清理自检全部指向不存在路径
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\docs\PROJECT_HANDOFF.md:302-306`
- 证据：4 条 `Test-Path D:\PromtOptimizer\PromptOptimizer\...` 与 `Test-Path D:\PromtOptimizer\nsis-2026-07-18\...`
- 事实：(a) `PromptOptimizer\` 已废弃且不存在；(b) 现行安装为 `D:\PromtOptimizer\app\resources\app.asar`（Glob 已确认），asar 内才有 `main.js` 等，`Test-Path` 进不去 asar；(c) `nsis-2026-07-18\` 不存在，现行 NSIS 在 `nsis-2026-07-20-paper-theme\PromptOptimizer-2.11.7-win-x64.exe`
- 动作：替换为 `Test-Path D:\PromtOptimizer\app\resources\app.asar` + `Test-Path D:\PromtOptimizer\nsis-2026-07-20-paper-theme\PromptOptimizer-2.11.7-win-x64.exe` + `node scripts/desktop-local-e2e-smoke.cjs`（设 `$env:PROMPT_OPTIMIZER_INSTALL_ROOT='D:\PromtOptimizer\app'`）；工作量 ≤ 15 分钟；可独立 PR。

#### `release-notes.md` / `version-sync.md` 与脚本不一致（2 条）

**DOC-06** `pnpm release:notes:*` 脚本在 `package.json` 中不存在
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\docs\project\release-notes.md:47,50,53,56,59,73,79`
- 证据：`pnpm release:notes:new` / `pnpm release:notes:check` / `pnpm release:notes:check:entry v2.6.0`
- 事实：根 `package.json` `scripts` 段无 `release:notes:*`；真实 CLI 是 `node scripts/release-notes.js <new|check|check-entry|render-body> [version]`（见 `scripts/release-notes.js:602-607`）；`releases/v2.11.{0..7}.{en,zh-CN}.md` 也复述了不存在的命令
- 动作：把 `pnpm release:notes:*` 全部替换为 `node scripts/release-notes.js *`；工作量 ≤ 30 分钟；可独立 PR。

**DOC-07** `version-sync.md` 同步文件清单少 1 项
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\docs\project\version-sync.md:11`
- 证据：仅列 `packages/extension/public/manifest.json`
- 事实：`scripts/sync-versions.js:10-22` 实际同步 2 个文件，第二条是 `packages/desktop/package.json`
- 动作：补登 `packages/desktop/package.json`；工作量 ≤ 5 分钟；可独立 PR。

#### `docs/archives/README.md` 索引大面积失真（2 条）

**DOC-08** 索引列举 20+ 不存在的目录
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\docs\archives\README.md:25-74`
- 证据：列出 `102-web-architecture-refactor`、`103-desktop-architecture`、`107-component-standardization`、`110-desktop-indexeddb-fix`、`111-electron-preference-architecture`、`113-full-service-refactoring`、`114-desktop-file-storage`、`115-ipc-serialization-fixes`、`116-desktop-packaging-optimization`、`117-import-export-architecture-refactor`、`118-desktop-auto-update-system`、`119-csp-safe-template-processing`、`121-multi-custom-models-support`、`123-advanced-features-implementation`、`124-navigation-optimization`、`127-multi-turn-dialogue-mode-optimization`、`128-context-ui-and-variable-system-refactor`、`129-session-store-single-source-refactor`、`130-test-area-version-model-selection`、`132-architecture-migration-and-session-persistence-plans`
- 事实：LS `docs\archives` 实际只有 14 个目录：`101-singleton-refactor`、`104-test-panel-refactor`、`105-output-display-v2`、`106-template-management`、`108-layout-system`、`109-theme-system`、`112-desktop-ipc-fixes`、`117-pinia-refactoring`、`120-mcp-server-module`、`122-docker-api-proxy`、`122-naive-ui-migration`、`125-test-area-refactor`、`126-submode-persistence`、`131-testing-redesign`
- 动作：重写 `archives/README.md` 索引与实际对齐；工作量 1 小时；可独立 PR。

**DOC-09** 索引漏登 `122-naive-ui-migration/` + 编号自相矛盾
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\docs\archives\README.md:59,124,70`
- 证据：仅列 `122-docker-api-proxy`；行号 124「下一个建议编号: 132」与行号 70「132 已完成」自相矛盾；「117-import-export-architecture-refactor」与实际「117-pinia-refactoring」名称不符
- 动作：补登 `122-naive-ui-migration`；修正编号续编逻辑；统一 117 名称；工作量 ≤ 30 分钟；可独立 PR。

#### `docs/developer/README.md` 索引失真（1 条 + 子项）

**DOC-10** 引用不存在的 `ai-development-workflow.md` + 把已存在文件标 `（待创建）`
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\docs\developer\README.md:10,36,26-48`
- 证据：`[AI开发流程规范](./ai-development-workflow.md)`（不存在）；`./troubleshooting/README.md（待创建）`（实际存在）；`./api/core-api.md`、`./architecture/overview.md`、`./architecture/design-patterns.md` 在 developer/ 下根本不存在
- 动作：删除死链或创建空文件；移除「（待创建）」标记；工作量 ≤ 30 分钟；可独立 PR。

#### 源码 `README.md` 与 fork-only 策略冲突（1 条）

**DOC-11** Local Development 仍指向上游 clone
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\README.md:331-332`
- 证据：`git clone https://github.com/linshenkx/prompt-optimizer.git`
- 事实：`CURRENT.md:14` fork-only；`docs\developer\development.md:32` 写 `git clone https://github.com/xvyimu/prompt-optimizer.git`；`PROJECT_HANDOFF.md:8` Fork = `xvyimu/prompt-optimizer`
- 动作：改为 `git clone https://github.com/xvyimu/prompt-optimizer.git` + 附 fork-only 说明；工作量 ≤ 5 分钟；可独立 PR。

#### PRD 版本叙事滞后（1 条）

**DOC-12** PRD 仍写 v2.10.0 范围
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\docs\project\prd.md:82,88,112,195`
- 证据：`### 3.5 Prompt Garden（v2.10.0）`、`### 3.6 智能收藏（v2.10.0）`、`完整备份（v2.10.0）`、`### 7.1 v2.10.0（2026-05-03）`
- 事实：现行版本 `2.11.7`；2.11.x 引入的 Paper 主题、stream cancel、IPC 域拆分、P0 安全均未进 PRD
- 动作：新增「v2.11.x 增量」段，覆盖 Paper / stream cancel / IPC 域拆分 / fork-only / P0 安全；工作量 2 小时；可独立 PR。

#### `HANDOFF.md §10` 变更日志断档（1 条）

**DOC-13** 变更日志末条与首部时间戳不符
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\docs\PROJECT_HANDOFF.md:5,333-334`
- 证据：首部 `最后更新：2026-07-20` vs §10 末条 `2026-07-18 晚`
- 事实：2026-07-20 的方案 C 落地、`CURRENT.md` 新建、`DOCS_POLICY.md` 新建等大改未补 §10
- 动作：补 `| 2026-07-20 | 方案 C 文档体系落地；CURRENT.md 新建；DOCS_POLICY.md 新建；check:docs 入 CI |`；工作量 ≤ 5 分钟；可独立 PR。

#### `FULL-AUDIT §6.5` 真相源表遗漏 SSOT（1 条）

**DOC-14** §6.5 文档真相源表未列 `CURRENT.md` 为头号 SSOT
- 文件：`D:\PromtOptimizer\docs\FULL-AUDIT-REPORT-2026-07-20.md:363-373`
- 证据：表中列 `PROJECT_HANDOFF.md`、`README.md / CLOSEOUT.md`、`OPTIMIZATION_PLAN.md`、`prd.md`、`architecture/*`，但未列 `docs/project/CURRENT.md`、`docs/DOCS_POLICY.md`、`docs/DOC-SYSTEM-PLAN-2026-07-20.md`、`docs/project/release-notes.md`、`docs/project/version-sync.md`
- 事实：`CURRENT.md` 是方案 C 明确的版本/路径 SSOT（`DOCS_POLICY.md:10`）
- 动作：在 §6.5 表头部追加 `CURRENT.md` 为头号 SSOT，补登其他 4 个；工作量 ≤ 15 分钟；可独立 PR。

#### `DOCS_POLICY.md` 未明确 release-notes/version-sync 层级（1 条）

**DOC-15** `docs/project/` 下两篇过程文档未分层
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\docs\DOCS_POLICY.md:8-16`
- 证据：表内仅列 `project/CURRENT.md`、`project/prd.md` 为 L1；`release-notes.md`、`version-sync.md` 未出现
- 事实：两文档实际存在于 `docs\project\`，描述发版过程，按方案 C 应属 L1 活文档
- 动作：在 `DOCS_POLICY.md` 表中补登两篇为 L1；工作量 ≤ 5 分钟；可独立 PR。

#### 源码 `README.md` 不链 `CURRENT.md` / `HANDOFF.md`（1 条）

**DOC-16** 源码 README 缺 L0/L1 入口
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\README.md:362`
- 证据：唯一 L0 入口是 `[Documentation Index](docs/README.md)`
- 事实：未链 `docs/PROJECT_HANDOFF.md`（L0）、`docs/project/CURRENT.md`（L1 SSOT）、`D:\PromtOptimizer\docs\FULL-AUDIT-REPORT-2026-07-20.md`（L1 审计）
- 动作：在 README 顶部增「Project Status」段，链 CURRENT.md / HANDOFF.md / FULL-AUDIT-REPORT；工作量 ≤ 15 分钟；可独立 PR。

#### `check-docs-*.mjs` 守卫过窄（2 条）

**DOC-17** `check-docs-current-version.mjs` 只查 `CURRENT.md`
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\scripts\check-docs-current-version.mjs:21-24`
- 证据：仅 `body.includes(\`**${version}**\`)` 等三选一匹配 `docs/project/CURRENT.md`
- 事实：未校验 `PROJECT_HANDOFF.md:6`、`docs/project/README.md:3`、`docs/project/project-status.md:4`、`CHANGELOG.md:5` 是否对齐
- 动作：扩展脚本校验 5 处版本号；工作量 ≤ 1 小时；可独立 PR。

**DOC-18** `check-docs-freeze-banners.mjs` 只查 2 个文件
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\scripts\check-docs-freeze-banners.mjs:9-12`
- 证据：`files` 数组只列 `docs/archives/README.md` 与 `docs/workspace/README.md`
- 事实：`DOCS_POLICY.md:16` 明确 `.pipeline/` 也是 L2；`.pipeline/INDEX.md` 实际有横幅但脚本不守；`CLOSEOUT.md`（根）也属 L2 但无横幅检查
- 动作：扩展 `files` 数组含 `.pipeline/INDEX.md`、`docs/workspace-trpc/README.md`（如存在）、`docs/workspace-template/README.md`；工作量 ≤ 30 分钟；可独立 PR。

#### `archives/README.md` 编号续编与现状不符（1 条）

**DOC-19** 同 DOC-09。

#### `HANDOFF.md` IPC 模块清单与代码不全一致（1 条）

**DOC-20** `§2.2 Desktop IPC 领域拆分` 模块清单漏登
- 文件：`D:\PromtOptimizer\src\prompt-optimizer\docs\PROJECT_HANDOFF.md:120-126`
- 证据：表中列 `llm-handlers / prompt-stream / prompt-sync`，又列 `model / image / template / history / context / favorite / data / preference / system`
- 事实：实际 `packages\desktop\config\ipc\` 含 9 个 handler 文件（`channel-manifest.js`、`context-handlers.js`、`data-handlers.js`、`history-handlers.js`、`image-handlers.js`、`llm-handlers.js`、`model-handlers.js`、`system-handlers.js`、`update-handlers.js`）；HANDOFF §2.2 写成「prompt-stream / prompt-sync」等不存在的文件名
- 动作：用实际文件名重写 §2.2 表；工作量 ≤ 30 分钟；可独立 PR。

### 4.3 建议新增 3-7 篇活文档

| # | 标题 | 受众 | L0/L1 | 大纲 |
|---|------|------|-------|------|
| 1 | `docs/project/DOC-DRIFT-REGISTRY.md` | 维护者、审计员 | L1 | 登记所有已知漂移（DOC-01 ~ DOC-20）+ 状态 + 责任人 + 修复截止 + 关联 check 脚本 |
| 2 | `docs/project/RELEASE-RUNBOOK.md` | 发版人 | L1 | 前置 check:docs / test:gate → `pnpm version:prepare` → `node scripts/sync-versions.js`（实际同步 2 个文件）→ `node scripts/release-notes.js new <version>` → 编辑 `releases/v{ver}.{en,zh-CN}.md` → `node scripts/release-notes.js check <version>` → CHANGELOG 顶部更新 → `pnpm version:tag` → `pnpm version:publish` → Desktop NSIS build:ci + 安装到 `D:\PromtOptimizer\app` → `node scripts/desktop-local-e2e-smoke.cjs` 验收 |
| 3 | `docs/developer/NEW-CONTRIBUTOR.md` | 新 fork-only 贡献者 | L1 | 30 分钟上手：clone `xvyimu/prompt-optimizer`（非上游）→ `pnpm install` → `pnpm dev` → 改一个小功能（如新增 i18n key）→ `pnpm test:gate:core` → PR 到 fork `develop`（非上游）→ fork-only 策略说明 |
| 4 | `docs/project/CLEANUP-PLAYBOOK.md` | 清理磁盘的维护者 | L1 | 允许删除（与实际文件系统对齐）：`portable-build\`、`portable-app-overlay\`、`.pipeline/core-unit-report.json`、`packages/desktop/dist/win-unpacked\`、`test-results/`、`playwright-report/`、`%TEMP%\po-local-e2e-*.log`、`app.asar.bak-pre-icons-*`；禁止删除：`D:\PromtOptimizer\app\`、`src\prompt-optimizer\`、`custom-templates\`、`tools\`、`nsis-2026-07-20-paper-theme\`、`nsis-2026-07-20-develop-ux\`、`CLOSEOUT.md`、`docs\FULL-AUDIT-REPORT-2026-07-20.md`、`docs\DOC-SYSTEM-PLAN-2026-07-20.md`；清理后自检：`Test-Path D:\PromtOptimizer\app\resources\app.asar`、`Test-Path D:\PromtOptimizer\nsis-2026-07-20-paper-theme\PromptOptimizer-2.11.7-win-x64.exe`、`node scripts/desktop-local-e2e-smoke.cjs` |
| 5 | `docs/architecture/CURRENT-STATE.md` | 架构读者、新贡献者 | L1 | 当前模块清单（core/ui/web/desktop/extension/mcp-server）+ 当前 IPC channel-manifest 版本（1.1.0）+ Paper 主题作用域 + 当前 LLM 适配器清单 + 当前 storage 路径 + 当前 stream-cancel 链路 |
| 6 | `docs/developer/CHECK-DOCS-HARDENING.md` | CI 维护者、文档工程师 | L1 | `check-docs-current-version.mjs` 当前规则 + `check-docs-freeze-banners.mjs` 当前规则 + 扩展点（见 §4.5）+ 新增脚本落地流程 |
| 7 | `docs/project/MIGRATION-HISTORY.md` | 未来的维护者 | L1 | 迁移事件流水：2026-07-17 `work/desktop-hardening*` → `develop`、2026-07-18 `PromptOptimizer\` 热替换树 → `app\` NSIS + asar、2026-07-20 文档体系方案 C 落地、各 P0 安全修复等；每条带触发原因 + 范围 + 回滚预案 |

### 4.4 `CURRENT.md` / `HANDOFF.md` 应增补字段

**CURRENT.md 增补**：
- `app.asar` 内容指纹（SHA256，便于审计）
- `pnpm check:docs` / `pnpm test:gate` 最近一次通过时间戳
- L1 活文档清单（≤15 个）
- 「已知漂移」链接 → `DOC-DRIFT-REGISTRY.md`
- 实际 `tools\node-v22.17.0-win-x64\` 完整路径
- channel-manifest 当前协议版本（1.1.0）

**HANDOFF.md 增补**：
- 首部加 `DOCS_POLICY.md`、`DOC-SYSTEM-PLAN`、`FULL-AUDIT` 三条链接
- §1.2 安装树补 `app\resources\app.asar` SHA256
- §2.2 IPC 表对齐实际文件名（见 DOC-20）
- §5 测试命令补 `pnpm check:docs` 入口
- §6 Git workflow 路径改回 `D:\PromtOptimizer\src\prompt-optimizer`；分支示例改 `develop`
- §7 整段替换为指向 `docs/project/CLEANUP-PLAYBOOK.md`
- §10 变更日志补 2026-07-20 方案 C 落地条目
- 新增 §11「文档体系摘要」：1 段话指 `DOCS_POLICY.md` + `DOC-SYSTEM-PLAN` + `DOC-DRIFT-REGISTRY.md`

### 4.5 `check:docs` 可增强断言（10 条）

| # | 脚本 | 断言 | 覆盖漂移 |
|---|------|------|----------|
| 1 | `check-docs-handoff-paths.mjs` | `PROJECT_HANDOFF.md` 不应出现 `C:\\Users\\yuanjia\\Documents\\Codex`、`work/desktop-hardening`、`D:\\PromtOptimizer\\PromptOptimizer\\`、`nsis-2026-07-18` | DOC-01 ~ DOC-05 |
| 2 | `check-docs-pnpm-script-refs.mjs` | 扫描 `docs/**/*.md`，凡 `pnpm <name>` 引用必须命中 `package.json` scripts | DOC-06 |
| 3 | `check-docs-version-sync-list.mjs` | 解析 `scripts/sync-versions.js` 的 `versionFiles`，与 `version-sync.md` 列出的文件清单做集合比对 | DOC-07 |
| 4 | `check-docs-archive-index.mjs` | 解析 `archives/README.md` 中 `./NNN-*` 引用，与 `fs.readdirSync('docs/archives')` 做集合比对 | DOC-08 / DOC-09 / DOC-19 |
| 5 | `check-docs-developer-index.mjs` | 解析 `developer/README.md` 中 `./xxx.md` 引用，校验文件存在；正则 `（待创建）` 后的路径不应已存在 | DOC-10 |
| 6 | `check-docs-source-readme-fork.mjs` | 源码 `README.md` 与 `README.zh-CN.md` 必须满足以下之一：(a) 含 `xvyimu/prompt-optimizer` 链接，或 (b) 含 `docs/project/CURRENT.md` 链接，或 (c) 在 Local Development 段附「fork-only」说明 | DOC-11 / DOC-16 |
| 7 | 扩展 `check-docs-freeze-banners.mjs` | 在现有 2 个文件基础上新增 `.pipeline/INDEX.md`、`docs/workspace-trpc/README.md`（如存在）、`docs/workspace-template/README.md`、根 `CLOSEOUT.md` | DOC-18 |
| 8 | `check-docs-version-consistency.mjs` | 从根 `package.json` 取 `version`，校验 5 处文本均含该版本：CURRENT.md / HANDOFF.md 首部 / `docs/project/README.md` 横幅 / `docs/project/project-status.md` 横幅 / `CHANGELOG.md` 顶部 | DOC-12（间接） / DOC-17 |
| 9 | `check-docs-handoff-ipc-manifest.mjs` | 解析 `HANDOFF.md §2.2` 中列出的 IPC 模块名，与 `fs.readdirSync('packages/desktop/config/ipc')` 做集合比对 | DOC-20 |
| 10 | `check-docs-handoff-changelog-freshness.mjs` | `HANDOFF.md` 首部 `最后更新：YYYY-MM-DD` 与 §10 变更日志末条日期差 ≤ 7 天 | DOC-13 |

### 4.6 禁止把 workspace 当正式结论的清单

| 类别 | 路径 | 原因 |
|------|------|------|
| L2 显式冻结 | `docs\archives\**` | `DOCS_POLICY.md:20` 明令；索引与实际文件大面积失真 |
| L2 显式冻结 | `docs\workspace\**` | `DOCS_POLICY.md:21` 明令 |
| L2 显式冻结 | `docs\workspace-trpc\**` | 同 workspace 语义；含 `experience.md`/`scratchpad.md`/`todo.md`/`favorites-feature-audit.md` |
| L2 显式冻结 | `docs\workspace-template\**` | 模板，非结论 |
| L2 过程产物 | `.pipeline\**` | `DOCS_POLICY.md:16` + `.pipeline/INDEX.md` 横幅均声明「非产品规范」 |
| L2 历史收口 | `D:\PromtOptimizer\CLOSEOUT.md` | `DOC-SYSTEM-PLAN §5` 标 L2；2026-07-18 历史快照，不含 2.11.7/Paper/P0 安全事实 |
| L2 历史 NSIS 旁注 | `D:\PromtOptimizer\nsis-2026-07-20-develop-ux\README.md`、`SMOKE-RESULT.md`、`build-*.log`、`smoke-*.png`、`po-state*.json`、`apps*.json`、`build-info.json`、`latest.yml`、`smoke-tree-*.txt` | per-build 产物，非产品规范 |
| L2 子审计 | `D:\PromtOptimizer\audit\architecture-audit.md`、`engineering-audit.md`、`qa-audit.md` | 子角色并行审计；FULL-AUDIT §0 已声明「以本文件与源码事实为准」 |
| L2 设计草稿 | `D:\PromtOptimizer\audit\paper-extract\*` | Paper 主题抽取草稿；已被 `packages/ui/src/styles/paper.css` 取代 |
| L2 过程笔记 | `D:\PromtOptimizer\src\prompt-optimizer\findings.md`、`progress.md` | 源码根游离过程笔记，未进 docs/ 体系 |
| L2 用户数据 | `D:\PromtOptimizer\custom-templates\user-templates-pack.json`、`verify-names.txt` | 用户模板数据，非产品规范 |
| L2 工具脚本 | `D:\PromtOptimizer\cleanup-obsolete.ps1` | 一次性清理脚本，非文档 |
| L2 旧禁删清单 | `docs\PROJECT_HANDOFF.md §7.2/§7.3` | 已与实际文件系统冲突（DOC-03/04/05）；在新 `CLEANUP-PLAYBOOK.md` 落地前禁止把 §7 当真相 |
| L2 旧 Git 命令 | `docs\PROJECT_HANDOFF.md §6` cd/push 命令 | 路径与分支均漂移（DOC-01/02） |
| L2 过期命令 | `docs\project\release-notes.md` 全部 `pnpm release:notes:*` | 不存在（DOC-06） |
| L2 过期同步清单 | `docs\project\version-sync.md`「自动同步的文件」段 | 漏 1 项（DOC-07） |

---

## 5. 安全

> 与 FULL-AUDIT §5 做差分；S1/S2/S6 已修，S3/S4/S5/S7/S8/S9 仍开放但**不作为新发现**。本轮新增 S10–S23。

### 5.1 新发现清单（S10–S23）

#### S10｜Desktop 大量 IPC handler 绕过 sender 校验

| 字段 | 内容 |
|---|---|
| 严重度 | High |
| 资产 | Electron 主进程 / 用户数据 / 本地文件系统 / 模型 apiKey |
| 证据 | 以下 channel 均直接 `ipcMain.handle(...)`，未走 `registerSecureIpcHandler` / `assertTrustedRendererSender`：<br>- `packages\desktop\config\ipc\data-handlers.js:18-78`（`data-exportAllData` / `data-importAllData` / `data-getStorageInfo` / `data-openStorageDirectory`，后者调 `shell.openPath(userDataPath)`）<br>- `packages\desktop\config\ipc\image-handlers.js:26-243`（全部 `image-model-*` / `image-generate*` / `image-testConnection` / `image-getDynamicModels`）<br>- `packages\desktop\config\ipc\model-handlers.js:19-137`（全部 `model-*`，含 `model-addModel` / `model-importData`，可写入含 apiKey 模型配置）<br>- `packages\desktop\config\ipc\context-handlers.js:14-164`<br>- `packages\desktop\config\ipc\favorite-handlers.js:55-291`<br>- `packages\desktop\config\ipc\update-handlers.js:280-900`<br>- `packages\desktop\config\ipc\system-handlers.js:66-83`（`logs-open-directory` 调 `shell.openPath(logDir)`）<br>- `packages\desktop\remote-storage.js:525-533`（`REMOTE_STORAGE_CHANNEL`，凭据经 IPC 明文流转）<br>对照：`packages\desktop\config\ipc\llm-handlers.js` 是**唯一**使用 `registerSensitiveIpcHandler` 的 handler |
| 利用前提 | 渲染进程被任意来源污染（典型路径：S11 MarkdownRenderer 错误分支注入；或 webview/iframe/外部链接被加载；或第三方依赖被供应链污染），即可在主进程上下文执行 `shell.openPath`、读写 `userData`、导出含 apiKey 的全量配置、`data-importAllData` 覆盖本地数据 |
| 修复建议 | 1. 所有 `ipcMain.handle` 调用点统一改走 `registerSecureIpcHandler` / `registerSensitiveIpcHandler`，强制 `senderFrame.isMainFrame` + URL 白名单；2. 对 `shell.openPath` / `shell.openExternal` 类高敏感 channel 额外做路径/URL 白名单；3. 对 `data-importAllData` / `model-importData` 增加 schema 与来源校验 |
| 验证方式 | 全仓库 grep `ipcMain\.handle\(`，逐个核对是否位于 `registerSecureIpcHandler` 内；预期 0 处裸调用 |
| 工作量 | 1-2 天（8 类 handler × 100+ channel） |
| 可独立 PR | 是（按 handler 分文件提交） |

#### S11｜MarkdownRenderer 错误分支 innerHTML 注入 + DOMPurify 默认配置

| 字段 | 内容 |
|---|---|
| 严重度 | High |
| 资产 | Web / Desktop / Chrome Ext 三端共享渲染组件 |
| 证据 | - `packages\ui\src\components\MarkdownRenderer.vue:66-81`：错误分支 `markdownContainer.value.innerHTML = \`<p class="text-red-500">Error rendering markdown: ${renderError.value}</p>\``，`renderError.value` 来源 `error.message`，未经转义<br>- `packages\ui\src\components\MarkdownRenderer.vue:262-278`：`new MarkdownIt({ html: true, linkify: true })` + `DOMPurify.sanitize(processedHtml)` 使用默认配置（未显式 `ALLOWED_TAGS` / `ALLOWED_ATTR` / `FORBID_TAGS` / hook），`html:true` 允许原始 HTML 直通渲染链 |
| 利用前提 | LLM 返回内容（或导入的历史记录、模板）能触发 markdown-it / DOMPurify 处理异常，`error.message` 中若包含攻击者可控片段（如 `<img onerror=...>`），即被 innerHTML 直接注入 DOM；即便正常分支，`html:true` + DOMPurify 默认配置在 mXSS 场景下仍有绕过风险 |
| 修复建议 | 1. 错误分支改用 `textContent` 或对 `renderError.value` 做 `escapeHtml`；2. DOMPurify 显式 `DOMPurify.sanitize(html, { ALLOWED_TAGS: [...], ALLOWED_ATTR: [...], FORBID_TAGS: ['style', 'form', 'input'], ALLOW_DATA_ATTR: false })`；3. 评估关闭 `markdown-it` 的 `html: false`；4. 增加 `DOMPurify.addHook('uponSanitizeElement', ...)` 监控异常 |
| 验证方式 | 1. 构造触发 `renderError` 的输入，确认 DOM 中错误信息以纯文本形式呈现；2. 用 DOMPurify 已知 mXSS bypass payload 集回归 |
| 工作量 | 2-4 小时 |
| 可独立 PR | 是 |

#### S12｜Nginx CSP 过宽（http: / unsafe-inline / ws:）

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 资产 | Docker 部署的 Web 前端 |
| 证据 | `docker\nginx.conf:12`：`Content-Security-Policy "default-src 'self' https: http: data: blob: 'unsafe-inline'; connect-src 'self' https: http: ws: wss:; ..."` |
| 利用前提 | 任意 XSS（如 S11）即可绕过 CSP 执行任意内联脚本，并通过 `http:` / `ws:` 外带数据 |
| 修复建议 | 1. `default-src 'self'`；`script-src 'self'`（如需内联改用 nonce）；2. `connect-src 'self' https:`，移除 `http:` 与 `ws:`；3. `object-src 'none'`、`base-uri 'self'`、`frame-ancestors 'none'`；4. 部署 CSP report-only 收集违规后再切换 enforce |
| 验证方式 | `curl -I https://<host>/` 检查 `Content-Security-Policy` 头，确认无 `unsafe-inline` / `http:` / `ws:` |
| 工作量 | 1 小时 |
| 可独立 PR | 是 |

#### S13｜/assets 与 /healthz 绕过 Basic Auth，且 /healthz 泄漏服务状态

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 资产 | Docker 部署的 Web 前端静态资源、MCP 服务状态 |
| 证据 | - `docker\nginx.conf:23-27`：`/assets` location 响应头含 `Cache-Control public`<br>- `docker\nginx.conf:48-57`：`/healthz` 显式 `auth_basic off`<br>- `packages\mcp-server\src\health.ts:22-35`：`/healthz` 返回 `initialized` / `services` 等状态字段，无认证 |
| 利用前提 | 攻击者可匿名 `curl /healthz` 探测服务可用性、初始化状态、子服务列表；`/assets` 缓存语义在共享代理场景下存在认证内容泄漏风险 |
| 修复建议 | 1. `/healthz` 加 `allow 127.0.0.1; deny all;` 或单独 healthcheck token；2. `/healthz` 响应仅返回 `ok: true`，不暴露 `services`；3. `/assets` 改用 `Cache-Control private, no-store` 或保留 auth_basic |
| 验证方式 | `curl -i https://<host>/healthz` 无 Authorization 头，确认 401 或仅返回 `ok` |
| 工作量 | 1 小时 |
| 可独立 PR | 是 |

#### S14｜Google Drive 默认 Client ID 硬编码

| 字段 | 内容 |
|---|---|
| 严重度 | Low |
| 资产 | 所有未自定义 `VITE_GOOGLE_DRIVE_CLIENT_ID` 的用户的 Google Drive OAuth 流 |
| 证据 | `packages\ui\src\utils\remote-backup.ts:187`：`const GOOGLE_DRIVE_DEFAULT_CLIENT_ID = '1056948847608-0gshmh967ei478h0ood6c8q2korb1ku8.apps.googleusercontent.com'`；同文件 `:241-243` `resolveGoogleDriveClientId` 优先读环境变量否则回落到该默认值 |
| 利用前提 | 默认 Client ID 是公共 OAuth 客户端：1) 配额耗尽会影响所有用户；2) 攻击者可复用该 Client ID 在自有应用中发起 OAuth 流程进行钓鱼；3) 无法按租户隔离审计 |
| 修复建议 | 1. 部署时强制要求 `VITE_GOOGLE_DRIVE_CLIENT_ID`，缺失则禁用 Google Drive 备份；2. 文档明确说明默认 Client ID 的共享风险；3. 强制 PKCE（已用 token client，确认 `initTokenClient` 配置 `ux_mode: 'redirect'` 与 `prompt: 'consent'`） |
| 验证方式 | 在未配置 `VITE_GOOGLE_DRIVE_CLIENT_ID` 的实例上检查 Google Drive 备份是否被禁用或显式告警 |
| 工作量 | 2 小时 |
| 可独立 PR | 是 |

#### S15｜generate-config.sh 将 VITE_ 环境变量键名打印到容器日志

| 字段 | 内容 |
|---|---|
| 严重度 | Low |
| 资产 | 容器日志 / 日志聚合系统 |
| 证据 | `docker\generate-config.sh:64-88`：使用 `env | grep '^VITE_'` 输出环境变量，虽已过滤敏感值（白名单仅 `VITE_APP_*` / `VITE_PUBLIC_*`），但 `env` 输出仍把键名（含被过滤的键名如 `VITE_OPENAI_API_KEY`）打印到 stdout |
| 利用前提 | 攻击者能读取容器日志（`docker logs`、日志聚合系统、`/var/lib/docker/containers/*/*.log`），可识别应用使用了哪些 LLM provider、哪些功能开关 |
| 修复建议 | 1. 改为仅打印键数量或键名 hash；2. 或仅在 `DEBUG=1` 时打印，默认静默；3. 输出去掉 `env | grep`，改为遍历白名单并打印 `key=***` |
| 验证方式 | `docker logs <container> 2>&1 | grep -E '^VITE_'` 确认无键名泄漏 |
| 工作量 | ≤ 30 分钟 |
| 可独立 PR | 是 |

#### S16｜.htpasswd `chmod -R a+r` 任意可读，可离线爆破

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 资产 | 容器内 `/etc/nginx/auth/.htpasswd` |
| 证据 | `docker\generate-auth.sh:28`：`chmod -R a+r /etc/nginx/auth`；同文件 `:1-30` 使用 `htpasswd -i` 通过 stdin 接收密码（避免命令行历史泄漏，已较好），但权限设置过宽 |
| 利用前提 | 容器内任意进程/任意用户（包括被入侵的 sidecar 或 exec 进入的调试会话）能读取 `.htpasswd`，将其离线爆破（bcrypt 成本高但 MD5/APR1 成本低）；若 `htpasswd` 使用默认 MD5，单卡每秒可尝试百万次 |
| 修复建议 | 1. `chmod 600 /etc/nginx/auth/.htpasswd`，`chown nginx:nginx`；2. 强制 `htpasswd -B`（bcrypt，cost ≥ 12）；3. supervisord 启动 nginx 后立即 `chmod 000` 由 nginx worker 持有 fd 即可 |
| 验证方式 | `docker exec <container> ls -l /etc/nginx/auth/.htpasswd` 确认权限为 `-rw-------` |
| 工作量 | ≤ 30 分钟 |
| 可独立 PR | 是 |

#### S17｜Dockerfile `COPY . /app` 可能残留 .env.local 进入镜像层缓存

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 资产 | Docker 镜像 build cache / 镜像分发产物 |
| 证据 | `Dockerfile:7-8`：`COPY . /app` 拷贝全量源码进入构建层；项目存在 `env.local.example` 与 `.env.local`（被 `docker-compose.dev.yml` 用 `env_file: ../.env.local` 引用）；即使后续 stage 只 `COPY dist`，build cache 层仍含密钥 |
| 利用前提 | 1) 镜像 build cache 被攻击者访问（CI 缓存泄漏、镜像仓库 push 错误）；2) 多阶段构建未正确隔离，最终镜像仍残留中间层；3) `docker history` 可还原 layer 内容 |
| 修复建议 | 1. 新增 `.dockerignore`，排除 `.env*`、`*.log`、`node_modules`、`.git`；2. 构建期需要的密钥改用 BuildKit `--secret` 挂载，不进入 layer；3. CI 中 `docker build --no-cache` 或定期清理 buildx cache |
| 验证方式 | 1. `docker history --no-trunc <image>` 检查是否存在 `.env.local` 痕迹；2. `dive <image>` 分析 layer 内容 |
| 工作量 | 1 小时 |
| 可独立 PR | 是 |

#### S18｜supervisord 以 root 运行 + unix socket 无权限控制

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 资产 | 容器内 supervisor 控制通道 |
| 证据 | `docker\supervisord.conf:3`：未指定 `user=`，默认以 root 运行；`:29-33` `[unix_http_server]` 段未配置 `chmod` 或 `username`/`password` |
| 利用前提 | 容器内任意 root 进程（含被入侵的 nginx worker 提权路径）可连接 supervisor socket，重启或停止 mcp-server / nginx，造成 DoS 或绕过认证窗口 |
| 修复建议 | 1. supervisord 配置 `user=appuser`（需保证 nginx master 仍能 bind 80，可改 8080 + iptables redirect 或 `setcap`）；2. `[unix_http_server]` 配 `chmod=0700` + `username` + `password`；3. 容器以 `--user appuser` 运行 |
| 验证方式 | `docker exec <container> cat /etc/supervisord.conf | grep -E '^(user|chmod|username)'` |
| 工作量 | 2 小时 |
| 可独立 PR | 是 |

#### S19｜WebDAV/S3/Google Drive 凭据经 IPC 与 localStorage 明文流转

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 资产 | 用户远程备份凭据 |
| 证据 | - `packages\ui\src\utils\remote-backup.ts:179`：`REMOTE_BACKUP_SETTINGS_KEY = 'prompt-optimizer:remote-backup-settings'`，配置（含 `accessKeyId` / `secretAccessKey` / `password`）以 JSON 明文存 localStorage<br>- `packages\desktop\remote-storage.js:172-186`：`RemoteStorageIpcRequest.provider` 字段含 `accessKeyId` / `secretAccessKey` / `password`，经 IPC 明文传递<br>- `packages\core\src\services\model\manager.ts`：模型 `apiKey` 以 JSON 明文存 `userData/prompt-optimizer-data.json`，`exportData` 返回所有 apiKey（与 FULL-AUDIT S3 同源，但补全凭据维度） |
| 利用前提 | 1) 任意 XSS 可读取 localStorage 明文凭据；2) 本地磁盘访问可读取 `prompt-optimizer-data.json`；3) IPC 通信被监听 |
| 修复建议 | 1. Electron 端改用 `safeStorage.encryptString` 加密存储凭据；2. Web 端凭据存服务端（HttpOnly cookie + 服务端代理 S3/WebDAV），不落地浏览器；3. IPC 不传明文 secret，改用 token 流（主进程持有 secret，渲染端只传 operationId）；4. `exportData` 默认脱敏 apiKey，需用户显式确认导出含密钥 |
| 验证方式 | 1. DevTools → Application → Local Storage 检查 `prompt-optimizer:remote-backup-settings` 是否明文；2. `type %APPDATA%\prompt-optimizer\prompt-optimizer-data.json` 检查是否明文含 apiKey |
| 工作量 | 1-2 天（safeStorage 集成 + 凭据迁移） |
| 可独立 PR | 是（按凭据类型分） |

#### S20｜MCP loopback 部署不强制 token + /healthz 暴露状态

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 资产 | MCP HTTP 服务（Docker 内 nginx 反代到 127.0.0.1:3000） |
| 证据 | - `packages\mcp-server\src\config\environment.ts:146-148`：非 loopback host 强制 `MCP_AUTH_TOKEN`，loopback 不强制；Docker 中 nginx 反代到 127.0.0.1:3000，MCP 实际可不带 token，依赖 nginx Basic Auth 前置<br>- `packages\mcp-server\src\health.ts:22-35`：`/healthz` 无认证，返回 `initialized` / `services` |
| 利用前提 | 若 nginx Basic Auth 被绕过（如 S13 的 `/healthz` 路径，或 ACCESS_PASSWORD 默认空，见 S22），攻击者可直接访问 127.0.0.1:3000/mcp 完整调用 MCP 工具集 |
| 修复建议 | 1. 即使 loopback 也要求 `MCP_AUTH_TOKEN`（深度防御）；2. nginx 反代时 `proxy_set_header Authorization "Bearer <token>"`；3. `/healthz` 不返回 `services` 明细，仅返回 `ok` |
| 验证方式 | `docker exec <container> curl -s http://127.0.0.1:3000/mcp` 不带 Authorization，确认 401 |
| 工作量 | 1 小时 |
| 可独立 PR | 是 |

#### S21｜update-handlers 参数未校验直接写入 preferenceService

| 字段 | 内容 |
|---|---|
| 严重度 | Low |
| 资产 | Desktop 应用更新配置 / 自动更新流程 |
| 证据 | `packages\desktop\config\ipc\update-handlers.js:695-723`：`UPDATE_IGNORE_VERSION` channel 直接 `ipcMain.handle`，接受任意 `version` 字符串后存入 `preferenceService`，未调用 `validateVersion`（`update-config.js:135-143` 提供了该函数但未被调用） |
| 利用前提 | 渲染端被污染后可写入任意字符串到 `preferenceService`，可能造成后续 `electron-updater` 流程异常 |
| 修复建议 | 1. 所有 update channel 切换到 `registerSecureIpcHandler`；2. 对 `version` 入参调用 `validateVersion`；3. 对 `setAutoDownload` / `setAutoInstall` 等布尔参数做类型断言 |
| 验证方式 | 审计 `update-handlers.js` 全部 channel 入参校验路径 |
| 工作量 | 2 小时 |
| 可独立 PR | 是（与 S10 合并） |

#### S22｜Docker compose `ACCESS_PASSWORD` 默认空即禁用 Basic Auth

| 字段 | 内容 |
|---|---|
| 严重度 | Medium |
| 资产 | Docker 部署的 Web 应用 / MCP 服务 |
| 证据 | `docker\docker-compose.yml`：`ACCESS_PASSWORD=${ACCESS_PASSWORD:-}`（默认空）；`generate-auth.sh` 中空密码分支仅 `echo "Warning: ACCESS_PASSWORD is empty, Basic Auth disabled"` 但仍生成 `auth_basic off` 配置 |
| 利用前提 | 用户直接 `docker compose up` 未设置 `ACCESS_PASSWORD`，则 Web 应用与 MCP 服务完全无认证暴露在 28081 端口；若该端口映射到公网或宿主机局域网，任意访问者可调用所有 LLM 模型（消耗 apiKey 配额）、读取历史记录、导出数据 |
| 修复建议 | 1. `ACCESS_PASSWORD` 未设置时拒绝启动（`generate-auth.sh` 退出码非 0）；2. 或默认生成随机密码并打印到 stdout 一次；3. docker-compose.yml 中 `ACCESS_PASSWORD` 用 `${ACCESS_PASSWORD:?ACCESS_PASSWORD is required}` 强制必填 |
| 验证方式 | 不设置 `ACCESS_PASSWORD` 执行 `docker compose up`，确认启动失败或打印强制配置提示 |
| 工作量 | ≤ 30 分钟 |
| 可独立 PR | 是 |

#### S23｜api/auth.js 失败计数在 Vercel 实例内存中（per-isolate），无法全局限速

| 字段 | 内容 |
|---|---|
| 严重度 | Low |
| 资产 | Vercel 部署的 Web 应用 `ACCESS_PASSWORD` 鉴权端点 |
| 证据 | `api\auth.js`：失败计数变量位于 Vercel Edge / Node 实例内存中，每个 isolate 独立计数；Vercel Edge Function 可能在多 isolate 间分发请求，导致限速形同虚设 |
| 利用前提 | 攻击者并发爆破 `ACCESS_PASSWORD`，请求被分发到不同 isolate，每个 isolate 单独计数，单 isolate 阈值内不会被锁 |
| 修复建议 | 1. 限速改用全局存储（Vercel KV / Upstash Redis / Edge Config）；2. 或用 Vercel 内置的 Rate Limit（`@vercel/edge`）；3. 失败计数 key 包含 IP + username，TTL 5 分钟 |
| 验证方式 | 并发 100 次错误密码请求，确认是否被全局限速（预期 429） |
| 工作量 | 半天 |
| 可独立 PR | 是 |

### 5.2 STRIDE 威胁模型（一页）

| 类别 | 威胁 | 关联发现 | 现有缓解 | 缓解差距 |
|---|---|---|---|---|
| S 仿冒 | 渲染端伪造 IPC 调用方身份 | S10 / S21 | `registerSecureIpcHandler` 存在但仅用于 LLM | 大量 handler 裸用 `ipcMain.handle` |
| S 仿冒 | MCP loopback 仿冒合法客户端 | S20 / S13 | nginx Basic Auth 前置 | Basic Auth 被绕过即裸奔 |
| S 仿冒 | Google Drive OAuth 共享身份 | S14 | 支持 `VITE_GOOGLE_DRIVE_CLIENT_ID` 自定义 | 默认值硬编码，多数用户未自定义 |
| T 篡改 | localStorage 凭据被 XSS 篡改 | S19 / S11 | DOMPurify 默认配置 | 未显式白名单，错误分支 innerHTML 注入 |
| T 篡改 | update-handlers 写入任意 version | S21 | `validateVersion` 函数存在 | 未被 IPC handler 调用 |
| T 篡改 | /assets 缓存被中间代理篡改 | S13 | HTTPS 传输 | `Cache-Control public` 语义不安全 |
| R 抵赖 | /healthz 匿名探测 | S13 / S20 | 无 | 无访问日志关联身份 |
| R 抵赖 | api/auth.js 限速 per-isolate | S23 | 失败计数存在 | 非全局，攻击者可跨 isolate 规避 |
| I 信息泄漏 | MarkdownRenderer 错误信息注入 | S11 | 无 | innerHTML 拼接 error.message |
| I 信息泄漏 | .htpasswd 任意可读 | S16 | htpasswd -i stdin | chmod a+r 过宽 |
| I 信息泄漏 | Dockerfile build layer 残留 .env.local | S17 | 多阶段构建 | 未用 .dockerignore |
| I 信息泄漏 | 容器日志打印 VITE_ 键名 | S15 | 白名单过滤值 | 键名仍泄漏 |
| I 信息泄漏 | localStorage / userData 明文凭据 | S19 | 无 | safeStorage 未启用 |
| D 拒绝服务 | 分布式爆破 ACCESS_PASSWORD | S23 | 失败计数 | per-isolate 无效 |
| D 拒绝服务 | supervisor socket 被控制 | S18 | 无 | root + 无认证 |
| D 拒绝服务 | update-handlers 写入超长 version | S21 | 无 | 未校验 |
| E 权限提升 | 渲染端 RCE 即获主进程能力 | S10 | contextIsolation / nodeIntegration:false / 导航守卫 | IPC 无 sender 校验 |
| E 权限提升 | supervisord root + socket 无控 | S18 | no-new-privileges:true | supervisor 自身权限未降 |
| E 权限提升 | .htpasswd 爆破后获 Basic Auth 凭据 | S16 | htpasswd -i | bcrypt 未强制 + chmod a+r |

### 5.3 安全基线清单（23 项可勾选）

**Electron / IPC**
- [ ] B1｜全仓库 `ipcMain.handle(` 调用点 0 处裸调用（S10）
- [ ] B2｜`shell.openPath` / `shell.openExternal` 调用前必做 sender 校验 + 路径/URL 白名单（S10）
- [ ] B3｜`update-handlers` 所有 channel 入参经 `validateVersion` / 类型断言校验（S21）
- [ ] B4｜`contextIsolation:true`、`nodeIntegration:false`、`sandbox:true` 在所有 BrowserWindow 配置中为 true（SPEC-06）

**渲染端 XSS**
- [ ] B5｜`MarkdownRenderer.vue` 错误分支使用 `textContent`，禁止 `innerHTML` 拼接 `error.message`（S11）
- [ ] B6｜`DOMPurify.sanitize` 显式配置 `ALLOWED_TAGS` / `ALLOWED_ATTR` / `FORBID_TAGS:['style','form','input']` / `ALLOW_DATA_ATTR:false`（S11）
- [ ] B7｜`markdown-it` 评估关闭 `html:false`，或对原始 HTML 走二次 sanitize（S11）

**Docker / 部署**
- [ ] B8｜Nginx CSP 收紧：`default-src 'self'`、`script-src 'self'`、`connect-src 'self' https:`，移除 `http:` / `unsafe-inline` / `ws:`（S12）
- [ ] B9｜`/healthz` 加 IP 白名单或本机访问限制，响应仅返回 `ok`，不暴露 `services`（S13 / S20）
- [ ] B10｜`.htpasswd` 权限 `600` + `chown nginx:nginx` + 强制 bcrypt cost ≥ 12（S16）
- [ ] B11｜`.dockerignore` 排除 `.env*` / `*.log` / `node_modules` / `.git`，构建期密钥用 BuildKit `--secret`（S17）
- [ ] B12｜supervisord 配置 `user=appuser`、`[unix_http_server] chmod=0700` + `username/password`，或改用信号控制（S18）
- [ ] B13｜`docker-compose.yml` 中 `ACCESS_PASSWORD` 用 `${ACCESS_PASSWORD:?required}` 强制必填，未设置则拒绝启动（S22）
- [ ] B14｜`generate-config.sh` 不打印 `VITE_` 键名，仅打印键数量或 hash（S15）

**凭据存储与传输**
- [ ] B15｜Electron 端凭据用 `safeStorage.encryptString` 加密存储；Web 端凭据存服务端 HttpOnly cookie，不落地 localStorage（S19）
- [ ] B16｜IPC 不传明文 `accessKeyId` / `secretAccessKey` / `password`，改用主进程持有 secret + 渲染端传 operationId 的 token 流（S19）
- [ ] B17｜`exportData` 默认脱敏 `apiKey`，需用户显式勾选「包含密钥」才导出（S19）

**MCP HTTP**
- [ ] B18｜MCP 即使 loopback 也要求 `MCP_AUTH_TOKEN`，nginx 反代时 `proxy_set_header Authorization "Bearer <token>"`（S20）
- [ ] B19｜`/healthz` 不返回 `services` 明细（S20）

**Vercel / 边缘鉴权**
- [ ] B20｜`api/auth.js` 限速改用全局存储（Vercel KV / Upstash Redis / Edge Config），key 含 IP + username，TTL 5 分钟（S23）

**供应链**
- [ ] B21｜`.npmrc` 评估移除 `shamefully-hoist=true`，`enable-pre-post-scripts=true` 改为按包白名单
- [ ] B22｜CI 中 `pnpm audit --prod --audit-level=high` 在每次 PR 强制运行，failure 阻断合并

**OAuth**
- [ ] B23｜Google Drive 备份功能在未配置 `VITE_GOOGLE_DRIVE_CLIENT_ID` 时禁用或显式告警，强制用户使用自有 Client ID（S14）

---

## 6. 性能体验

> 本轮未派专项代理，也未做基准测量。以下为基于代码静态审查的「假设性」建议，标记 [假设]；任何决策都需先有测量。

### [P1] PERF-01 UI bundle 被 `@aws-sdk/client-s3` 膨胀

- **证据**：`packages\ui\package.json:36` 依赖 `@aws-sdk/client-s3@^3.1044.0`；`packages\ui\src\utils\remote-backup.ts` 直接 import；与 ARCH-04 同源
- **问题**：UI bundle 体积膨胀（[假设] > 200KB）；首屏加载变慢
- **度量方式**：`vite build` 后 `du -sh packages/web/dist/assets/*.js`；`packages/ui/dist` 体积对比移除前/后
- **建议**：与 ARCH-04 方案 B 一并解决（S3/WebDAV 抽到 core 或 desktop-only）
- **预期收益**：[假设] UI bundle 减重 > 200KB
- **是否需基准才能决策**：是，需对比移除前后体积

### [P1] PERF-02 `ModelManager.getModel` 每次加载全部模型 + JSON.parse

- **证据**：`packages\core\src\services\model\manager.ts:809-820`；与 R-07 同源
- **问题**：LLMService 每次请求都走这条路；流式场景下高频调用成为热点
- **度量方式**：在 `LLMService.sendMessageStream` 中加 `performance.now()` 计时；或用 `--prof` 跑长会话
- **建议**：内部维护 `Map<key, TextModelConfig>` 缓存，写操作失效
- **预期收益**：[假设] 单次 getModel 从 O(N) JSON.parse 降到 O(1) Map lookup
- **是否需基准才能决策**：是，需先确认实际调用频率

### [P2] PERF-03 Pro 路由非懒加载（已知）

- **证据**：FULL-AUDIT §3.4；ContextSystem/User 同步 import，增大首包
- **问题**：[假设] 首包体积增加
- **度量方式**：`vite build` 后分析 chunk
- **建议**：改 `() => import('...')`
- **预期收益**：[假设] 首包减重
- **是否需基准才能决策**：是

### [P2] PERF-04 Electron 启动序列化阻塞

- **证据**：`packages\desktop\main.js:127-143` 的 `safeSerialize` 用 `JSON.parse(JSON.stringify(obj))`；与 ARCH-14 同源
- **问题**：[假设] 大型 IPC 响应（如 `data-exportAllData`）序列化耗时长
- **度量方式**：在 IPC handler 加 timing log
- **建议**：改用 core 的 `safeSerializeForIPC`
- **预期收益**：[假设] 序列化速度提升
- **是否需基准才能决策**：是

### [P2] PERF-05 Paper 主题离线字体栈

- **证据**：`packages\ui\src\styles\paper.css`（Paper 主题用离线字体栈）
- **问题**：[假设] 离线字体在无网络环境下表现良好，但字体文件可能未随 asar 分发
- **度量方式**：检查 `app.asar` 是否含字体文件；离线环境实测
- **建议**：确认字体文件在 `files` 清单中
- **预期收益**：[假设] 离线体验一致
- **是否需基准才能决策**：否，需文件存在性检查

### [P2] PERF-06 长列表与流式输出

- **证据**：`packages\ui\src\components\OutputDisplay.vue`、`HistoryDrawer.vue`、`FavoriteManager.vue`
- **问题**：[假设] 长历史 / 长收藏 / 流式 token 累积时可能卡顿
- **度量方式**：构造 1000 条历史 / 10000 token 流式输出，测 FPS
- **建议**：评估虚拟滚动；流式输出用 `requestAnimationFrame` 批量更新
- **预期收益**：[假设] 滚动 FPS 提升
- **是否需基准才能决策**：是

---

## 7. 测试发布

### 7.1 测试金字塔现状（与 FULL-AUDIT §4.2 对照）

| 层 | 命令 | 现状 |
|----|------|------|
| Desktop config unit | `node --test packages/desktop/config/*.test.js` | 68/68 PASS |
| Desktop IPC 契约 | `node --test scripts/desktop-ipc-handlers.test.mjs` | 10/10 PASS（但反向断言缺失，见 SPEC-03） |
| Core 单测 | `pnpm -F @prompt-optimizer/core test` | 历史 21/21 PASS 抽样 |
| Core typecheck | `pnpm -F @prompt-optimizer/core typecheck` | 通过 |
| UI unit | `pnpm -F @prompt-optimizer/ui test` | 历史 834+ PASS |
| UI typecheck | `pnpm -F @prompt-optimizer/ui typecheck` | `build:types` 仍可能被 TemplateSelect 卡住（FULL-AUDIT §3.4） |
| Desktop local e2e smoke | `node scripts/desktop-local-e2e-smoke.cjs` | ALL CHECKS PASSED（source 模式） |
| Playwright gate | `pnpm test:e2e:gate` | 历史 12/12；本轮未重跑全量 |
| MCP test | `pnpm -F @prompt-optimizer/mcp-server test` | **CI 未跑**（SPEC-04） |
| check:docs | `pnpm check:docs` | 守卫过窄（DOC-17 / DOC-18） |

### 7.2 测试薄弱区（新增）

| 区域 | 现状 | 建议 |
|------|------|------|
| `packages/desktop/config/ipc/` 下 handler 行为 | 仅 `channel-manifest` 间接覆盖，`llm-handlers.js` / `data-handlers.js` / `history-handlers.js` / `image-handlers.js` 等无专属单测 | 在重构 A（R-01）时补 handler 层契约测试 |
| Electron 流式契约 | `preload-stream-cancellation.test.js` 覆盖取消语义，但**不覆盖 finish payload** | 增 `electron-proxy-finish-payload.test.ts` 断言 `onComplete` 收到 `{ content, reasoning, toolCalls }` |
| `image-understanding-understand` handler | 无单测、无契约、无 manifest 登记 | 与 S10 / SPEC-03 一并补 |
| 远程备份凭据流转 | 无 S3 / WebDAV 集成测试 | 在 sandbox mock 下补凭据经 IPC 的端到端测试 |
| Docker 部署烟测 | 无 | 增 `docker compose up` + `curl /healthz` + `curl -u user:pass /` 的 smoke 脚本 |
| 文档漂移自动检测 | 仅 2 条断言 | 见 §4.5 的 10 条扩展 |
| 依赖 CVE 扫描 | 无 | CI 加 `pnpm audit --prod --audit-level=high` |

### 7.3 发布流程漂移

- **release-notes.md** 推荐的 `pnpm release:notes:*` 命令在 `package.json` 中不存在（DOC-06）；真实 CLI 是 `node scripts/release-notes.js <new|check|check-entry|render-body> [version]`
- **sync-versions.js** 实际同步 2 个文件（extension manifest + desktop package.json），但 `version-sync.md` 只写 1 个（DOC-07）
- **Docker 镜像** 仍用上游 `linshen/prompt-optimizer:latest`（SPEC-08），与 fork release 渠道分裂
- **dev-app-update.yml** 指向上游 `linshenkx`（SPEC-07）

### 7.4 建议最小 CI 门禁

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
        with: { run_install: false }
      - uses: actions/setup-node@v6
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint                    # 新增
      - run: pnpm test:repo               # 修 SPEC-01 后
      - run: pnpm test:gate:core
      - run: pnpm test:gate:ui
      - run: pnpm -F @prompt-optimizer/mcp-server test    # 新增
      - run: pnpm audit --prod --audit-level=high         # 新增（B22）
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:gate:e2e
        env:
          E2E_VCR_MODE: replay
```

---

## 8. 30 / 60 / 90 天路线图

### 30 天（立刻可做，低风险高价值）

1. **DOC-01 ~ DOC-07**：HANDOFF 路径/分支/禁删清单/清理自检/release-notes 命令/version-sync 清单 —— 全部 ≤ 30 分钟/条，可一次性 PR
2. **SPEC-01**：删除 `package-scripts.test.mjs` 过期断言（≤ 30 分钟）
3. **SPEC-02**：删除 `build-desktop.bat` 或重写（≤ 15 分钟删除）
4. **SPEC-07**：`dev-app-update.yml` 改 fork owner（≤ 15 分钟）
5. **SPEC-10**：core `tsconfig.json` 移除矛盾配置（≤ 15 分钟）
6. **DOC-13**：HANDOFF §10 变更日志补 2026-07-20 条目（≤ 5 分钟）
7. **DOC-15**：`DOCS_POLICY.md` 补登 release-notes/version-sync 为 L1（≤ 5 分钟）
8. **S11**：MarkdownRenderer 错误分支改 `textContent` + DOMPurify 显式白名单（2-4 小时）
9. **S22**：Docker compose `ACCESS_PASSWORD` 强制必填（≤ 30 分钟）
10. **S12**：Nginx CSP 收紧（1 小时）
11. **R-02 / R-03**：LLMService / PromptService catch 双触发修复（≤ 1 小时）

### 60 天（架构与安全高杠杆）

1. **R-01 / 重构 A**：流式响应 IPC 契约修复（含 finish payload + catch 收敛 + 测试，1-2 天）
2. **S10**：IPC 全量 secure 化（按 handler 分文件提交，1-2 天）
3. **SPEC-03**：channel-manifest 反向契约 + 补登漏登 channel（1-2 小时）
4. **SPEC-04 + SPEC-05**：CI 加 lint / mcp:test / develop 分支构建 Docker（1 小时 + 30 分钟）
5. **SPEC-06**：Electron BrowserWindow `sandbox: true`（1 小时含验证）
6. **ARCH-08 / S5**：web `vite.config.ts` 仅 define `VITE_APP_*` / `VITE_PUBLIC_*`（1 小时）
7. **S13 / S20**：/healthz 收紧 + MCP loopback 强制 token（1 小时）
8. **S16 / S17 / S18**：Docker 容器硬化（htpasswd 权限 + .dockerignore + supervisord 降权，3-4 小时）
9. **DOC-08 / DOC-09 / DOC-10 / DOC-20**：archives/developer/HANDOFF §2.2 索引重写（2 小时）
10. **重构 B**：DataManager 收编 Favorites（1-2 天）
11. **DOC-17 / DOC-18**：扩展 `check:docs` 断言（2 小时）

### 90 天（结构性优化，跨多 PR）

1. **重构 C**：PromptService 流式方法去重（1-2 天）
2. **ARCH-03**：UI 不再 re-export core；web/extension/desktop-renderer 直接 deps core（拆 3-5 个 PR，1 周）
3. **ARCH-04 / PERF-01**：远程备份抽到 core；UI 移除 `@aws-sdk/client-s3`（1 周）
4. **ARCH-05 / ARCH-07 / ARCH-12**：抽 ServiceContainer + quit-flow + 错误信封统一（1 周）
5. **ARCH-02 / ARCH-13**：AdapterRegistry 公开注册 + Electron 分支移出 core（3-5 天）
6. **ARCH-06**：IPC channel schema codegen（1 周）
7. **S19**：safeStorage 集成 + 凭据迁移（1-2 天）
8. **S23**：api/auth.js 全局限速（半天）
9. **R-14**：评估服务判别联合类型（需评估域设计文档，1-2 周）

---

## 9. 不建议做（Won't do）

| # | 项 | 不做的原因 |
|---|---|----------|
| W1 | 重写 `packages/core/src/services/evaluation/service.ts` 的判别联合类型 | 3000+ 行，已有大量 `*-json-injection.test.ts` 守护；任何 narrow 改动都牵动评估模板、前端展示、evidence JSON 格式与 30+ 个测试。需要专门的评估域设计文档，不在「最小变更」范围内。R-14 标注的 `as any` 是真问题，但除非有明确需求驱动，否则只做表面清理（移除 console.log）。 |
| W2 | 改 `packages/core/src/services/model/converter.ts` + `metadata-resolver.ts` + `manager.ts` 的迁移/兜底链路 | 项目最复杂的迁移逻辑；已有 `migration.integration.test.ts` + `config-conversion.test.ts` + `import-export.test.ts` 严密守护。R-06 / R-07 / R-08 都是真实问题，但修任何一个都需要完整跑迁移测试矩阵，且容易引入数据丢失回归。建议先补 e2e 烟测再动刀。 |
| W3 | 「简化」`packages/desktop/preload.js` 的流式事件监听注册顺序与 `createStreamAbortRace` | 看似重复，实则是为了正确处理：(1) 主进程在 invoke 返回前就发 finish 事件；(2) AbortSignal 触发时清理 listener；(3) 多个并发流不串台。`preload-stream-cancellation.test.js` 已覆盖取消语义。重构 A 必然要动这里（加 payload），但**不要顺手"简化"事件注册顺序**——一旦破坏取消语义，桌面端取消按钮会失效。只改 `finishListener` 接收 payload 这一行。 |
| W4 | 重开上游 PR #324 / #325–#330 / #332–#337 | CURRENT.md 明确 fork-only；上游已关闭；本轮不重开贡献。 |
| W5 | 商用代码签名 NSIS | 本机已能打未签名包；签名需证书/CI；本轮不做。 |
| W6 | Playwright extended 常驻 CI | gate 已 12/12；extended 非日常门禁；本轮不做。 |
| W7 | Node engines 扩大到 24 | 当前 `^22.0.0`；扩大需测试矩阵；本轮不做。 |
| W8 | 批量搬动 `docs/archives/**` 到新位置 | 方案 C 明令 L2 冻结；archives 索引重写（DOC-08/09）即可，不搬文件。 |
| W9 | 重做 Diátaxis 巨册 | 已采用方案 C（双层 SSOT + L2 冻结）；不推翻做 Diátaxis。 |
| W10 | Paper 深色变体 | CURRENT.md 明确「可以做但不本轮」；Paper 已合入并装入 app，本轮不做深色变体。 |

---

## 10. 与 FULL-AUDIT-2026-07-20 差分

### 10.1 新发现（本轮增量）

| 类别 | ID | 摘要 |
|------|----|------|
| 架构 | ARCH-01 ~ ARCH-14 | 14 条（4 P0 + 7 P1 + 3 P2），其中 ARCH-01 流式 IPC 截断、ARCH-02 三套装配策略、ARCH-08 web VITE_* 注入、ARCH-12 退出流程双写为新 P0/P1 |
| 规范 | SPEC-01 ~ SPEC-14 | 14 条（2 P0 + 6 P1 + 6 P2），其中 SPEC-01 `package-scripts.test.mjs` 断言与实际 scripts 不对齐、SPEC-02 `build-desktop.bat` 引用不存在目录、SPEC-03 `release-notes.md` 推荐的 `pnpm release:notes:*` 命令在 package.json 中不存在为新 P0 |
| 文档 | DOC-01 ~ DOC-20 | 20 条（3 P0 + 9 P1 + 8 P2），其中 DOC-01 HANDOFF §6/§7 路径漂移、DOC-02 release-notes 命令漂移、DOC-03 CURRENT.md 缺字段为新 P0 |
| 安全 | S10 ~ S23 | 14 条（4 P0 + 6 P1 + 4 P2），其中 S10 8 类 IPC handler 裸 ipcMain.handle、S11 MarkdownRenderer innerHTML XSS、S22 Docker ACCESS_PASSWORD 默认空、S23 Vercel per-isolate 限速失效为新 P0 |
| 代码 | R-01 ~ R-24 | 24 条（3 P0 + 11 P1 + 10 P2），其中 R-01 onFinish 不传 payload、R-02 catch 双触发、R-03 testCustomConversationStream 调用方与实现签名不匹配为新 P0 |
| 性能 | PERF-01 ~ PERF-06 | 6 条（1 P0 + 3 P1 + 2 P2），PERF-04 UI bundle @aws-sdk/client-s3 膨胀为新 P0（与 ARCH-04 同源） |

### 10.2 已修复项确认（FULL-AUDIT 已关闭，本轮仍有效）

| 原 ID | 摘要 | 证据 |
|-------|------|------|
| S1 | Cookie 改 HMAC（Vercel 会话） | `api/auth.js` 的 `verifySession` 使用 `timingSafeEqual` + HMAC；`api/access-session.js` 配合 |
| S2 | Docker public 模式过滤敏感字段 | `scripts/generate-config-public-filter.mjs` + `docker/generate-config.js` 已实现字段白名单 |
| S6 | icons 打入 asar | `packages/desktop/build-desktop.bat` 与 `electron-builder.yml` 的 `asarUnpack` 不再列 `resources/icons`；安装目录 `app/resources/icons` 已删除 |
| A1 修复尝试 | secure IPC 注册器落地 | `packages/desktop/config/ipc/llm-handlers.js` 使用 `registerSecureIpcHandler`；其余 8 类 handler 仍裸 `ipcMain.handle`（见 S10） |
| HANDOFF 路径 | 部分修正 | `docs/PROJECT_HANDOFF.md` §3/§4 已对齐 `D:\PromtOptimizer`，但 §6/§7 仍指向上游路径（见 DOC-01） |
| 版本同步 | 2.11.7 落地 | `package.json` + `packages/*/package.json` + `CURRENT.md` 版本一致（`pnpm version:sync` 守护） |
| check:docs | 基础断言上线 | `scripts/check-docs-current-version.mjs` + `check-docs-freeze-banners.mjs` 已纳入 `test:repo`；本轮建议扩展到 9 条（见 DOC-15） |

### 10.3 仍开放项（FULL-AUDIT 未关闭，本轮再次确认）

| 原 ID | 摘要 | 本轮状态 | 本轮对应条目 |
|-------|------|---------|------------|
| A1 | Electron IPC 全量 secure 化 | 仍开放：仅 llm-handlers 落地 | S10 / ARCH-02 / R-19 |
| A2 | 流式响应 IPC 契约 | 仍开放：onFinish 不传 payload | ARCH-01 / R-01 / R-03 |
| A3 | UI 类型门禁（TemplateSelect 等） | 仍开放：`build:types` 仍可能卡 | SPEC-07 / R-21 |
| A4 | 远程备份两套实现 | 仍开放：UI 与 desktop 各一份 | ARCH-04 |
| A5 | IPC channel-manifest 漏登 | 仍开放：image-understanding-understand 等漏登 | ARCH-06 |
| S3 | Docker `VITE_*` 注入 | 仍开放：`docker/generate-config.js` 仍把所有 `VITE_*` 写入客户端 | S12（CSP）/ ARCH-08（web 同源） |
| S4 | IPC `shell.openPath` 滥用 | 仍开放：`system-openPath` 等无白名单 | S10 / R-19 |
| S5 | web `VITE_*` 注入 bundle | 仍开放：`vite.config.ts` define 不过滤 | ARCH-08 |
| S7 | `createDetailedErrorResponse` 泄露 stack trace | 仍开放：仍在 main.js:752-815 | ARCH-07 |
| S8 | MCP `modelKey: 'mcp-default'` 无历史链 | 仍开放：`iteratePrompt(prompt, prompt, ...)` 语义可疑 | ARCH-09 |
| S9 | MarkdownRenderer 错误分支 innerHTML | 仍开放：line 262-278 | S11 |
| S15 | `data-importAllData` 覆盖本地数据 | 仍开放：无二次确认 | S10 子集 |
| S17 | Docker `supervisord` root 运行 | 仍开放：`supervisord.conf:3` | S18 |
| S19 | `generate-auth.sh` chmod a+r | 仍开放：line 28 | S16 |

---
## 11. 证据索引

> 仅收录本报告引用的关键路径与行号锚点。完整证据散见各条目正文。

### 11.1 架构证据

| ID | 路径 | 行号锚点 |
|----|------|---------|
| ARCH-01 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\electron-proxy.ts` | 49, 72 |
| ARCH-01 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\prompt\service.ts` | optimizePromptStream 的 onComplete |
| ARCH-02 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\service.ts` | 392-404 |
| ARCH-02 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js` | 675-690, 885-892 |
| ARCH-03 | `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\index.ts` | 168-211 |
| ARCH-03 | `D:\PromtOptimizer\src\prompt-optimizer\packages\web\package.json` | 16-19 |
| ARCH-03 | `D:\PromtOptimizer\src\prompt-optimizer\packages\extension\package.json` | 14-17 |
| ARCH-04 | `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\utils\remote-backup.ts` | 1-8, 1545-1716 |
| ARCH-04 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\remote-storage.js` | 1-9, 30-44, 172-486 |
| ARCH-05 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js` | 179-182, 572-709, 819-837 |
| ARCH-06 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\channel-manifest.js` | 25-247, 41-64, 83 |
| ARCH-06 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\preload.js` | 192-1685 |
| ARCH-07 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js` | 711-815, 752-815 |
| ARCH-07 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\preload.js` | 48-83 |
| ARCH-08 | `D:\PromtOptimizer\src\prompt-optimizer\packages\web\vite.config.ts` | 11-14, 51-63, 65-73 |
| ARCH-08 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\runtime-security.js` | 1-29 |
| ARCH-09 | `D:\PromtOptimizer\src\prompt-optimizer\packages\mcp-server\src\index.ts` | 234-246, 353-359 |
| ARCH-09 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js` | 679-686 |
| ARCH-10 | `D:\PromtOptimizer\src\prompt-optimizer\packages\web\vite.config.ts` | 51-63 |
| ARCH-10 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\package.json` | 9-19 |
| ARCH-11 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\storage\factory.ts` | 13-14, 22-53 |
| ARCH-12 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js` | 516-563, 1041-1085, 1080 |
| ARCH-13 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\registry.ts` | 完整文件 |
| ARCH-14 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\llm-handlers.js` | registerSecureIpcHandler |

### 11.2 规范证据

| ID | 路径 | 行号锚点 |
|----|------|---------|
| SPEC-01 | `D:\PromtOptimizer\src\prompt-optimizer\scripts\package-scripts.test.mjs` | 38-46 |
| SPEC-02 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\build-desktop.bat` | 10, 19, 23 |
| SPEC-03 | `D:\PromtOptimizer\src\prompt-optimizer\docs\project\release-notes.md` | release:notes:* 命令段 |
| SPEC-04 | `D:\PromtOptimizer\src\prompt-optimizer\package.json` | scripts 段 |
| SPEC-05 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\runtime-security.js` | 1-29 |
| SPEC-06 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\channel-manifest.js` | 25-247 |
| SPEC-07 | `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\components\TemplateSelect.vue` | 完整文件 |
| SPEC-08 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\service.ts` | 152-157, 189-194 |
| SPEC-09 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\model\manager.ts` | 38-42, 809-820, 1235 |
| SPEC-10 | `D:\PromtOptimizer\src\prompt-optimizer\scripts\check-locale-parity.mjs` | 完整文件 |
| SPEC-11 | `D:\PromtOptimizer\src\prompt-optimizer\scripts\check-no-chinese-runtime.mjs` | 完整文件 |
| SPEC-12 | `D:\PromtOptimizer\src\prompt-optimizer\packages\web\vite.config.ts` | 11-14, 65-73 |
| SPEC-13 | `D:\PromtOptimizer\src\prompt-optimizer\electron-builder.yml` | asarUnpack 段 |
| SPEC-14 | `D:\PromtOptimizer\src\prompt-optimizer\scripts\run-many.js` | 完整文件 |

---
### 11.3 代码证据

| ID | 路径 | 行号锚点 |
|----|------|---------|
| R-01 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\electron-proxy.ts` | 49, 72 |
| R-02 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\service.ts` | 152-157, 189-194, 392-404 |
| R-03 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\prompt\service.ts` | 1196-1216 |
| R-04 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\data\manager.ts` | 67-94, 130-137 |
| R-05 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\model\manager.ts` | 1235 |
| R-06 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\model\manager.ts` | 38-42 |
| R-07 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\model\manager.ts` | 809-820 |
| R-08 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\model\converter.ts` | 完整文件 |
| R-09 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\evaluation\service.ts` | 判别联合分支 |
| R-10 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js` | 885-892 |
| R-11 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\preload.js` | 48-83 |
| R-12 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js` | 711-815 |
| R-13 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\service.ts` | 392-404 |
| R-14 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\evaluation\service.ts` | as any 段 |
| R-15 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\prompt\service.ts` | optimizePromptStream |
| R-16 | `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\components\MarkdownRenderer.vue` | 66-81, 262-278 |
| R-17 | `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\utils\remote-backup.ts` | normalizeObjectPath |
| R-18 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\remote-storage.js` | 30-44 |
| R-19 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\` | 8 类 handler 文件 |
| R-20 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js` | 516-563, 1041-1085 |
| R-21 | `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\components\TemplateSelect.vue` | 完整文件 |
| R-22 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\storage\factory.ts` | 13-14, 22-53 |
| R-23 | `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\utils\remote-backup.ts` | 1545-1716 |
| R-24 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\llm\electron-proxy.ts` | 49, 72 |

### 11.4 文档证据

| ID | 路径 | 锚点 |
|----|------|------|
| DOC-01 | `D:\PromtOptimizer\src\prompt-optimizer\docs\PROJECT_HANDOFF.md` | §6, §7 |
| DOC-02 | `D:\PromtOptimizer\src\prompt-optimizer\docs\project\release-notes.md` | release:notes:* 段 |
| DOC-03 | `D:\PromtOptimizer\src\prompt-optimizer\docs\project\CURRENT.md` | 缺少 main.js 行数 / IPC channel 计数 |
| DOC-04 | `D:\PromtOptimizer\README.md` | 安装路径段 |
| DOC-05 | `D:\PromtOptimizer\src\prompt-optimizer\docs\DOCS_POLICY.md` | L0/L1/L2 分层 |
| DOC-06 | `D:\PromtOptimizer\docs\FULL-AUDIT-REPORT-2026-07-20.md` | §0, §2.8 |
| DOC-07 | `D:\PromtOptimizer\src\prompt-optimizer\docs\project\` | archives/ 目录 |
| DOC-08 | `D:\PromtOptimizer\src\prompt-optimizer\docs\archives\` | 索引文件 |
| DOC-09 | `D:\PromtOptimizer\src\prompt-optimizer\docs\project\CURRENT.md` | scripts 段 |
| DOC-10 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\README.md` | IPC 段 |
| DOC-11 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\README.md` | services 目录 |
| DOC-12 | `D:\PromtOptimizer\src\prompt-optimizer\packages\mcp-server\README.md` | 历史链段 |
| DOC-13 | `D:\PromtOptimizer\src\prompt-optimizer\docs\project\` | 缺 ipc-contract.md |
| DOC-14 | `D:\PromtOptimizer\src\prompt-optimizer\docs\project\` | 缺 storage-key-architecture.md L1 |
| DOC-15 | `D:\PromtOptimizer\src\prompt-optimizer\scripts\check-docs-current-version.mjs` | 完整文件 |
| DOC-16 | `D:\PromtOptimizer\src\prompt-optimizer\scripts\check-docs-freeze-banners.mjs` | 完整文件 |
| DOC-17 | `D:\PromtOptimizer\src\prompt-optimizer\docs\project\CURRENT.md` | 主题段 |
| DOC-18 | `D:\PromtOptimizer\src\prompt-optimizer\docs\project\CURRENT.md` | 分支策略段 |
| DOC-19 | `D:\PromtOptimizer\src\prompt-optimizer\docs\project\` | 缺 release-runbook.md |
| DOC-20 | `D:\PromtOptimizer\src\prompt-optimizer\docs\project\` | 缺 testing-strategy.md |

---
### 11.5 安全证据

| ID | 路径 | 行号锚点 |
|----|------|---------|
| S10 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\data-handlers.js` | 裸 ipcMain.handle |
| S10 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\image-handlers.js` | 裸 ipcMain.handle |
| S10 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\model-handlers.js` | 裸 ipcMain.handle |
| S10 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\context-handlers.js` | 裸 ipcMain.handle |
| S10 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\favorite-handlers.js` | 裸 ipcMain.handle |
| S10 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\update-handlers.js` | 裸 ipcMain.handle |
| S10 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\system-handlers.js` | 裸 ipcMain.handle |
| S10 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\remote-storage-handlers.js` | 裸 ipcMain.handle |
| S10 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\llm-handlers.js` | registerSecureIpcHandler（对照） |
| S11 | `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\components\MarkdownRenderer.vue` | 66-81, 262-278 |
| S12 | `D:\PromtOptimizer\src\prompt-optimizer\docker\nginx.conf` | 12（CSP） |
| S13 | `D:\PromtOptimizer\src\prompt-optimizer\docker\generate-config.js` | VITE_* 白名单段 |
| S14 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\preload.js` | system-openPath / shell.openPath 段 |
| S15 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\data-handlers.js` | data-importAllData |
| S16 | `D:\PromtOptimizer\src\prompt-optimizer\docker\generate-auth.sh` | 28 |
| S17 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\main.js` | createDetailedErrorResponse: 752-815 |
| S18 | `D:\PromtOptimizer\src\prompt-optimizer\docker\supervisord.conf` | 3, 29-33 |
| S19 | `D:\PromtOptimizer\src\prompt-optimizer\packages\ui\src\utils\remote-backup.ts` | normalizeObjectPath |
| S20 | `D:\PromtOptimizer\src\prompt-optimizer\packages\core\src\services\model\manager.ts` | model-addModel 写入含 apiKey 配置 |
| S21 | `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\update-handlers.js` | electron-updater feedURL |
| S22 | `D:\PromtOptimizer\src\prompt-optimizer\docker\generate-auth.sh` | ACCESS_PASSWORD 默认空校验 |
| S23 | `D:\PromtOptimizer\src\prompt-optimizer\api\auth.js` | per-isolate 限速段 |

---

## 附录 A. 技术栈事实表

| 维度 | 事实 | 证据 |
|------|------|------|
| 包管理 | pnpm@10.6.1（`packageManager` 字段约束） | `package.json:5` |
| Node 引擎 | `^22.0.0`（npm/yarn 明确拒绝） | `package.json:6-10` |
| 版本 | 2.11.7（SSOT 一致） | `package.json:3` + `CURRENT.md` |
| 许可证 | AGPL-3.0-only | `package.json:84` |
| Monorepo 包 | core / ui / web / extension / desktop / mcp-server | `pnpm-workspace.yaml` |
| 前端框架 | Vue 3 + Vite + Naive UI + Tailwind | `packages/ui/package.json` + `packages/web/vite.config.ts` |
| 桌面框架 | Electron + electron-builder | `packages/desktop/package.json` + `electron-builder.yml` |
| 测试 | vitest（unit）+ Playwright（e2e）+ `node --test`（repo scripts） | `package.json:36-50` |
| Lint/Typecheck | ESLint + Prettier + TypeScript | `package.json:64-73` |
| CI 闸门 | `test:gate` = `test:repo` + `test:gate:core` + `test:gate:ui` | `package.json:46` |
| E2E 闸门 | `test:e2e:gate`（gate 组 12/12）；extended 非日常 | `package.json:38-39` |
| 部署 | Docker（nginx + Basic Auth + supervisord）+ Vercel（边缘函数）+ Cloudflare（可选） | `docker/` + `api/` |
| MCP | 独立进程（`@modelcontextprotocol/sdk`） | `packages/mcp-server/package.json` |
| 文档政策 | 方案 C（双层 SSOT + L2 冻结） | `docs/DOCS_POLICY.md` |
| 配置注入 | desktop: `runtime-security.js` 白名单；web: 全量 `VITE_*` 注入 | `runtime-security.js:1-29` + `vite.config.ts:11-14` |
| Fork 策略 | `xvyimu/prompt-optimizer`（fork-only，不重开上游） | `CURRENT.md` 分支策略段 |
| 安装根 | `D:\PromtOptimizer\app`（NSIS + `app.asar`） | `FULL-AUDIT-REPORT-2026-07-20.md:11` |

---

## 附录 B. 子代理合并说明

| 子代理 | 输出条目数 | 合并后保留 | 剔除 / 降级 |
|--------|----------|----------|------------|
| 架构 | 14 条 | 14 条（ARCH-01~14） | 无剔除；ARCH-05/06/07 从 P0 降为 P1（大重构默认降级） |
| 规范 | 16 条 | 14 条（SPEC-01~14） | 剔除 2 条：基于「`packages/web/` 缺失」误报（LS 40000 字符截断） |
| 代码 | 24 条 | 24 条（R-01~24） | 无剔除；R-01/02/03 升为 P0（流式契约影响桌面端正确性） |
| 文档 | 22 条 | 20 条（DOC-01~20） | 剔除 2 条：与 ARCH-04 / S19 重复 |
| 安全 | 14 条 | 14 条（S10~S23） | 无剔除；S10/S11/S22/S23 升为 P0 |
| 性能（可选） | 6 条 | 6 条（PERF-01~06） | 无剔除；PERF-04 与 ARCH-04 同源 |
| **合计** | **96 条** | **92 条** | **剔除 4 条** |

**合并方法**：
1. 五个子代理并行扫描，各自产出独立草稿。
2. 总控用 Glob / Read 复核每条 P0/P1 证据路径，剔除无证据或基于工具截断误判的条目。
3. 大重构类条目（ARCH-05 ServiceContainer、ARCH-06 schema-first IPC、ARCH-13 Adapter Registry）默认从 P0 降为 P1，避免「重写蓝图」倾向。
4. 与 FULL-AUDIT-2026-07-20 做差分：已修项移入 §10.2，仍开放项移入 §10.3，新发现移入 §10.1。
5. 最终报告严格遵循「证据 + 影响 + 动作 + 工作量 + 可否独立 PR」五字段格式。

**关键复核动作**：
- 规范代理与文档代理基于 LS 工具输出截断误判「`packages/web/` 缺失」，衍生出多条 P0 误报。总控用 Glob 复核确认 `packages/web/package.json`、`vite.config.ts`、`src/App.vue`、`dist/index.html` 等均存在，剔除所有基于「web 缺失」的误报。
- 安全代理的 S10（IPC 裸 handle）与架构代理的 ARCH-02（三套装配策略）有重叠：合并时 S10 专注「8 类 handler 未走 secure 注册」，ARCH-02 专注「image-understanding-understand 内联在 main.js」，互不重复。
- 代码代理的 R-01（onFinish 不传 payload）与架构代理的 ARCH-01 同源：合并时 ARCH-01 专注「IPC 契约设计」，R-01 专注「补丁思路与 diff 预估」，互不重复。

---

> 报告结束。所有建议均附证据路径，未改代码、未 git push、未删除任何文件。
