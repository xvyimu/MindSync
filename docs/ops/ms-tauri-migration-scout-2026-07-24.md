# MindSync · Desktop 换壳 / 换栈测绘（Phase 0 · 只读）

| 项 | 值 |
|----|-----|
| **日期** | 2026-07-24 |
| **性质** | 只读爆炸半径；**不**授权实现；**不**写 Tauri 业务代码 |
| **源码根** | `D:\MindSync\src\mindsync` |
| **tip（实测）** | `221b767` · 分支 `develop` · 与 `origin/develop` 同步 |
| **产品版本** | **2.11.7**（根 / desktop `package.json`） |
| **现行栈 SSOT** | `docs/PROJECT.md` · Desktop **Electron** · Vue3 · Naive · Vite · Pinia · `@mindsync/core` · pnpm |
| **组合策略** | `D:\orca\.planning\portfolio-stack-policy-2026-07-24\STACK-POLICY.md` §5.1：**建议不换栈**；换栈须 **ADR + PROJECT 更新 + 人确认** |
| **ADR 现状** | 仓内 **无** `docs/adr/` 目录（换壳若继续，Phase 1 需新建编号） |

---

## 0. 一句话

MindSync 的 **Desktop 爆炸半径主要在壳层 IPC + Electron 专用代理 + 密钥/更新/打包**，不是 Vue UI 业务本身。  
**160** 个领域 invoke channel、**13+** 个 `electron-proxy`、**safeStorage** 密钥落盘、**electron-updater** 与 **~411 MB** 安装树，构成迁移主成本。  
Web / 扩展 / MCP 可继续共用 core/ui；换壳若做得好，应是 **壳替换 + adapter 改名**，不是重写工作台。

> **范围澄清（等人答）：** 用户口述「要换技术栈」。本 scout **默认假设** = 仅 Desktop 壳 Electron→Tauri2，**保留** Vue3/Naive/Vite/core/pnpm/Web/扩展/MCP。  
> 若实际要换 UI 框架 / 重写 core / 引入 Prisma 等，爆炸半径升为 **全产品重做**，本文件结论不适用，须另开规格。

---

## 1. 模块 → 文件映射

### 1.1 monorepo 包

| 包 | 路径 | 角色 | 换壳敏感度 |
|----|------|------|------------|
| `@mindsync/core` | `packages/core` | 领域 SSOT；AbortSignal；模型/提示词/历史… | **中**：Electron 代理子路径须并行或改名 Desktop 适配层 |
| `@mindsync/ui` | `packages/ui` | Vue3 + Naive 工作台 | **低–中**：`isRunningInElectron` / `window.electronAPI` / `useUpdater` |
| `@mindsync/web` | `packages/web` | Vite Web；Desktop 用 `web-dist` | **低**：`ELECTRON_BUILD` 构建标记 |
| `@mindsync/desktop` | `packages/desktop` | **Electron 主进程 / preload / IPC / builder** | **极高 · 迁移主战场** |
| `@mindsync/extension` | `packages/extension` | 浏览器扩展 | **低**（不依赖 Electron 壳） |
| `@mindsync/mcp-server` | `packages/mcp-server` | MCP | **低** |
| `services/ai-core` | `services/ai-core` | Python sidecar · **默认 OFF** | **低**（契约保留；禁默认进包） |

### 1.2 Desktop 壳关键文件

| 能力 | 文件 |
|------|------|
| 入口 / 窗口 / 生命周期 | `packages/desktop/main.js` |
| preload / `window.electronAPI` | `packages/desktop/preload.js` |
| IPC 协议清单 v1.1.0 | `packages/desktop/config/ipc/channel-manifest.js` |
| 域 handler 注册 | `packages/desktop/config/ipc/register-domain-handlers.js` + `*-handlers.js` |
| 流所有权 + Abort | `packages/desktop/config/ipc/owned-stream-runner.js` · `stream-registry.js` |
| IPC 安全 | `packages/desktop/config/ipc-security.js` · `runtime-security.js` · `window-security.js` |
| 服务装配 | `packages/desktop/config/service-container.js` |
| 密钥 codec | `packages/desktop/config/safe-storage-secrets.js` |
| 用户数据迁移 | `packages/desktop/config/user-data-migration.js` |
| 自动更新 | `packages/desktop/config/ipc/update-handlers.js` · `update-config.js` · `electron-updater` |
| 远程备份 | `packages/desktop/remote-storage.js`（S3/WebDAV；Drive 拒绝） |
| AI-Core 旁路 | `ai-core-config.js` · `ai-core-client.js` · `ipc/ai-core-handlers.js` |
| 打包 | `packages/desktop/package.json` → electron-builder（NSIS/zip） |

### 1.3 core / UI 对壳的耦合

| 层 | 文件模式 | 说明 |
|----|----------|------|
| core Electron 入口 | `packages/core/src/electron.ts` | 导出全部 Electron*Proxy |
| core 代理 | `packages/core/src/services/**/electron-proxy.ts`（≥13） | 一律 `window.electronAPI.*` |
| 环境探测 | `packages/core/src/utils/environment.ts` | `isRunningInElectron` / `waitForElectronApi` |
| UI 装配 | `packages/ui/src/composables/system/useAppInitializer.ts` | Electron 分支动态 `import('@mindsync/core/electron')` |
| UI 更新 | `packages/ui/src/composables/system/useUpdater.ts` | 直接 `window.electronAPI.updater` |
| UI 类型 | `packages/ui/src/types/electron.d.ts` | ElectronAPI 面 |

**架构事实：** Desktop 下业务服务 **不在 renderer 跑领域实现**，而经 IPC 代理到 **main 内 `createCoreServices`**。  
→ Tauri 路径若保留该模型：Rust/command 层 **仍可调 TS core**（sidecar 或嵌入 Node）或把 storage/密钥迁到 Rust；**不可**假设「只换 WebView 就完事」。

---

## 2. IPC 清单（摘要）

**协议版本：** `1.1.0`  
**领域 invoke 合计：** **`ALL_DOMAIN_CHANNELS` = 160**（node 实测）  
**另：** `UPDATE_EVENT_CHANNELS` = 6（main→renderer 推送）  
**流式：** channel 名以 `Stream` 结尾 + `stream-cancel`；preload 用 `streamId` + AbortSignal 竞速。

| 域 | 数量 | 方向 | 敏感级 | 备注 |
|----|------|------|--------|------|
| model | 12 | inv | **高**（apiKey） | safeStorage 包装 models |
| image / image-model / understanding | 23 | inv | **高** | 图像密钥 + 生成；可带 streamId |
| template | 16 | inv | 中 | 含内置语言 |
| history | 17 | inv | 中 | 上限配置 |
| context | 16 | inv | 中 | 会话上下文 |
| favorite | 25 | inv | 中 | 最大域之一 |
| data | 4 | inv | **高**（导出密钥可选） | openStorageDirectory → shell |
| preference | 10 | inv | 中–高 | 偏好全量 |
| prompt | 11 | inv | 中 | 含 5 条流式 |
| llm | 7 | inv | 中–高 | 含 stream + **stream-cancel** |
| system | 6 | inv | 中 | env 白名单 / shell / version / logs |
| ai-core | 3 | inv | 低（默认 OFF） | fail-closed |
| update | 9 inv + 6 events | 双向 | 中 | electron-updater 绑定 |
| remote-storage | 1 总线 | inv | **高** | S3/WebDAV 凭证 |

**完整 channel 名：** 以 `packages/desktop/config/ipc/channel-manifest.js` 为 SSOT（本 scout 不复制 160 行以免漂移）。

### 2.1 preload 表面（`window.electronAPI`）

- 命名空间：`llm` · `prompt` · `model` · `image` / `imageModel` · `template` · `history` · `context` · `favorite` · `data` · `preference` · `app` · `shell` · `logs` · `updater` · `aiCore` · `remoteStorage` 等  
- 横切：`on` / `off` 事件订阅；流式带 `signal` → `stream-cancel`  
- **UI/core 直接依赖该形状** → 迁移应优先 **adapter 兼容层**（保持 API 名或双名过渡），避免 Vue 全仓改调用。

---

## 3. 密钥与明文路径风险

| 项 | 现行事实 | Tauri 风险 / 要求 |
|----|----------|-------------------|
| API Key 落盘 | `safeStorage` → `__enc:v1:` + OS 级加密（models / image-models） | **必须**有等价：Windows DPAPI / keyring；**禁止**明文回落为默认 |
| codec 抽象 | `createElectronSafeStorageCodec` 已隔离 | 可替换实现；storage 包装逻辑在 `service-container` |
| 不可用时 | 日志警告，密钥可仍明文 | 迁移验收须测「加密可用 / 不可用」两路径 |
| userData | `app.getPath('userData')` · 产品名 MindSync | 路径会变；须兼容读旧 `%APPDATA%/MindSync` 与历史 PromptOptimizer 迁移逻辑 |
| 主数据文件 | `prompt-optimizer-data.json`（见 user-data-migration） | 迁移脚本不得丢数据；**禁删** legacy 目录（现行也不删） |
| 导出 | `exportAllData({ includeSecrets? })` 默认脱敏 | 行为须保持；含密钥二次确认 |
| 远程备份 | S3/WebDAV 仅 Desktop IPC；凭证高敏 | command 层同等 sender/校验纪律 |
| AI-Core | `AI_CORE_URL` 空 = OFF；**不进 asar** | 保持默认 OFF；禁打进 Tauri 默认资源 |
| 环境变量 | 生产优先 exe 旁 `.env.local`；runtime 公共配置白名单 | 白名单纪律迁到新壳 |

**明文路径关注点：**  
- `%APPDATA%\MindSync\`（日志、偏好、加密后模型配置）  
- 安装根 `D:\MindSync\app\` · asar 内无 Python AI-Core（符合契约）  
- 用户模板 `D:\MindSync\custom-templates\`（仓外，勿碰）

---

## 4. Electron API 使用清单

| API / 能力 | 位置 | 迁移映射（Tauri 2 粗映） | 难度 |
|------------|------|--------------------------|------|
| `app` setName / ready / quit / getPath / isPackaged | main.js | tauri app / path / resource dir | M |
| `BrowserWindow` + webPreferences preload | main.js | `WebviewWindow` + 前端 API | M |
| `ipcMain.handle` + 安全包装 | ipc-security / handlers | `invoke` commands + 鉴权中间层 | **L**（160 ch） |
| `contextBridge` / `ipcRenderer` | preload.js | `@tauri-apps/api` + 自研 facade | **L** |
| `safeStorage` | service-container | keyring / DPAPI plugin | **M–L** |
| `shell.openExternal` / `openPath` | system/data handlers | `opener` / `shell` plugin | S |
| `session` / 导航守卫 | window-security | CSP + 导航 hook | M |
| `Menu` / 缩放菜单 | app-menu · page-zoom | 原生菜单或前端菜单 | M |
| `nativeImage` | main | 资源图标 | S |
| `electron-updater` + GitHub publish | update-handlers | **无 1:1**；tauri-updater 或外置；可 **DEFER** | **L** |
| `electron-builder` NSIS | package.json build | tauri bundler | M |
| undici proxy dispatcher | proxy-dispatcher | 系统/自定义代理策略重做 | M |
| AWS SDK / webdav in main | remote-storage | 同 JS sidecar 或 Rust 客户端 | M |
| `dialog` | 基本未用（error box 注释） | 可选 | S |
| Tray / 单实例锁 / 深链协议 | **主路径几乎未见** | 若产品以后要，单独 ADR | —（当前 S） |
| clipboard / globalShortcut / Notification | 主路径未作为核心 | 按 UI 需要再补 | — |

---

## 5. 多入口依赖图（简）

```
@mindsync/core  ←── ui / web / extension / mcp / desktop(main)
       │
       ├── browser 图：无 electron 子路径
       └── @mindsync/core/electron → 仅 Desktop renderer 动态 import

Desktop 运行时：
  main.js → createCoreServices(core) → IPC handlers
  preload → window.electronAPI
  web-dist (Vue UI) → useAppInitializer → Electron*Proxy → electronAPI

Web：UI + core 本地 storage，无 IPC
Extension：独立包
MCP：独立 Node 服务
AI-Core：可选 HTTP sidecar
```

**假设 `window.electron` / IPC 的包：** 主要是 `desktop` + `core/*electron*` + `ui` 桌面分支；**web/extension/mcp 主路径不绑 Electron。**

---

## 6. 质量基线（命令与证据）

| 命令 | 结果 | 备注 |
|------|------|------|
| `git rev-parse --short HEAD` | `221b767` exit 0 | develop 干净跟踪 origin |
| `node -v` / `pnpm -v` | v24.16.0 / 11.5.3 | 符合 engines |
| `node --test scripts/desktop-ipc-handlers.test.mjs` | **11 pass · 0 fail · exit 0** | IPC 契约绿 |
| 全量 `pnpm test:gate` / e2e | **本 Phase 未跑** | 耗时长；记债，红也不改码 |

**已知门闩脚本（未全跑）：**

- `pnpm test:gate` → test:repo + gate:core + gate:ui  
- `pnpm test:gate:full` → + e2e gate  
- `pnpm test:gate:core` / `test:gate:ui` / `test:e2e:gate`  
- desktop：`pnpm -F @mindsync/desktop test`（config `*.test.js`）

---

## 7. 安装与体积基线（本机）

| 项 | 值 |
|----|-----|
| 运行安装 | `D:\MindSync\app\PromptOptimizer.exe`（productName=MindSync） |
| exe | **~212.4 MB** |
| `resources/app.asar` | **~67.9 MB** |
| 安装树合计 | **~411.1 MB** |
| 归档 zip | `D:\MindSync\nsis-2026-07-21-ipc\PromptOptimizer-2.11.7-win-x64.zip` **~145.5 MB** |
| appId | `com.xvyimu.mindsync` |
| 开发 | `pnpm dev:desktop`（web :18181 + electron） |
| 构建 | `pnpm build:desktop` |

**对比用途：** 若做 Tauri，同机测 **安装包体积 / 空闲内存 / 冷启动**，写入 Phase 4 表；本 Phase 只记 Electron 基线。

---

## 8. 迁移难度与建议切片

### 8.1 总评

| 维度 | 评级 | 说明 |
|------|------|------|
| 壳窗口 + 加载现有 web-dist | **M** | Vite UI 可复用 |
| 160 IPC → commands + 安全模型 | **L** | 主成本 |
| 流式 + Abort 全路径 | **M–L** | 已有清晰 streamId 模型，可移植 |
| safeStorage 等价 | **M–L** | 安全门闩，不可糊弄 |
| electron-updater 等价 | **L** 或 **DEFER** | 建议 ADR 标明可后置 |
| remote-storage（S3/WebDAV） | **M** | 可暂留 Node sidecar |
| UI 框架 / core 领域 | **勿动**（若仅换壳） | 否则升维到重写 |
| 回滚 | 必须 | Electron 路径 cutover 前不拆除 |

**综合：L（大）**——可行，但是 **多阶段工程**，不是周末换壳。  
组合策略 §5.1 的「密钥/流式/更新/已装机路径成本远高于 Tauri 收益」**与本测绘一致**；是否仍换栈由人 gate，不由 scout 拍板。

### 8.2 建议切片顺序（仅当人批准 A 后）

1. **M0 文档** — ADR + cutover-plan + PROJECT 草稿  
2. **M1 垂直切片** — Tauri 工程 + 加载现 UI + 3–5 条 P0 command（version / preference 非密 / ping）  
3. **M2 adapter** — `desktopAPI` facade 兼容 `electronAPI` 形状；UI 尽量零改  
4. **M3 密钥** — safeStorage 等价 + 旧数据可读  
5. **M4 流式** — llm/prompt stream + cancel 证明  
6. **M5 批迁 IPC** — 按域 B1…Bn（model → preference → data → favorite…）  
7. **M6 远程存储 / 代理**  
8. **M7 更新（可 DEFER）**  
9. **M8 测量 + 双轨** — 默认仍 Electron  
10. **M9 人 gate cutover**

**禁止：** 双壳功能双写长期化；无 gate 拆 Electron；React 平行 UI；AI-Core 默认进包。

---

## 9. Go / No-Go 建议（事实，不拍板）

### 9.1 支持「继续评估 / 写 ADR」的事实

- UI 与 core 领域已分层；Web/扩展/MCP **不必**随壳重写  
- IPC 有 manifest + 契约测试（本机 11/11 绿）  
- 流式取消、safeStorage codec、service-container 已有边界，利于「换实现不换接口」  
- 安装体积大（~411 MB 树 / ~145 MB zip），**存在**瘦身动机  

### 9.2 支持「暂缓换壳、先硬化」的事实

- **160** channel + updater + remote-storage = 长尾风险  
- 装机用户数据 / 密钥迁移一旦翻车是 **P0 事故**  
- STACK-POLICY 与 PROJECT **现行**均锁定 Electron；换栈与组合纪律冲突，须正式 ADR 推翻  
- tip 上产品能力刚完成大量 Desktop hardening；换壳会冻结功能节奏  
- 无 Tray/深链等「Electron 专属体验债」驱动；主要收益是体积/内存，须 Phase 4 数字验证  

### 9.3 总控建议（非决定）

| 若人的真实目标是… | 建议 |
|-------------------|------|
| 更小安装包 / 更低内存 | **可写 ADR 目标 Tauri2**，但默认 **hardening 并行或优先**，用数字再 cutover |
| 更快更稳、少翻车 | **B：放弃换壳，Electron 硬化波**（IPC 收紧 / safeStorage 覆盖审计 / Abort / asar 审计 / 启动采样） |
| 「换技术栈」= 换 Vue/上 React/重写 | **C 或重开规格** — 与北极星冲突，本 scout **No-Go** |

---

## 10. 人 Gate G0（原样选项）

**MindSync 换壳：A) 继续写 ADR 目标 Tauri2 主交付  B) 放弃换壳、只做 Electron 硬化  C) 中止。请回 A/B/C。**

附加（若回 A，请一并声明范围）：

- **A1** 仅壳：Electron→Tauri2，保留 Vue3/Naive/core/pnpm/多入口（推荐默认）  
- **A2** 壳 + 其它栈变更（请列清单）— 须扩大 ADR，本 scout 不够  

**未收到 A → 不得写 ADR 以外的实现；不得写 Tauri 业务代码。**

---

## 11. 证据索引

| 证据 | 路径或命令 |
|------|------------|
| 本文件 | `docs/ops/ms-tauri-migration-scout-2026-07-24.md` |
| 栈 SSOT | `docs/PROJECT.md` |
| IPC SSOT | `packages/desktop/config/ipc/channel-manifest.js` |
| IPC 契约测 | `node --test scripts/desktop-ipc-handlers.test.mjs` → exit **0**（11 pass） |
| 安装体积 | PowerShell 测 `D:\MindSync\app` · nsis zip |
| tip | `git rev-parse --short HEAD` → `221b767` |

---

*Phase 0 总控输出 · 只读 · 等人 G0。*
