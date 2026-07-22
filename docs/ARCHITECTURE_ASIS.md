# MindSync · 架构现状测绘（As-Is）

| 项 | 值 |
|----|-----|
| **产品** | MindSync（原 prompt-optimizer fork · 独立仓 `xvyimu/MindSync`） |
| **版本锚点** | 2.11.7 · 主线 `develop` · 本 worktree 分支可含本地 feature |
| **测绘日** | 2026-07-22 |
| **角色** | 架构测绘师（只读） |
| **总规划 SSOT** | `D:\orca\docs\architecture-stack-refactor-master-2026-07-22.md` |
| **仓内宪章** | [`architecture/charter.md`](./architecture/charter.md)（本地优先工作台） |
| **标签（建议）** | **P1 · 核心服务抽离**（与总规划 §2 一致） |

> 本文描述 **As-Is 事实** 与相对目标栈的偏离；**不**改业务代码、不 commit 策略。  
> 技术栈「主力参考」可偏离，但须有证据；见 §8。

---

## 0. 一句话

MindSync 是 **100% TypeScript/JS monorepo**：领域 AI 与 LLM 适配在 **`@mindsync/core`（Node/浏览器同构 TS）**，面板是 **Vue3 + NaiveUI**，壳是 **Electron main + preload IPC**；另有 **Web 静态部署**、**浏览器扩展壳**、**MCP HTTP 服务**。  
**无 Python / Go / C / SQL 主路径**。与目标栈差距集中在：**AI 核未 Python 化**、**无 Go 网关**、**桌面壳与本地存储仍绑 Electron/TS**。

---

## 1. 目录与模块图

### 1.1 仓库顶层

```
mindsync/
├── packages/
│   ├── core/          # 领域：LLM/Prompt/模板/历史/评估/图像/存储端口
│   ├── ui/            # Vue3 组件库 + NaiveUI + Paper/redesign
│   ├── web/           # Web 壳（Vite · 消费 ui）
│   ├── desktop/       # Electron main/preload/IPC · 打包 NSIS
│   ├── extension/     # 浏览器扩展壳（薄）
│   └── mcp-server/    # MCP 工具面 · Express HTTP/stdio · 依赖 core
├── api/               # Vercel 门闩：access session（HMAC Cookie）
├── scripts/           # 构建/契约/文档门禁（Node）
├── docker/ + Dockerfile  # nginx 静态 web + mcp 进程
├── docs/              # 宪章 / CURRENT / redesign / 本文
├── tests/             # e2e 等
├── middleware.js      # 边缘中间件（部署相关）
├── vercel.json · wrangler.jsonc
└── package.json       # pnpm workspace · Node ^24
```

### 1.2 运行时依赖方向（现行宪章）

```
                    ┌─────────────────────┐
                    │  LLM / 图像厂商 API  │  (用户自有 Key)
                    └──────────▲──────────┘
                               │ HTTPS
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
┌────────┴────────┐   ┌────────┴────────┐   ┌────────┴────────┐
│ desktop-main    │   │ mcp-server      │   │ web/extension   │
│ (Electron)      │   │ (Node Express)  │   │ (browser)       │
│ → core          │   │ → core          │   │ → ui → core*    │
└────────┬────────┘   └─────────────────┘   └────────┬────────┘
         │ IPC (secure)                               │
┌────────▼────────┐                          ┌────────▼────────┐
│ preload         │                          │ packages/ui     │
│ contextIsolation│                          │ Vue3+NaiveUI    │
└────────┬────────┘                          └─────────────────┘
         │
┌────────▼────────┐
│ renderer = web  │
│ dist + ui       │
└─────────────────┘

* Web 路径：部分能力在浏览器内走 core（localStorage/Dexie）；
  Desktop 敏感路径强制 main + IPC。
```

**单向依赖（宪章）**  
`extension | web | desktop-renderer → ui → core`  
`desktop-main | mcp-server → core`  
`ui` **禁止** re-export core 工厂。

### 1.3 `packages/core` 领域模块（服务目录）

| 服务目录 | 职责 | 抽到 Python AI-Core 的优先级 |
|----------|------|------------------------------|
| `prompt/` | 优化/迭代/测试编排 · `OptimizationStrategy` | **P0 候选**（编排核） |
| `template/` | 内置模板库 + Mustache 处理 | **P0 候选**（模板资产可迁） |
| `llm/` | 多厂商适配器 registry · 流式 | **P1**（适配层可留 TS 或双实现） |
| `evaluation/` | EvalCaseSet · 批跑 · promptfoo 导出 · 结构化对照 | **P0 候选**（批跑/评测） |
| `compare/` | 对照服务 | **P1** |
| `history/` · `favorite/` · `context/` | 本地领域数据 | **L2**（随存储策略） |
| `model/` · `image-model/` | 模型配置 | 桌面/面板侧 |
| `image/` · `image-understanding/` | 图像生成与理解 | **P1/P2** |
| `variable-extraction/` · `variable-value-generation/` | 变量抽取/生成 | **P1** |
| `storage/` | localStorage / Dexie / SecretAware | **不**迁 Python 热路径 |
| `data/` | 导入导出（默认脱敏） | 契约保留 |
| `preference/` | 偏好 | 本地 |

### 1.4 Electron 壳边界

| 层 | 路径 | 说明 |
|----|------|------|
| main | `packages/desktop/main.js` + `config/*` | composition root · 更新 · 代理 · safeStorage |
| 装配 | `config/service-container.js` | storage → preference → managers → LLM/Prompt/Image |
| IPC 清单 | `config/ipc/channel-manifest.js` · **协议 1.1.0** | 域：model/image/template/prompt/llm/history/favorite/data/preference/system/update… |
| 安全 | `ipc-security.js` · `registerSensitiveIpc` / `secureHandle` | sender 校验 · stream owner |
| preload | `preload.js` | 显式 API 表面 |
| 远程存储 | `remote-storage.js` + AWS SDK / WebDAV | **仅 main**（UI 已去 `@aws-sdk`） |
| 渲染 | `web-dist`（web 构建物） | 与 Web 同源 UI |

### 1.5 面板（Console）

| 项 | 事实 |
|----|------|
| 框架 | **Vue 3 + TypeScript + Naive UI** |
| 包 | `@mindsync/ui`（主体）· `@mindsync/web`（薄入口） |
| 设计 | Paper 主题 + redesign shell flag（默认 **OFF**）· R0–R4 已合 develop |
| 状态 | Pinia · vue-i18n · vue-router |
| 与目标栈 | **前端面板已对齐** `TS + Vue3 + NaiveUI`（无需换栈） |

---

## 2. 语言与体量占比（近似 · 源文件 · 排除 node_modules/dist）

| 语言/形态 | 文件数（packages+api+scripts 粗计） | 约 LOC（packages） | 角色 |
|-----------|-------------------------------------|--------------------|------|
| **TypeScript (.ts)** | ~900 | ~24k（+ core 服务） | 领域与工具 |
| **Vue (.vue)** | ~131 | ~65k | 面板 UI |
| **JavaScript (.js/.mjs)** | ~100+ | desktop ~10k · scripts/api | Electron 壳 / 门闩 / 脚本 |
| **Python** | **0** | 0 | — |
| **Go** | **0** | 0 | — |
| **C / 固件** | **0** | 0 | — |
| **SQL** | **0** | 0 | 无服务端库表 |

**按包约 LOC（ts+vue+js，去 dist）**

| 包 | 约 LOC | 标签暗示 |
|----|--------|----------|
| `ui` | ~59k | 面板主战场 · **保留** |
| `core` | ~48k | AI 核 · **迁出候选** |
| `desktop` | ~10k | Electron 壳 · **暂留** |
| `mcp-server` | ~2.5k | 工具面 · 可旁挂 AI-Core |
| `web` | ~0.8k | 壳 · **保留** |
| `extension` | ~0.1k | 薄壳 · **L2** |

---

## 3. 对外 API 与集成面

| 面 | 协议 | 实现 | 鉴权 |
|----|------|------|------|
| **LLM/图像厂商** | HTTPS REST/SDK | `core` adapters（OpenAI/Anthropic/Gemini/…） | 用户 API Key |
| **Electron IPC** | invoke + stream events | `channel-manifest` 域 handlers | 进程边界 + sender 校验 |
| **MCP** | MCP SDK · HTTP/stdio | `mcp-server` · Express | Bearer（非 loopback 强制 token） |
| **Vercel Access** | HTTP `/api/*` | `api/auth.js` + HMAC session Cookie | 共享口令会话（非业务多租户） |
| **Web 静态** | SPA | nginx / Vercel / Cloudflare Pages assets | 可选门闩 |
| **远程备份** | S3/R2/WebDAV | **仅 Desktop main** | 用户凭证 |
| **自动更新** | electron-updater | GitHub releases | 公开渠道 |

**无**：面向多租户的 Go BFF、gRPC、统一 OpenAPI 产品网关、服务端会话用户体系。

---

## 4. 数据存储（As-Is）

| 存储 | 位置 | 内容 |
|------|------|------|
| **localStorage / Dexie (IndexedDB)** | 浏览器 / 渲染进程 | 历史、偏好、部分领域数据（Web） |
| **Electron userData + 文件** | Desktop main | 偏好、模型配置、加密字段 |
| **safeStorage** | OS 级 · Desktop | `apiKey` 等 `__enc:v1:` |
| **导出 JSON** | 用户文件 | 全量备份；**默认脱敏 Key**；含 EvalCaseSet/favorites |
| **无 Postgres/SQLite 服务端库** | — | 本地优先；非 SaaS 多租户 |

与目标栈 **SQL（Postgres 优先）** 对比：MindSync **当前无** 服务端任务表/作业状态；若上 Python 批跑，**新** SQL 为增量，非替换本地库。

---

## 5. 部署形态

| 形态 | 路径 | 栈 |
|------|------|-----|
| Desktop NSIS/zip | electron-builder · appId `com.xvyimu.mindsync` | Electron 41 |
| Docker | nginx 静态 web + supervisor MCP · 用户 `app`/10001 里程碑 | Node 构建 |
| Vercel | `packages/web/dist` + `/api` | Node serverless 薄 |
| Cloudflare | wrangler assets SPA | 静态 |
| MCP 独立进程 | `prompt-optimizer-mcp` bin | Node |

---

## 6. 与目标栈偏离清单

目标分层（总规划）：

```
Vue3+NaiveUI → Go 网关 → Python AI-Core → SQL / 对象存储 / 设备
```

| 层 | 目标 | MindSync As-Is | 偏离 | 建议标签 |
|----|------|----------------|------|----------|
| 面板 | TS+Vue3+NaiveUI | **已是** Vue3+NaiveUI+TS | **对齐** | **保留** |
| 网关 | Go auth/rate/route | 无；仅 Vercel 口令门闩 / MCP Bearer | **大** | **P2 可选**（本地产品可弱化） |
| AI 核 | Python | **全在 TS core** | **大** | **P1 抽离** |
| 数据 | SQL | 本地 KV/文件/Dexie | **中** | 批跑任务表 **新增** |
| 壳 | （未强制） | Electron | 目标允许暂留 | **暂留** |
| 底层 C | 嵌入式 | 无 | 无关本产品 | **SIDE 不进仓** |
| 工具 | Git/Shell/SQL | Git + Node scripts（非 Shell 为主） | 小 | scripts 可逐步 Shell 化 |

---

## 7. AI 逻辑可抽到 Python 的面（重点）

### 7.1 高价值、边界相对清晰（优先）

| 能力 | 现行位置 | 抽离形态建议 | 理由 |
|------|----------|--------------|------|
| **Prompt 优化/迭代编排** | `core/services/prompt` | Python：`optimize` / `iterate` 纯函数 + 模板渲染 | 少 UI 耦合；契约 = messages in / text out |
| **模板资产** | `template/default-templates/**` | Python 包数据或 JSON 资源 | 大量静态字符串 |
| **EvalCase 批跑 + 证据 JSON** | `evaluation/eval-case-*` | Worker + 任务状态 | 批处理天然适合 Python |
| **promptfoo.yaml 导出** | `evaluation/promptfoo-export` | 同 Worker 旁路 | 互操作 |
| **结构化对照 / rewrite-from-evaluation** | `evaluation/*` · `compare` | 可选 Python | 评测链 |

### 7.2 中价值、耦合适配器

| 能力 | 说明 | 策略 |
|------|------|------|
| **LLM adapters 全家桶** | 流式、取消、多厂商 SDK | **短期保留 TS**（Electron/MCP 已接好）；Python 侧用 httpx/openai 官方 SDK **并行** 或 Go 透传 |
| **图像生成/理解** | 多 adapter | 同 LLM：热路径可暂留 TS |
| **OptimizationStrategy auto-experimental** | 默认 OFF | 迁 Python 时保持 **opt-in**（ADR-005） |

### 7.3 不宜优先迁 Python

| 能力 | 原因 |
|------|------|
| Dexie/localStorage/preference UI 绑定 | 端侧状态 |
| IPC / safeStorage / updater | Electron 特权 |
| NaiveUI 工作区组件 | 面板层 |
| 变量抽取 UI（CodeMirror） | 强交互 |

### 7.4 建议抽离契约（草稿 · 非实现）

```
POST /v1/optimize
  { mode, targetPrompt, templateId, modelRoute, stream? }
  → { optimized, meta.version, usage? }

POST /v1/eval/run
  { caseSet, promptVersion, modelRoute }
  → { results[], evidenceRef }

# 鉴权：若经 Go 网关则内网 mTLS/服务 token；本地桌面可 loopback + 用户 Key 仍只存桌面
```

面板/Desktop **永不** 直连 Python 内网端口（总规划信任边界）；本地桌面过渡期可用 **sidecar + main 代理**。

---

## 8. 相对主参考的偏离建议（保留 / 迁移 / 更好替代）

> 总规划修正：技术栈清单是 **主力参考（preferred baseline）**，非教条。须写清对比维度、证据、代价、回滚。

| 组件 | 建议 | 对比维度 | 证据 | 代价 | 回滚 |
|------|------|----------|------|------|------|
| **Vue3+NaiveUI 面板** | **保留** | 适配本仓 / 成本 | 已是主 UI · redesign 投入 | 0 | — |
| **Electron 壳** | **保留（中期）** | 桌面分发 / Key 安全 | safeStorage、IPC 硬化已做 | 换 Tauri/纯 Web 重写大 | 维持 NSIS 通道 |
| **TS core 作为本地热路径** | **短期保留 + 绞杀迁出** | 延迟 / 离线 | 同步优化 UX 依赖进程内 LLM 流 | 双实现期成本 | feature flag 回 TS |
| **Python AI-Core** | **迁移（P1）** | 架构清晰 / 批处理 / 与产品线统一 | 总规划 SSOT；评测/批跑适合 Worker | 契约测试、双栈运维 | sidecar 可关 |
| **Go 网关** | **本地桌面：延后**；**若 SaaS 化：再上** | 总成本 | 当前无多租户/计费；仅口令门闩 | 上 Go 为新子系统 | 保持 Vercel/MCP |
| **Postgres** | **仅 AI 作业状态时引入** | 需求匹配 | 无多用户数据面 | 运维面扩大 | 作业可先 SQLite 文件 |
| **React/Next 面板** | **禁止引入** | 杂学 | 已有 Vue | — | — |
| **在 Go 写 LLM 业务** | **禁止** | 边界 | 总规划 §1.1 | — | — |
| **MCP 维持 Node** | **保留或薄封装 Python 工具** | 生态 | MCP SDK 已接 core | 低 | 保持 Node MCP |

**同层主实现原则**：面板层 = Vue only；AI 批处理层目标 = Python only（TS core 标 **LEGACY/绞杀中**）；网关层有需求再 Go。

---

## 9. 迁移风险

| ID | 风险 | 等级 | 缓解 |
|----|------|------|------|
| R1 | 流式优化体验回退（Python 多一跳） | 高 | Desktop main 代理流式；先迁批跑非交互路径 |
| R2 | 双实现漂移（TS vs Python 模板/策略） | 高 | 契约测试 + 模板单一真相（JSON 资源） |
| R3 | Key 泄漏面扩大（服务端） | 高 | Key 仍优先本地；服务端仅用户显式 BYOK 或临时 token |
| R4 | AGPL 传染与独立仓策略 | 中 | 抽离仓许可单独评估；不默认回上游 |
| R5 | Electron + sidecar 打包复杂 | 中 | 可选「仅 Web+云 AI-Core」通道 |
| R6 | 无 SQL 经验路径却上 Postgres | 中 | 作业表从 SQLite 起步 |
| R7 | 范围蔓延成「重写整个 monorepo」 | 高 | 绞杀者：先 A2 评测/优化 API，不动 UI |

---

## 10. 建议标签总表（产品级）

| 标签 | 含义 | MindSync 映射 |
|------|------|----------------|
| **P1** | 核心服务抽离优先于旗舰网关 | **本产品主标签** |
| **P0** | （产品线级）TransitHub 旗舰 | 非 MindSync |
| **L2** | 内容/次要遗留 | extension 薄壳、部分 Web 门闩可 L2 维护 |
| **LEGACY** | 冻结或绞杀中 | 迁出后的 **TS prompt/eval 实现** |
| **TOOL** | 开发者工具维持 | 仓库内 scripts/MCP 可类 TOOL |
| **SIDE** | 嵌入式 | **不进本仓** |

**包级标签建议**

| 包/面 | 标签 |
|-------|------|
| `packages/ui` + `web` | **保留 · 对齐 Console** |
| `packages/core` prompt/template/evaluation | **P1 迁 Python** |
| `packages/core` llm/image adapters | **过渡双栈 / 后迁** |
| `packages/desktop` | **壳暂留** |
| `packages/mcp-server` | **TOOL** · 可改为调 AI-Core |
| `api/*` Vercel 门闩 | **L2** 直至有 Go 网关 |
| Docker nginx 静态 | **保留** |

---

## 11. 与总规划 Phase 的衔接（MindSync 视角）

| Phase | 总规划 | MindSync 动作（建议 · 未实施） |
|-------|--------|--------------------------------|
| 0 | 冻结杂学微重构 | **已 halt** R5 等无关栈目标工作 |
| 1 | TransitHub 旗舰 | MindSync **不抢 P0** |
| 2 | Python AI-Core | **A2 主战场**：optimize + eval 契约 |
| 3 | 横切 Git/Shell/SQL | 发布脚本与作业表 |
| 4–6 | 内容/工具/嵌入式/LexVoyage | 无关或 SIDE |

---

## 12. 明确不做（测绘结论）

- 不把 MindSync 改成 React/Next  
- 不在本仓引入嵌入式 C 树  
- 不为「洁癖」重写 Naive 面板  
- 不在无 SaaS 需求时强行上完整 Go 多租户网关  
- 不把支付回调/订单等无关模板套到本仓  

---

## 13. 证据索引（仓内）

| 证据 | 路径 |
|------|------|
| 包边界宪章 | `docs/architecture/charter.md` |
| 版本/路径 SSOT | `docs/project/CURRENT.md` |
| core 导出面 | `packages/core/src/index.ts` |
| Prompt 核 | `packages/core/src/services/prompt/` |
| 策略端口 | `packages/core/src/services/prompt/optimization-strategy.ts` |
| Desktop 装配 | `packages/desktop/config/service-container.js` |
| IPC 协议 | `packages/desktop/config/ipc/channel-manifest.js` |
| MCP | `packages/mcp-server/` |
| 门闩 API | `api/auth.js` · `api/access-session.js` |
| 产品线 SSOT | `D:\orca\docs\architecture-stack-refactor-master-2026-07-22.md` |

---

## 14. 测绘结论（给协调员）

1. **面板已在目标栈内**（Vue3+NaiveUI）→ 不要为换栈而换栈。  
2. **AI 与批跑全在 TS monorepo** → 与「Python AI-Core」偏离最大，也是 **P1 唯一值得架构级动刀** 的面。  
3. **Electron 是可信边界实现**，不是杂学；中期 **保留壳 + 绞杀 core**。  
4. **Go/SQL** 对当前本地工作台是 **可选增强**，不是第一刀。  
5. 下一方案门应产出：`services/ai-core`（Python）布局 + 与 Desktop/MCP 的契约，而不是继续 UI token 微重构。

---

*End of ARCHITECTURE_ASIS · MindSync · 2026-07-22*
