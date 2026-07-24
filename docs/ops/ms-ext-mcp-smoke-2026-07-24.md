# MS-EXT-MCP-SMOKE · 扩展 / MCP 入口冒烟 · 2026-07-24

> **模块：** `M-MS-ext-mcp-smoke-docs`  
> **范围：** 浏览器扩展加载路径 + MCP server 工具面/测试门；**不换栈**、不改业务源码。  
> **基线：** `develop` @ **`221b767`**（`docs(ops): MS residual deps card 2026-07-25`）。  
> **分支：** `xvyimu/ms-ext-mcp-smoke-docs`  
> **禁止已守：** `git push develop` · asar · Tauri · React 平行 UI · 假绿 · 大爆炸换栈。

## 结论

| 项 | 值 |
|----|-----|
| 形态 | Desktop Electron 主交付；**扩展 / MCP 为并列入口**（`docs/PROJECT.md`） |
| 领域边界 | 业务在 **`@mindsync/core`**；扩展壳 `@mindsync/ui`；MCP 经 `CoreServicesManager` 调 core |
| MCP 既有测 | **`pnpm -F @mindsync/mcp-server test` → exit 0 · 39 passed**（须先 `core build`） |
| Extension 既有测 | **无 test 文件** → vitest **exit 1**（非回归；与 day-quality 一致） |
| Extension typecheck | **`vue-tsc` 不在包 PATH** → exit 1（既有工具链缺口，非本刀范围） |
| 本刀动作 | **仅文档 + 实跑 evidence** · 未改 package / lock / 源码 |

**交付态：** 扩展加载与 MCP 冒烟路径已落档；MCP 单测绿；扩展无可测文件与 typecheck 缺口已写明。  
**风险一句：** 扩展 `typecheck`/`test` 不能当合入绿；MCP 测依赖 **先 build core**，否则 `@mindsync/core` resolve 失败假红。

---

## 1. Scout · 边界

### 1.1 `@mindsync/extension`

| 项 | 路径 / 命令 |
|----|-------------|
| 包 | `packages/extension` · scope `@mindsync/extension` |
| 依赖 | `workspace:@mindsync/core` · `workspace:@mindsync/ui` · `vue` |
| UI 入口 | `src/main.ts` → `App.vue` → **`PromptOptimizerApp`（`@mindsync/ui`）** |
| 背景页 | `public/background.js`（MV3 service worker） |
| Manifest | `public/manifest.json` · **MV3** · version **2.11.7** · `permissions: []` |
| 构建产物 | `packages/extension/dist`（`copyPublicDir` 拷入 manifest / icons / background） |
| Dev | `pnpm dev:ext` → Vite **HTTPS :5174**（`base: './'`） |
| Build | `pnpm build:ext` ≡ `pnpm -F @mindsync/extension build` |
| 上架包 | ZIP **`dist/` 根含 manifest.json**（见 `publish-guide.md`） |
| 密钥扫 | `pnpm check:extension-release-secrets` → 默认扫 `packages/extension/dist` |

**加载路径（Chrome / Edge 未打包）：**

1. `pnpm build:core && pnpm build:ui && pnpm build:ext`（或 monorepo `pnpm build` 并行 web+ext）  
2. 浏览器 → 扩展管理 → **加载已解压的扩展程序**  
3. 目录选 **`packages/extension/dist`**  
4. 点扩展图标 → `background.js` 打开 `chrome.runtime.getURL('index.html')` 新标签  
5. 工作台由 UI 包路由/服务初始化（与 Web 共享领域层，**勿在 extension 复制 core 业务**）

**Dev 旁路：** `pnpm dev:ext` 可在浏览器直接打开 Vite 页做 UI 联调；**正式扩展行为以 dist + 未打包加载为准**（service worker / `chrome.*` API 需扩展上下文）。

### 1.2 `@mindsync/mcp-server`

| 项 | 路径 / 命令 |
|----|-------------|
| 包 | `packages/mcp-server` · scope `@mindsync/mcp-server` · version `0.1.0` |
| 依赖 | `@modelcontextprotocol/sdk` · **`@mindsync/core` workspace** · express · dotenv |
| 入口库 | `src/index.ts`（`main` / 工具注册 / HTTP+stdio） |
| 启动 | `src/start.ts` → `main()`；bin `bin/prompt-optimizer-mcp.cjs` → `dist/start.cjs` |
| Core 适配 | `src/adapters/core-services.ts` · **单例** `CoreServicesManager` |
| 传输 | **stdio** · **Streamable HTTP**（默认 `http://127.0.0.1:3000/mcp`） |
| 健康 | `GET /healthz` → `{ ok: boolean }`（无 auth；失败 503） |
| 用户文档 | `docs/user/mcp-server.md` · 包内 `packages/mcp-server/README.md` |

**工具面（3）：**

| Tool | 必填参数 | 用途 |
|------|----------|------|
| `optimize-user-prompt` | `prompt` | 用户提示词优化 |
| `optimize-system-prompt` | `prompt` | 系统提示词优化 |
| `iterate-prompt` | `prompt`, `requirements` | 在既有提示上按需求迭代（可选 `lastOptimized`） |

**Core 边界（MCP 只装配、不复制业务）：**

- `MemoryStorageProvider` + `createModelManager` / `createLLMService` / `createTemplateManager` / `createHistoryManager` / `createPromptService` / `createImageUnderstandingService` / `createTextAdapterRegistry`
- 模板枚举来自 core 模板管理器（`config/templates.ts`）
- 参数校验 / 错误码 / 结构化结果在 `adapters/*`；**LLM 真调用需真实 API key**（单测不打外网）

**根快捷脚本：**

```text
pnpm mcp:build   # filter build
pnpm mcp:dev     # dist start HTTP + preload-env
pnpm mcp:start   # 生产式 HTTP
pnpm mcp:test    # vitest run
```

### 1.3 与 core 的依赖边界（摘要）

```text
@mindsync/core          ← 领域 SSOT
       ↑
       ├── @mindsync/ui ──→ @mindsync/extension（壳 + PromptOptimizerApp）
       └── @mindsync/mcp-server（CoreServicesManager 装配 + MCP tools）
```

- 扩展 **不** 直接实现优化逻辑；MCP **不** 在包内重写 prompt 算法。  
- 测 / type-check MCP **前必须** `pnpm -F @mindsync/core build`（exports 指向 dist）。

---

## 2. 怎么冒烟

### 2.1 MCP · 机器冒烟（本刀验收）

```powershell
# 在 monorepo 根
pnpm -F @mindsync/core build
pnpm -F @mindsync/mcp-server test
pnpm -F @mindsync/mcp-server type-check
pnpm -F @mindsync/mcp-server lint
```

可选 live（需 `.env.local` 至少一个 `VITE_*_API_KEY`，**本刀未跑 live**）：

```powershell
pnpm mcp:build
pnpm mcp:start
# 另窗：curl http://127.0.0.1:3000/healthz
# 客户端指向 http://127.0.0.1:3000/mcp ；非回环须 MCP_AUTH_TOKEN
```

### 2.2 Extension · 加载冒烟（人工 / 可选）

```powershell
pnpm -F @mindsync/core build
pnpm -F @mindsync/ui build
pnpm build:ext
# 可选：pnpm check:extension-release-secrets
```

Chrome：`chrome://extensions` → 开发者模式 → 加载已解压 → 选 `packages/extension/dist` → 点图标开工作台。

### 2.3 已知缺口（勿假绿）

| 缺口 | 现状 | 处理建议 |
|------|------|----------|
| extension **无** `*.test.ts` / `*.spec.ts` | `pnpm -F @mindsync/extension test` → **exit 1** | 文档记缺口；根 `test:unit` 用 `--passWithNoTests` 才吞掉 |
| extension `typecheck` | `vue-tsc` **不在** 该包 PATH（缺 devDep 解析）→ **exit 1** | 与 day-quality #20 同；单独立项补 `vue-tsc` 或 hoisted bin |
| MCP 未先 build core | resolve `@mindsync/core` 失败 · suite fail | **先** `core build`（本卡默认顺序） |
| MCP live 工具 | 单测不调用真 LLM | 手测 / 客户端接 `/mcp` 另卡 |
| manifest `homepage_url` / author 仍上游痕迹 | 历史 fork 字段 | 不在本刀改；identity 另卡 |
| 扩展 E2E | 本日不跑 Playwright 重矩阵 | 与 day-quality 一致 |

---

## 3. Evidence · 实跑 exit（本 worktree）

| # | 命令 | Exit | 结果 |
|---|------|-----:|------|
| 0 | `git rev-parse --short HEAD`（开工） | 0 | **`221b767`** · `xvyimu/ms-ext-mcp-smoke-docs` |
| 1 | `pnpm -F @mindsync/core build` | **0** | tsup cjs/esm + dts |
| 2 | `pnpm -F @mindsync/mcp-server test`（core build 后） | **0** | **6 files · 39 passed** |
| 3 | `pnpm -F @mindsync/mcp-server type-check` | **0** | `tsc --noEmit` |
| 4 | `pnpm -F @mindsync/mcp-server lint` | **0** | eslint src |
| 5 | `pnpm -F @mindsync/mcp-server test`（**未** build core，对照） | **1** | 2 suites fail · core resolve（**预期**） |
| 6 | `pnpm -F @mindsync/extension test -- --run` | **1** | **No test files found**（预期缺口） |
| 7 | `pnpm -F @mindsync/extension typecheck` | **1** | `'vue-tsc' is not recognized`（既有） |

**对照套件（mcp-server/tests）：**  
`environment` · `health` · `http-security` · `language-service` · `structured-result` · `tools`（参数校验 / 错误映射；**无**真 LLM）。

**时间戳：** 2026-07-24 14:52–14:53 +08:00 · worktree `ms-ext-mcp-smoke-docs`。

---

## 4. 变更清单

| 路径 | 动作 |
|------|------|
| `docs/ops/ms-ext-mcp-smoke-2026-07-24.md` | 新增（本文） |
| `docs/ops/ms-ext-mcp-smoke-progress.md` | 新增（进度条） |

业务 / package / lock：**未改**。

---

## 5. 总控接手

- 审 docs 后可 **push feature tip** `xvyimu/ms-ext-mcp-smoke-docs`（**勿** push `develop`）。  
- 扩展 `vue-tsc` PATH / 首批 unit 另开刀。  
- MCP live `/healthz` + 客户端三工具手测可选跟进。
