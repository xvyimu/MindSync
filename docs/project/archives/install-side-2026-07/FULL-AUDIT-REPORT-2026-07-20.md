# PromptOptimizer 全面检查报告

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-20 |
| 源码 | `D:\PromtOptimizer\src\prompt-optimizer` |
| 分支 / tip | `develop` @ `d99da52`（本报告执行中另有 icons 打包修复） |
| 版本 | Desktop **2.11.7** |
| Fork | `xvyimu/prompt-optimizer`（**fork-only**，默认不重开上游 PR） |
| 上游 | `linshenkx/prompt-optimizer`（remote `upstream`） |
| 本机安装 | **`D:\PromtOptimizer\app`**（NSIS + `app.asar`） |
| 许可证 | AGPL-3.0-only |
| 包管理 | pnpm@10.6.1 · Node engines `^22`（本机构建常用 portable Node 22） |

> 本报告基于源码、安装产物与本地验证。子角色审计并行进行时，结论以本文件与源码事实为准。

---

## 0. 执行摘要

Prompt Optimizer 是**客户端优先**的 AI 提示词优化工具：核心业务在浏览器/Electron 渲染进程 + `core` 领域库中完成；模型 API Key 由用户配置并**直连**各厂商；可选 Docker/Vercel/Cloudflare 仅提供静态托管 + 轻量访问门闩；MCP 为独立服务进程。

**当前产品态（fork develop）健康：**

| 维度 | 结论 |
|------|------|
| 架构 | 清晰 monorepo：core / ui / web / desktop / extension / mcp-server |
| 桌面安全 | IPC 域拆分 + sender 信任校验 + stream 所有权取消；配置单测 68/68 |
| 功能 | Basic / Pro / Image 工作区、评估、收藏、历史、主题（含 **纸感 Paper**） |
| 构建 | UI `build:bundle` + desktop `build:ci` 可交付；`build:types` 仍可能被 TemplateSelect 卡住 |
| 安装 | `D:\PromtOptimizer\app` 含 Paper 主题；**2026-07-20 已热修 asar 内 icons** |
| 债务 | Docker `VITE_*` 注入、Cookie=明文口令、IPC 未全量 secure、图像不可停、UI 类型门禁、文档滞后 |

**本轮推荐方案（已执行 / 见 §9）：**  
「**Fork 产品态收口**」——不重开上游贡献；对齐安装真相源；修 icons 打包缺口；落盘本审计报告；跑本地验证矩阵。

---

## 1. 产品定位、边界与要求

### 1.1 定位

帮助用户**编写、优化、测试、评估、沉淀**提示词资产，提升对 LLM / 图像模型的可控输出质量。

### 1.2 目标用户

- 提示词工程师 / AI 应用开发者  
- 需要多模型对比与迭代的创作者  
- 本地/私有部署用户（Desktop / Docker）  
- 希望在 Claude Desktop 等宿主中调用优化能力的 MCP 用户  

### 1.3 In-scope（必须）

| ID | 要求 | 状态 |
|----|------|------|
| F1 | 系统提示词 / 用户提示词优化（Basic） | ✅ |
| F2 | Pro：多消息上下文 / 变量模式 | ✅ |
| F3 | 模板选择、内置+自定义、多语言 | ✅（含推理增强等模板） |
| F4 | 流式生成 + **可取消**（AbortSignal 贯通） | ✅ |
| F5 | 多 LLM 适配（OpenAI 兼容族、Gemini、DeepSeek、智谱等） | ✅ |
| F6 | 图像：T2I / I2I / 多图 | ✅ |
| F7 | 历史链 / 收藏资产 / 导入导出 | ✅ |
| F8 | 分析 / 单评 / 结构化对比评估 | ✅ |
| F9 | Web + Desktop + Extension + Docker + MCP 多端 | ✅ |
| F10 | 主题系统（含 fork **Paper 纸感**） | ✅ 已装入 app |
| F11 | Desktop 无 CORS 限制、可连本地 Ollama 等 | ✅ |
| F12 | 访问门闩（ACCESS_PASSWORD）可选 | ⚠️ 设计偏弱（§6） |

### 1.4 Out-of-scope / 明确不做

- 不托管用户对话到自有中心化后端（默认隐私模型是本地 + 直连厂商）  
- 不作为通用 Chat UI / Agent 编排平台  
- **fork-only 策略下**不默认向 `linshenkx/prompt-optimizer` 重开 PR（上游 #325–#330 / #332–#337 已关闭）  
- 本轮不强制：商用代码签名、Playwright extended 常驻 CI、Node engines 扩大到 24  

### 1.5 产品「必须 / 应该 / 可以」

**必须（Must）**

1. 优化主路径可用：选模板 → 流式输出 → 停止 → 结果可复制/迭代  
2. API Key 与业务数据默认存本地，不经中间业务服务器  
3. Desktop IPC 不可被任意网页/iframe 滥用  
4. 安装产物可启动且 web-dist / core 初始化成功  

**应该（Should）**

1. 主题切换不串味（paper 作用域 `html[data-app-theme=paper]`）  
2. 取消后无 ghost token  
3. 导入导出与图片资产分离（结构化 vs 二进制库）  
4. 文档路径与真实安装根一致  

**可以（Could）**

1. Paper 深色变体  
2. 密钥 OS 级加密保管  
3. 默认主题改为纸感  
4. 扩展 Playwright 回归  

---

## 2. 系统边界与架构

### 2.1 边界图（文字）

```
┌────────────────────────── 用户设备 ──────────────────────────┐
│  Web (Vite SPA)  │  Chrome Extension  │  Electron Renderer   │
│        └──────────── packages/ui + core (browser) ──────────┘│
│                              │ IPC (仅 Desktop)               │
│                              ▼                               │
│                    Electron Main (desktop)                   │
│           domain handlers / file storage / updater           │
│                              │                               │
└──────────────────────────────┼───────────────────────────────┘
                               │ HTTPS
                               ▼
                    各 LLM / Image 厂商 API
                               ▲
┌──────────────────────────────┼───────────────────────────────┐
│ 可选部署面：Docker(nginx+静态) / Vercel / CF Pages            │
│   ACCESS_PASSWORD 门闩 (api/auth.js / nginx basic)           │
│  MCP Server 进程 ──stdio/HTTP──► Claude Desktop 等宿主        │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 依赖方向（硬规则）

```
extension/web/desktop ──► ui ──► core
mcp-server ──► core
desktop main ──► core (+ electron 子路径代理)
禁止：core 依赖 ui/web/desktop
```

### 2.3 模块清单

| 包 | 职责 | 对外 |
|----|------|------|
| `@prompt-optimizer/core` | 领域：LLM、Prompt、Template、History、Favorite、Context、Evaluation、Compare、Image、Storage、Preference、Variable* | `dist` ESM/CJS + `./electron` 代理 |
| `@prompt-optimizer/ui` | Vue3 组件、stores、composables、i18n、主题、router | 组件导出 + style |
| `@prompt-optimizer/web` | Vite 应用壳，打包给 Web / Desktop web-dist | `dist` / `desktop/web-dist` |
| `@prompt-optimizer/desktop` | Electron main/preload、IPC、更新、远程备份、打包 | NSIS / zip |
| `@prompt-optimizer/extension` | 浏览器扩展壳 | 扩展包 |
| `@prompt-optimizer/mcp-server` | MCP tools 适配 core | `dist` + HTTP 安全中间件 |
| `api/auth.js` | Vercel 密码门闩 | serverless |
| `docker/*` | nginx + compose + 配置注入 | 镜像 |

### 2.4 Core 领域服务地图

| 域 | 路径 | 职责 |
|----|------|------|
| llm | `services/llm` | 适配器注册、流式调用、参数 |
| model | `services/model` | 文本模型配置 CRUD / 校验 |
| prompt | `services/prompt` | 优化/迭代主服务 + Electron 代理 |
| template | `services/template` | 内置/自定义模板 |
| history | `services/history` | 优化链与迭代 |
| favorite | `services/favorite` | 收藏资产与导入导出守卫 |
| context | `services/context` | Pro 会话上下文仓库 |
| evaluation / compare | 对应目录 | 评估与结构化对比 |
| image / image-model | 对应目录 | 图像生成与模型配置 |
| storage | `services/storage` | Dexie / File / Memory 工厂 |
| preference | `services/preference` | 用户偏好（主题等） |
| variable-* | extraction / value-generation | 变量抽取与填充 |

### 2.5 前后端（Desktop）边界

| 必须在 Main | 可在 Renderer | 两端共享 |
|-------------|---------------|----------|
| 文件存储写盘、打开目录 | UI 状态、主题、表单 | 领域类型与接口 |
| 自动更新、系统菜单 | 工作区交互 | Prompt/LLM 业务规则（core） |
| 受信 IPC 门面、stream 注册表 | 展示流式 token | Electron 代理实现 |
| 远程备份 SDK（S3/WebDAV） | 触发备份 UI | — |

### 2.6 关键数据流

1. **优化**：Workspace → PromptService.optimize*(stream) → LLM adapter → onToken → OutputDisplay；Stop → AbortSignal → provider 中止  
2. **Desktop 流**：Renderer invoke → secure handler → owned-stream-runner → events 回 Renderer；cancel 校验 owner  
3. **存储**：Web/Ext = Dexie KV + 独立 Image DB；Desktop 结构化 = `prompt-optimizer-data.json`（原子写+备份）；**图像像素仍在 renderer IndexedDB**（双栖）  
4. **导入导出**：DataManager 协调 history/models/templates/settings/contexts；**收藏不在 DataManager 全量包内**（独立 Favorite API）— 备份语义需在 UI 明示  

### 2.7 架构优点（摘要）

- 客户端优先 + core 可复用（Web 真服务 / Desktop main 真服务+Proxy / MCP Memory）  
- `exports["./electron"]` 隔离 Proxy；IPC 域拆分 + channel-manifest 1.1.0  
- Adapter Registry 扩供应商；流所有权取消；window/runtime/ipc 安全基线  
- web/extension 薄壳；门禁与业务解耦  

### 2.8 架构债务补录

| ID | 级别 | 问题 |
|----|------|------|
| A1 | P1 | DataManager「导出全部」不含收藏 |
| A2 | P1 | Desktop 配置在 main 文件库、图片在 renderer IDB，迁移备份不完整 |
| A3 | P1 | `createLLMService` 隐式 ElectronProxy 分支增加心智负担 |
| A4 | P1 | UI 依赖 `@aws-sdk/client-s3` 膨胀浏览器包 |
| A5 | P2 | channel-manifest 默认不强制 runtime 校验；历史写入在 UI 层致 MCP 无历史 |  

---

## 3. 前端与 UX

### 3.1 路由（hash，Electron 友好）

| 路由 | 模式 |
|------|------|
| `/basic/system` `/basic/user` | Basic 系统/用户 |
| `/pro/multi` `/pro/variable` | Pro 多消息/变量 |
| `/image/text2image` `/image2image` `/multiimage` | 图像 |
| `/favorites` | 收藏页 |
| `/` | RootBootstrap 恢复全局设置后跳转 |

### 3.2 主题

- Naive UI `themeOverrides` + Tailwind `.dark`  
- Fork：**Paper** — `packages/ui/src/styles/paper.css`，`data-app-theme=paper`，离线字体栈，取消 CTA `--paper-cta`  
- 引入方式：JS `import "./styles/paper.css"`（避免 PostCSS 与 Tailwind `@import` 顺序冲突）  

### 3.3 UX 规范要点

- 模板选择双行卡片（名 + 描述）  
- 优化中 Stop 可见；取消 toast  
- i18n：zh-CN / en-US / zh-TW；禁止运行时中文硬编码（有 `check:no-chinese-runtime`）  
- Paper 仅作用 paper 主题，不污染其他主题  

### 3.4 前端债务

| 项 | 级别 | 说明 |
|----|------|------|
| UI `build:types` / TemplateSelect | P1 | `defineProps` 运行时写法与严格 vue-tsc 摩擦；打包用 `build:bundle` 绕过 |
| Pro 路由非懒加载 | P2 | ContextSystem/User 同步 import，增大首包 |
| 烟测脚本安装路径 | P1 | 仍指向已删除的 `D:\PromtOptimizer\PromptOptimizer`（本轮修复） |

---

## 4. 构建、测试与运维

### 4.1 构建图

```
core build ──► ui build (types|bundle) ──┬──► web build ──► desktop package (electron-builder)
                                         ├──► extension
mcp-server 独立 build
```

**本机推荐 Desktop 交付（fork 实践）：**

```powershell
# portable Node 22 + 源码根
pnpm -F @prompt-optimizer/core build
pnpm -F @prompt-optimizer/ui build:bundle   # 跳过易失败的 build:types
pnpm -F @prompt-optimizer/desktop build:ci # ELECTRON_BUILD=true web + nsis, publish never
# 安装到 D:\PromtOptimizer\app
```

### 4.2 测试金字塔

| 层 | 命令/位置 | 本轮结果 |
|----|-----------|----------|
| Desktop config unit | `node --test packages/desktop/config/*.test.js` | **68/68 PASS** |
| Desktop IPC 契约 | `node --test scripts/desktop-ipc-handlers.test.mjs` | **10/10 PASS** |
| Core 抽样（根目录 config） | vitest + `packages/core/vitest.config.js` | **21/21 PASS**（cwd 无关已修好） |
| Desktop local e2e smoke | `scripts/desktop-local-e2e-smoke.cjs` | **ALL CHECKS PASSED**（source 模式） |
| Playwright gate | `pnpm test:e2e:gate` | 历史 12/12；本轮未重跑全量 |
| UI unit | `packages/ui` vitest | 历史 834+；本轮未全量 |

### 4.3 部署形态运维面

| 形态 | 要点 |
|------|------|
| 在线 Web | 纯前端；勿在公开站预置 `VITE_*` 密钥 |
| Vercel / CF | 静态 + 可选 ACCESS_PASSWORD |
| Docker | nginx 静态 + 可选 basic/auth 与 MCP `/mcp` |
| Desktop | 自动更新指向 fork `xvyimu/prompt-optimizer` releases |
| MCP | Bearer + Origin 白名单（`http-security.ts`） |

### 4.4 可观测性

- Desktop：`electron-log`，用户目录 logs；`logs-open-directory` IPC  
- 无中心化 APM；故障靠本地日志 + 烟测  

### 4.5 本机 fork 运维规范（现行）

| 用途 | 路径 |
|------|------|
| 源码 | `D:\PromtOptimizer\src\prompt-optimizer` |
| 安装 | **`D:\PromtOptimizer\app`** |
| 工具链 | `D:\PromtOptimizer\tools`（Node 22） |
| 安装包归档 | `nsis-2026-07-20-paper-theme\` / `nsis-2026-07-20-develop-ux\` |
| 用户模板 | `custom-templates\`（勿删） |

---

## 5. 安全与信任边界

### 5.1 威胁模型摘要

| 边界 | 信任假设 | 主要风险 |
|------|----------|----------|
| Renderer | 不可信（XSS/导航） | 经 preload 有限 API；需防恶意导航与 IPC 伪造 |
| Main | 高权限 | 文件、网络、更新 |
| 模型 API | 外部 | Key 泄露、提示词内容出境 |
| Docker/Web 门闩 | 弱共享口令 | 口令暴力/Cookie 设计 |
| MCP HTTP | 局域网/宿主 | 未鉴权暴露优化接口 |
| 自动更新 | GitHub releases | 供应链/错误 repo |

### 5.2 已有控制（优点）

- `contextBridge` + 域 IPC；`registerSecureIpcHandler`：主 frame + URL 白名单  
- streamId 字符集约束；非 owner 不可 cancel  
- `window-security` 限制顶层导航；外链 URL 校验  
- `runtime-security` 仅暴露显式 public 的 `VITE_*`  
- MCP：`timingSafeEqual` Bearer、Origin 集合、body limit、session TTL  
- CategoryManager XSS 等 hardening 已在 fork 历史中落地  

### 5.3 发现清单

| ID | 级别 | 描述 | 证据 | 利用前提 | 建议 |
|----|------|------|------|----------|------|
| S1 | **Critical/High** | `api/auth.js` 将 **明文密码** 写入 `vercel_access_token` Cookie；CORS `*`；无限速 | `api/auth.js` / `middleware.js` | 公网启用 ACCESS_PASSWORD | 随机 session + 口令哈希 + 限速 |
| S2 | **Critical** | Docker `generate-config.sh` 把 **全部 `VITE_*`（含 API Key）** 写入浏览器可读 `config.js` | `docker/generate-config.sh` | 公网 Docker 预置厂商 key | 与 Desktop 对齐仅 public 键；文档禁止生产预置 key；轮换已泄露 key |
| S3 | High | API Key / 远程备份密钥本地明文；`exportData` 全量含 key | storage + `model/manager` + `remote-backup.ts` | XSS/共机/备份桶泄露 | safeStorage / 导出脱敏 / 备份加密 |
| S4 | High | Electron 大量 IPC 仍裸 `ipcMain.handle`（model/data/remote-storage 等）；仅部分走 secure | `ipc-security.js` vs 各 handlers | 导航绕过或未来边界松动 | 默认全部 `registerSecureIpcHandler` |
| S5 | Med | `VITE_*` 可进 Web/扩展 bundle | `packages/web/vite.config.ts` | CI 用真 key 构建 | 构建仅 public；发版 secrets 扫描扩到 web-dist |
| S6 | Med | 打包 `files` 曾漏 `icons/**`；Electron 未显式 `sandbox:true` | desktop package.json / main.js | 完整性/隔离 | **icons 已修**；建议开 sandbox |
| S7 | Med | 自动更新信任 `xvyimu`；Win 未签名 | publish 配置 | 供应链 | 保护 release；长期签名 |
| S8 | Low–Med | Nginx CSP 过宽；`/assets` 未挂 Basic Auth | `docker/nginx.conf` | 公网 Docker | 收紧 CSP；鉴权一致 |
| S9 | Low | Markdown html+DOMPurify 默认配置 | `MarkdownRenderer.vue` | 恶意内容 | 显式 ALLOWED_TAGS；错误用 textContent |

### 5.4 Desktop 安全基线（应保持）

1. 禁止 `nodeIntegration: true` 于业务窗  
2. 新 IPC 必须进 `channel-manifest` 并用 secure 注册  
3. 流式通道必须 owner-bound cancel  
4. 更新源与 `resolveUpdateRepositoryConfig` 一致（fork）  

---

## 6. 规范建议（模块 / 边界 / 流程）

### 6.1 模块边界

1. **新功能先落 core 接口与测试**，再接 UI，最后 desktop IPC（若需主进程能力）  
2. UI 不得直接 `fs` / Node API；Desktop 能力只走 preload  
3. 存储：结构化数据 ≠ 图片二进制；禁止大 base64 进主 KV  

### 6.2 依赖与构建

1. 工作区依赖只用 `workspace:*`  
2. UI 类型门禁与 bundle 门禁分离：发布 Desktop 允许 `build:bundle`，但应单开任务修 `vue-tsc`  
3. Core vitest **必须**使用 `packages/core/vitest.config.js`（已 cwd 无关）  

### 6.3 Git / 发布（fork）

1. 日常分支：`develop`；功能 `feat/*`  
2. **默认不 push 上游**；fork-only  
3. Desktop `publish.owner=xvyimu`  
4. 高风险：push / 删安装树 / 外发密钥 → 先确认  

### 6.4 提交信息

约定式：`feat(ui): ...` / `fix(desktop): ...` / `docs: ...`

### 6.5 文档真相源

| 文档 | 角色 |
|------|------|
| **`docs/project/CURRENT.md`** | **头号 SSOT**：产品版本、本机安装路径、fork 策略（只在此处维护权威数字） |
| **`docs/DOCS_POLICY.md`** | 写哪里 / 禁止 / check:docs |
| **`D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-2026-07-20.md`** · **C2** | 文档体系方案 C / C2 |
| **`docs/project/DOC-DRIFT-REGISTRY.md`** | DOC 债台账（扫描差分关闭状态） |
| 本报告 | 2026-07-20 全面检查（深度；不替代 CURRENT 数字） |
| `D:\PromtOptimizer\docs\FULL-SCAN-RECOMMENDATIONS-2026-07-20.md` | 全面扫描建议（增量） |
| `docs/PROJECT_HANDOFF.md` | 工程交接 L0（路径/命令须与 CURRENT 一致） |
| `D:\PromtOptimizer\README.md` | 安装侧 L0；`CLOSEOUT.md` 为 L2 历史 |
| `docs/project/RELEASE-RUNBOOK.md` · `release-notes.md` · `version-sync.md` | 发版过程 L1 |
| `.pipeline/OPTIMIZATION_PLAN.md` | 历史优化单（多已完成，**勿当**现行安装路径） |
| `docs/project/prd.md` | 产品需求基线（含 2.11 fork 增量） |
| `docs/architecture/*`（白名单） | 专项架构事实 |

---

## 7. 与历史文档对照

| 历史结论 | 现行状态 |
|----------|----------|
| OPTIMIZATION_PLAN A–E 勾选 | vitest cwd、english-guards、update-handlers、IPC 等 **已在 develop** |
| 安装 `D:\PromtOptimizer\PromptOptimizer` 热替换无 asar | **已迁移** NSIS → `D:\PromtOptimizer\app` + **app.asar** |
| 上游 #324 / #325–#330 | 关闭；策略 **fork-only** |
| Paper 主题 | **已合 develop 并装入 app**（`2db7e58`/`d99da52`） |
| icons 缺失 P1 | 源码 icons 在；**asar 曾缺** → 本轮热修 + `files` 纳入 `icons/**/*` |

---

## 8. 验证矩阵（2026-07-20 本轮）

| 检查 | 结果 |
|------|------|
| Desktop config unit | 68 pass |
| Desktop IPC handlers | 10 pass |
| Core vitest 抽样（根 config） | 21 pass |
| Desktop local e2e smoke (source) | ALL CHECKS PASSED |
| asar 含 `icons/app-icon.ico` | ✅ 热修后 |
| asar 含 main/preload/web-dist | ✅ |
| Paper 主题代码在 develop / 先前 asar 标记 | ✅（安装 21:11 包；icons 热修不改 web 逻辑） |

---

## 9. 推荐方案与本轮执行勾选

### 方案选择：**Fork 产品态收口（最优 ROI）**

理由：OPTIMIZATION_PLAN 主体已完成；现行风险在「文档/安装路径漂移 + 打包漏 icons + 审计未落盘」，而非重做 hardening。上游贡献被明确暂停，不应把精力放在 reopen PR。

| 步骤 | 内容 | 状态 |
|------|------|------|
| 1 | 全面检查报告落盘 | ✅ 本文件 |
| 2 | desktop `package.json` `files` 增加 `icons/**/*` | ✅ |
| 3 | 热修 `D:\PromtOptimizer\app\resources\app.asar` 写入 icons | ✅（备份 `app.asar.bak-pre-icons-*`） |
| 4 | 烟测脚本安装路径改为 `app` 并支持环境变量 | ✅（见同轮代码） |
| 5 | 更新 `D:\PromtOptimizer\README.md` / HANDOFF 关键路径 | ✅ |
| 6 | 本地验证矩阵 | ✅ §8 |
| 7 | commit icons 修复到 develop | ✅ `6e123c8` |
| 8 | 修复 smoke checklist 安装路径乱码 | ✅ `a5019eb` |
| — | push origin | ✅ `a5019eb`…`a1e1a71` 已 push 到 `xvyimu/prompt-optimizer` develop |
| 9 | P0 Docker 禁止密钥注入 config.js | ✅ `generate-config.sh` public 过滤 + compose 去默认密码/API key |
| 10 | P0 ACCESS_PASSWORD 会话 token | ✅ HMAC `po_access_session` + 拒 legacy Cookie + 限速 |

### 明确不做（本轮）

- 不 reopen 上游 PR  
- 不改 ACCESS_PASSWORD 实现（仅报告 S1）  
- 不强制全量 Playwright / 商用签名  
- 不删除用户 `custom-templates`  

---

## 10. 后续优先级 backlog

| 优先级 | 项 |
|--------|-----|
| P0 | 保持 fork develop 可构建可安装；密钥勿提交 |
| P0 | Docker compose 默认 `ACCESS_PASSWORD=123456` 若对外暴露必须改掉（DevOps 审计 R1） |
| P0 | **Docker/Web 禁止把厂商 API Key 注入 `config.js`/bundle**（S2）；公网实例轮换 key |
| P1 | 修 UI `build:types`（TemplateSelect 与 Naive Select 类型） |
| P1 | 图像生成 Abort/Stop 与文本流同构（产品审计 P0-2） |
| P1 | 强化 ACCESS_PASSWORD 会话模型（S1）；全量 IPC secure 包装（S4） |
| P1 | 扩大 CI：`test:gate:core` 过窄；补 lint/typecheck/mcp:test |
| P1 | fork Docker 镜像名仍绑 `linshen/*` 与 Desktop `xvyimu` 渠道分裂 |
| P1 | Dark 主题 Naive overrides 加深；文档 version/function-mode 命名对齐 |
| P2 | supervisord 自愈；e2e 分组补齐；Pro 懒加载；Paper 深色；safeStorage；a11y 产品化 |
| P2 | Playwright gate 日常化；依赖 CVE 扫描；CSP 收紧 |

### 10.1 DevOps 补充快照（并行审计）

- 构建图强：`core → ui → web|ext → desktop`；mcp 独立  
- CI 有 test→docker/release，但 **缺 lint/SAST/依赖审计**；core gate 仅 2 个 VCR 文件  
- Docker：`MCP_AUTH_TOKEN` 必填、`/healthz` 有；默认 Basic 密码与前端 `VITE_*` 注入需当公开配置管理  
- 本机 Desktop 更新源已指向 `xvyimu/prompt-optimizer`

---

## 11. 附录：快速命令

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer

# 契约
node --test packages/desktop/config/*.test.js
node --test scripts/desktop-ipc-handlers.test.mjs

# Core 抽样（任意 cwd）
node ./packages/core/node_modules/vitest/vitest.mjs run --config packages/core/vitest.config.js tests/unit/i18n/runtime-english-guards.test.ts

# 烟测
$env:PROMPT_OPTIMIZER_INSTALL_ROOT='D:\PromtOptimizer\app'
node scripts/desktop-local-e2e-smoke.cjs
# 或源码：
node scripts/desktop-local-e2e-smoke.cjs --source

# 启动安装版
Start-Process 'D:\PromtOptimizer\app\PromptOptimizer.exe'
```

---

## 12. 签署

| 角色 | 说明 |
|------|------|
| 架构 / 模块 | §2 |
| 产品 / 前端 | §1 §3 |
| 安全 | §5 |
| 构建运维 | §4 §8 |
| 执行 | §9 |

**结论：** 项目在 fork develop 上可作为本机主力产品使用；架构边界清晰，Desktop 安全与取消链路达到可维护基线。优先消化文档/打包一致性与类型门禁，密钥与 Web 门闩按 S1–S3 规划增强。
