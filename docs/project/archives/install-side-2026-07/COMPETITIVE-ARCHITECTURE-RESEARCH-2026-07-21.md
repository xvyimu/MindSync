# Prompt Optimizer 同类项目调研与架构优化研究报告

| 项 | 值 |
|----|----|
| 日期 | 2026-07-21 |
| 研究对象 | `xvyimu/prompt-optimizer` fork（上游 `linshenkx/prompt-optimizer`）v2.11.7 |
| 源码 | `D:\PromtOptimizer\src\prompt-optimizer` |
| 分支 tip（本机） | `ceccc57` 起（ahead origin 约 7 commits，以 `git log -1` 为准） |
| 报告性质 | 竞品学习 · 边界/约束/目标对照 · 现状优缺点 · 架构优化设计 |
| 字数目标 | ≥ 10000 汉字量级（含表格与清单） |
| 方法 | 本地代码与 SSOT 文档精读 + 公开 Web 检索（GitHub 直链抓取受限，竞品细节以检索摘要与官方定位为准） |

---

## 0. 执行摘要（给决策者的一页纸）

### 0.1 产品一句话

**Prompt Optimizer 是「本地优先、多端一致的提示词工程工作台」**：用户用自己的模型 API Key，在 Web / Desktop / 浏览器扩展 / MCP 工具面中完成提示词优化、迭代、多轮上下文、图像提示、收藏库、评估与导入导出；数据默认落在用户设备，不强制中心化后端。

### 0.2 在赛道中的位置

同类产品大致分四类：

1. **交互式提示词改写器**（PromptPerfect、各类 ChatGPT 插件/AIPRM）：偏 SaaS、模板社区、一键改写。  
2. **提示词评估与红队**（Promptfoo、部分 PromptTools）：YAML/CLI、矩阵评测、CI。  
3. **Prompt 管理与 LLMOps 平台**（Agenta、Pezzo、Langfuse、LangSmith、PromptLayer）：版本库、观测、协作、部署。  
4. **程序化提示优化框架**（DSPy、PromptWizard、OPRO 类）：把提示当可优化参数，自动搜索。

**本项目最接近第 1 类，并带第 3 类的本地子集（收藏/历史/评估）与第 2 类的弱子集（评估面板，非 CI 矩阵）。** 它与 Agenta/LangSmith 的差异是：**没有中心化租户与生产 Trace 平台野心**；与 Promptfoo 的差异是：**产品形态是 GUI 工作台而非 eval CLI**；与 DSPy 的差异是：**面向终端用户的交互优化，而非研究者/工程师的编译优化环**。

### 0.3 核心结论

| 维度 | 结论 |
|------|------|
| 产品差异化 | **隐私 + 多端 + 中文友好 + Desktop 硬化** 是真实护城河；勿与 SaaS LLMOps 正面硬刚 |
| 技术栈 | Vue3 + pnpm monorepo + Electron + 多厂商 LLM SDK 合理；包边界曾倒置，近期已向 dist 契约收敛 |
| 架构健康度 | 领域层清晰；UI 透传 core、装配上帝对象、双实现远程备份仍是主债 |
| 安全 | 近两日 P0 收敛显著（IPC secure、流式 payload、Docker 门闩、vite 白名单）；CSP/凭据落盘/公网默认仍需纪律 |
| 建议战略 | **「本地工作台」做深**：评估可复现、模板可共享、MCP 可嵌入 IDE；**不要**扩成迷你 LangSmith |

### 0.4 建议优先级（摘要）

1. **产品**：强化「优化 → 测试 → 评估 → 收藏 → 再迭代」闭环与可导出证据包。  
2. **架构**：完成 UI 直引 core、消灭 re-export；远程备份单实现；ServiceContainer 彻底化。  
3. **工程**：push 未推送 commits；生产 build 依赖 dist；CI 保持 lint+mcp+docs。  
4. **学习竞品**：评估学 Promptfoo；协作版本学 Agenta/Pezzo（可选模块）；自动优化学 DSPy（可选高级模式）。

---

## 1. 研究问题与方法

### 1.1 研究问题

1. 同类项目的**技术栈、边界、约束、目标**是什么？  
2. 它们的**代码/产品实现逻辑**如何组织（客户端 vs 平台 vs 框架）？  
3. 本仓库相对同类的**优点、短板、风险**是什么？  
4. 若以「可维护的本地优先工作台」为目标，**架构应如何演进**？

### 1.2 方法与局限

- **主证据**：本仓库 `packages/*`、`docs/PROJECT_HANDOFF.md`、`docs/project/CURRENT.md`、`docs/architecture/*`、近几日 FULL-SCAN/修复 commits。  
- **辅证据**：公开检索对 Promptfoo、Agenta、Pezzo、LangSmith、PromptLayer、PromptWizard、DSPy、PromptPerfect 等的定位与对比文章（见文末 Sources）。  
- **局限**：GitHub 页面直抓在本环境不可用，星标/最新 release 数字可能漂移；**不以星标论英雄**，以问题空间与架构模式对照为准。

### 1.3 术语

| 术语 | 含义 |
|------|------|
| 工作台（Workbench） | GUI 内完成写提示、优化、测、评、存 |
| LLMOps 平台 | 多用户、版本库、观测、部署、权限 |
| 程序化优化 | DSPy 类：提示作为参数被优化器搜索 |
| 本地优先 | 默认无账号；Key 与数据在用户侧 |
| 包边界 | monorepo 内 core/ui/web 依赖方向与 dist 契约 |

---

## 2. 赛道地图与问题空间

### 2.1 用户要解决什么问题

提示词工程用户的真实任务链通常是：

```
构思意图 → 写初稿 → 改写/优化 → 用真实模型试跑 → 对照输出质量
       → 沉淀模板/收藏 → 团队共享或版本回归 → 嵌入应用/Agent
```

不同工具覆盖不同环节：

| 环节 | 代表工具 | 本项目覆盖 |
|------|----------|------------|
| 一键改写初稿 | PromptPerfect、各类插件 | **强**（系统/用户/迭代模板） |
| 多轮/角色/工具上下文 | 少数工作台 | **强**（Pro/上下文模式、工具定义） |
| 图像提示 | 垂直工具 | **中强**（文生图/图生图/多图） |
| 系统化 eval / 红队 | Promptfoo | **弱-中**（评估面板，非矩阵 CI） |
| 版本库与协作 | Agenta、PromptLayer | **弱**（本地收藏/历史，非团队租户） |
| 生产 Trace | LangSmith、Langfuse | **无**（有意不做） |
| 自动搜索最优提示 | DSPy、PromptWizard | **无/弱**（人工迭代为主） |
| 本地隐私部署 | 本项目、Promptfoo 本地、自托管 Agenta | **强** |

### 2.2 四象限定位

```
                    高自动化优化
                         │
          DSPy / PromptWizard
                         │
  本地隐私 ──────────────┼────────────── 云协作 SaaS
                         │
   ★ 本项目（工作台）     │     PromptLayer / LangSmith
   Promptfoo（eval）      │     PromptPerfect / AIPRM
                         │
                    低自动化 / 人工编辑
```

**战略含义**：向上（自动化）可做「可选高级模式」；向右（SaaS）会稀释隐私卖点且研发成本指数上升。默认应**向左下做深**（本地工作台体验与 Desktop 可靠性）。

---

## 3. 同类项目学习（技术栈 · 边界 · 约束 · 目标 · 实现逻辑）

### 3.1 交互式优化器：PromptPerfect 与模板社区

**目标**：让非专家用自然语言描述意图，得到「更好提示」。  
**边界**：通常不负责生产 Trace；可能绑定云 API。  
**约束**：商业转化、模型厂商政策、版权模板库。  
**实现逻辑**：用户输入 → 元提示（meta-prompt）调用强模型改写 → 展示 diff/多版本。  
**可学**：

- **元提示质量**决定体验上限；本项目的模板体系（系统/用户/迭代/上下文）是同类能力，应持续产品化（模板市场、评分）。  
- **垂直场景模板**（营销、代码、客服）比通用「优化一下」更有粘性。  
- **社区/市场**（PromptBase、AIPRM）解决冷启动，但与隐私本地冲突——本项目可用「可选在线花园（Prompt Garden）」而非强制账号。

**不可学**：中心化账号墙；把用户 Key 上传云端。

参考：[PromptPerfect](https://promptperfect.jina.ai/)、[AIPRM/PromptBase 类对比讨论](https://medium.com/design-bootcamp/i-tested-5-ai-prompt-libraries-for-30-days-heres-what-worked-f6efa8dc1b00)。

### 3.2 评估与红队：Promptfoo

**目标**：可复现地比较 prompt × model × 用例，并进入 CI。  
**技术栈倾向**：CLI + YAML/JS 配置、多 provider、本地运行。  
**边界**：不做重型 Desktop UI；不做企业协作中台。  
**约束**：评估成本（token）、评测集质量、假阳性红队。  
**实现逻辑**：

```
用例集 × 提示变体 × 模型 → 并发调用 → 断言/打分 → 矩阵报告 → CI 门禁
```

**对本项目的启示**：

| 学什么 | 怎么落到本项目 |
|--------|----------------|
| 用例与断言 | 评估面板支持「固定测试集 + 期望关键词/JSON schema」导出 |
| 矩阵思维 | UI 可做轻量「两模型对照」而非完整 CLI |
| 本地优先 | 与本项目哲学一致；可互操作（导出 promptfoo 配置） |
| CI | Desktop/Web 不必内嵌 promptfoo，但 **core 可提供导出适配器** |

参考：[promptfoo 介绍](https://www.promptfoo.dev/docs/intro/)、[agent evaluation 对比文](https://technspire.com/sv/blog/agent-evaluation-2026-deepeval-promptfoo-langsmith)。

### 3.3 开源 LLMOps / Prompt 管理：Agenta、Pezzo、Langfuse

**目标**：团队共享提示版本、评测、有时观测与部署。  
**技术栈倾向**：前后端分离、Postgres、容器编排、多租户。  
**边界**：平台重；个人本地「打开即用」弱于本项目。  
**约束**：运维成本、权限模型、数据驻留合规。  
**实现逻辑**：

```
Playground 编辑 → 版本提交 → 数据集评测 → 发布到 env →（可选）线上观测
```

**对本项目的启示**：

- **版本语义**：本项目 History/Favorite 是「个人时间线」，不是「不可变版本号 + 环境」。若要做团队，应**新模块**而非污染本地存储模型。  
- **自托管可选**：Docker 已有；应保持「单容器可跑」而不是 K8s 默认。  
- **不要复制全套 LLMOps**：人员与范围不匹配 fork 维护模式。

参考：[Agenta 开源 prompt 管理对比](https://agenta.ai/blog/top-open-source-prompt-management-platforms)、[Pezzo](https://github.com/pezzolabs/pezzo)、[Latitude 开源 prompt 工程工具综述](https://latitude.so/blog/top-7-open-source-tools-for-prompt-engineering-in-2025)。

### 3.4 商业可观测与工程平台：LangSmith、PromptLayer

**目标**：生产调试、数据集、人工标注队列、与框架深度集成。  
**边界**：SaaS 为主；LangSmith 与 LangChain 生态绑定深。  
**约束**：成本、数据出境、框架锁定。  
**对本项目**：对照「我们明确不做的事」——**生产 Trace、标注队列、租户计费**。本项目若加「导出运行日志」应是本地文件级，而非云端会话。

参考：[PromptLayer 对 LangSmith 的对比叙事](https://www.promptlayer.com/blog/langsmith-alternatives/)、[Braintrust 工具综述](https://www.braintrust.dev/articles/best-prompt-management-tools-2026)。

### 3.5 程序化优化：DSPy、PromptWizard、遗传/搜索类

**目标**：用算法搜索更好的提示或演示样本。  
**实现逻辑**：定义 metric → 优化器提出候选 → 在训练集上评分 → 迭代。  
**约束**：算力/token 成本、metric 设计难度、可解释性。  
**对本项目**：

- 可作为 **Pro 高级模式**：「自动优化 N 轮」调用本地配置的模型。  
- **不要**把 core 绑死在某一优化器；用适配器接口 `PromptOptimizerStrategy`。  
- 与当前「模板 + 人工迭代」可共存：人工模板提供先验，自动优化提供搜索。

参考：[awesome-prompt-optimizer](https://github.com/jina-ai/awesome-prompt-optimizer)、Microsoft PromptWizard 与 DSPy 生态讨论。

### 3.6 上游与本 Fork：linshenkx/prompt-optimizer

**上游定位**（公开描述）：开源提示词优化工具，强调易用与可自托管，在线演示与隐私叙事并存。  
**本 Fork 策略**（CURRENT/HANDOFF）：**fork-only**；Desktop 硬化、Paper 主题、流式取消、IPC 安全、文档 SSOT、评估与图像能力增强。  
**学习点**：上游贡献节奏与插件生态；**差异化**应写在 CURRENT/PRD 的 fork 增量段，避免与上游功能同质化却无法合并的分叉痛苦。

---

## 4. 本项目现状：目标、边界、约束、技术栈、实现逻辑

### 4.1 目标（As-Is / To-Be）

| 层级 | As-Is | 建议 To-Be（12 个月） |
|------|-------|----------------------|
| 用户目标 | 写更好的提示并本地保存 | 可复现的「优化证据包」+ 可嵌入 MCP/IDE |
| 产品目标 | 多端工作台 | 多端一致 UX + 可插拔策略（人工/自动优化） |
| 工程目标 | monorepo 可发版 | 包边界干净、CI 硬门禁、Desktop 可自动更新 |
| 商业/维护 | 个人 fork 维护 | 保持小核心；可选增值（主题包、模板包） |

### 4.2 边界（应写进架构宪章）

**做：**

- 本地/自托管 UI 与 Desktop  
- 多厂商 LLM/图像调用（用户 Key）  
- 模板、历史、收藏、上下文、评估  
- MCP 工具暴露优化能力  
- 导入导出与远程备份（用户配置）

**不做（默认）：**

- 多租户云账号与计费  
- 生产级分布式 Trace  
- 通用 Agent 运行时 / 任意 Shell 工具  
- 向量长期记忆中台（当前 History 截断模型足够个人场景）

### 4.3 约束

| 类型 | 约束 | 架构影响 |
|------|------|----------|
| 许可 | AGPL-3.0-only（ui 等） | 分发需合规；商业闭源集成需谨慎 |
| 运行时 | Node ^22、pnpm 10 | CI/维护者工具链锁定 |
| 隐私 | Key 与数据本地 | 禁止默认上传；vite define 白名单 |
| 维护人力 | 单人/小团队 fork | 拒绝 LLMOps 大平台范围 |
| 多端 | Web/Desktop/Ext/MCP | core 必须纯领域；UI 无 Node API |
| Electron | contextIsolation、IPC | 敏感能力只在 main；manifest 契约 |
| 上游 | fork-only | 文档与版本号双轨；慎合上游大爆改 |

### 4.4 技术栈地图

```
pnpm workspace
├── core     TypeScript · tsup · 多 LLM SDK 懒加载 · Dexie/FileStorage
├── ui       Vue3 · Naive UI · Pinia · Vite · CodeMirror · DOMPurify
├── web      Vite SPA · 注入 public VITE_* · 供 Desktop web-dist
├── desktop  Electron · electron-builder · IPC 域拆分 · stream registry
├── extension Chrome MV3 · Vite
└── mcp-server Express/HTTP + stdio · MCP SDK
```

**评价**：与「本地工作台」匹配度高；与「SaaS LLMOps」相比缺少后端 BFF 是**优点**（攻击面小），不是缺陷。

### 4.5 实现逻辑（主路径）

#### 4.5.1 优化主路径

```
UI composable (usePromptOptimizer)
  → IPromptService.optimizePromptStream / iteratePromptStream
      → TemplateManager 取模板
      → TemplateProcessor 变量与上下文
      → ILLMService.sendMessageStream
          → AdapterRegistry → 厂商 SDK
      → StreamHandlers 回写 UI
  → HistoryManager 记录链（UI 侧协调）
```

Desktop 变体：

```
Renderer Proxy (Electron*Proxy)
  → preload invoke / stream events
  → main registerSensitiveIpc + owned stream
  → 同一 core 服务实例
```

#### 4.5.2 存储主路径

```
Web/Ext: Dexie / localStorage 适配
Desktop: FileStorageProvider(userData) + flush on quit
跨端键：storage-key-architecture 白名单文档
图片：分库 / 资产 GC（favorite assets）
```

#### 4.5.3 部署主路径

```
Docker: nginx(SPA+BasicAuth) + supervisord(MCP loopback)
Vercel: api/auth HMAC session
Desktop: NSIS + app.asar + electron-updater(fork repo)
```

### 4.6 包与信任边界（目标态）

```
extension/web ──► ui(组件) ──► core(领域)
desktop main ──► core
mcp-server ──► core
renderer ──IPC──► main ──► core
禁止：core → ui；ui 不应成为 core 的公共 facade（兼容层应消亡）
```

近几日边界改进：web/extension 声明 core 依赖；production vite 不强制 source alias；UI re-export 标 deprecated。

---

## 5. 全面优缺点扫描（对照竞品与自身代码）

### 5.1 优点（应保留并写进对外叙事）

1. **本地优先真实落地**：非「口头隐私」；Desktop 文件存储 + 用户 Key。  
2. **多端一套领域模型**：core 服务接口统一，避免四端四套业务。  
3. **模板驱动优化**：比纯 Chat「帮我改提示」更可产品化、可测试。  
4. **Desktop 安全意识提升快**：IPC sender 校验、stream 所有权取消、错误信封收敛。  
5. **文档 SSOT 成熟**：CURRENT / HANDOFF / DOCS_POLICY / check:docs 对单人维护极重要。  
6. **MCP 入口**：把工作台能力送进 IDE/Agent 宿主，符合 2025–2026 工具分发趋势。  
7. **图像与多模态评估路径**：差异化于纯文本 eval CLI。  
8. **中文与主题（Paper）**：区域用户体验优势。

### 5.2 缺点与债务（按严重度）

#### A. 架构与边界

| 问题 | 表现 | 竞品对照 |
|------|------|----------|
| UI 曾/仍 re-export core 工厂 | 包边界倒置；web 曾只声明 ui | Agenta 等前后端分离更干净 |
| 生产/开发 alias 分裂历史 | 源码直指导致 dist 契约弱 | 成熟 monorepo 用 exports 条件导出 |
| main 装配上帝对象 | 多 let + 长 initialize | 平台型项目用 DI；本项目用 ServiceContainer 即可 |
| 远程备份双实现 | UI S3 SDK + desktop remote-storage | 应单侧实现 |
| 同步/流式 API 重复 | PromptService 双方法历史债 | 应用「构建消息 + 两种发送」 |

#### B. 产品能力缺口（对用户）

| 缺口 | 用户感知 | 可借鉴 |
|------|----------|--------|
| 无系统化测试集/CI eval | 「感觉更好」不可证 | Promptfoo |
| 无团队版本与评论 | 无法协作 | Agenta |
| 无自动搜索优化 | 高级用户不够爽 | DSPy/PromptWizard |
| 收藏曾不进全量导出 | 换机丢数据 | 已修方向：DataManager 纳入 favorites |
| 历史硬截断 50 | 静默丢历史 | 可配置 + 导出提醒 |

#### C. 安全与部署

| 问题 | 状态（2026-07-21 本机） |
|------|------------------------|
| 流式 finish 丢 payload | 已修 |
| Markdown 错误 innerHTML | 已修 |
| Docker 空密码 | 已强制 ACCESS_PASSWORD |
| vite 全量 VITE_* | 已白名单 |
| IPC stack 泄露 | 已收敛 |
| CSP 过宽 | 已收紧一轮 |
| 凭据 localStorage | **仍开放** |
| Google Client 硬编码 | **已去默认** |
| sandbox | **已开** |

#### D. 工程与维护

| 问题 | 影响 |
|------|------|
| 多 commits 未 push | 远端 CI/备份滞后 |
| engines Node 22 vs 本机 24 | 开发摩擦 |
| 评估 as any 历史 | 已收敛一轮 |
| 双 docs 根（源码 docs vs D:\PromtOptimizer\docs） | 审计报告易漂 |

### 5.3 与四类竞品的 SWOT（简化）

**相对 Promptfoo**：体验强、系统 eval 弱 → 做导出与轻量对照。  
**相对 Agenta**：落地快、协作弱 → 保持个人；可选「导出到平台」。  
**相对 PromptPerfect**：开源可控、云智能弱 → 模板与多模型是长板。  
**相对 DSPy**：易用、自动弱 → 高级模式插件化。

---

## 6. 架构优化设计（目标架构与迁移）

### 6.1 设计原则（建议写入 architecture 宪章）

1. **领域纯净**：core 无 Vue、无 Electron、无 DOM。  
2. **单向依赖**：app → ui → core；desktop/mcp → core。  
3. **敏感在 main**：密钥、文件、更新、远程存储。  
4. **契约显式**：IPC channel-manifest + assert；流式 payload 类型化。  
5. **本地默认**：云能力全是 opt-in。  
6. **可测**：ServiceContainer 可替换存储与 LLM。  
7. **小核心**：新能力优先插件/适配器，不扩平台。

### 6.2 目标逻辑架构

```
┌─────────────────────────────────────────────┐
│ App Shells: web / extension / desktop-renderer │
│  - 路由壳、主题、i18n 安装                      │
└───────────────────┬─────────────────────────┘
                    │ 只依赖 ui 组件 + core 类型/工厂
┌───────────────────▼─────────────────────────┐
│ ui: 纯展示与交互编排（composables）              │
│  - 无 S3 SDK；远程备份只调接口                   │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│ core: 领域服务                                 │
│  Prompt / LLM / Template / History / Favorite  │
│  Evaluation / Image / Storage ports            │
│  strategies: ManualTemplate | AutoSearch(可选) │
└───────┬───────────────────────────┬─────────┘
        │                           │
┌───────▼─────────┐       ┌─────────▼──────────┐
│ desktop main    │       │ mcp-server         │
│ container+IPC   │       │ tools+auth         │
└─────────────────┘       └────────────────────┘
```

### 6.3 关键模块重构提案

#### 6.3.1 消灭 UI 对 core 的 facade

**现状**：`ui/src/index.ts` re-export 工厂与 Electron Proxy。  
**目标**：ui 只 export 组件/composable/类型；工厂由 app 或 composable **内部** `from '@prompt-optimizer/core'`。  
**步骤**：

1. UI 包内所有 `createX` 改为直引 core（已部分完成于 useAppInitializer）。  
2. 删除 index re-export（或保留一版 re-export 但 build 时报 deprecated warning）。  
3. web/extension 若需工厂，显式依赖 core（已声明依赖）。  

#### 6.3.2 远程备份端口化

```
interface RemoteObjectStorePort { head/get/put/list/delete }
Desktop: Node 实现（现 remote-storage.js）
Web: 仅走受限实现或提示「请用 Desktop」
UI: 只依赖 Port，不依赖 @aws-sdk/client-s3
```

#### 6.3.3 Prompt 服务「一次构建，两种发送」

已开始：`buildMessageOptimizationMessages` / `buildIterationMessages`。  
继续：optimizePrompt 同步/流式同样抽取；UI `handleOptimizePrompt*` 合并。

#### 6.3.4 评估与 Promptfoo 互通

```
EvaluationCaseSet (core 类型)
  → 运行：EvaluationService
  → 导出：promptfoo.yaml adapter
  → 导入：用例 JSON
```

#### 6.3.5 可选自动优化策略

```
interface OptimizationStrategy {
  optimize(seed: Prompt, metric: Metric, budget: Budget): AsyncIterable<Candidate>
}
```

默认 `TemplateLLMStrategy`（现状）；可选 `DspyBridgeStrategy`（实验）。

### 6.4 数据架构建议

| 数据 | 现状 | 建议 |
|------|------|------|
| 历史 | max 50 截断 | 配置化；导出全量；链级 GC |
| 收藏 | 已进 DataManager 方向 | 版本字段；分享包签名可选 |
| 模型配置 | 本地 JSON | 密钥 Desktop safeStorage |
| 会话 | Pinia + 分模式 | 统一 session 快照 schema |
| 评估结果 | 服务内 | 持久化「证据包」实体 |

### 6.5 安全架构建议（纵深）

1. **构建期**：vite/public 白名单（已做）。  
2. **运行期 Desktop**：sandbox + IPC assert（已做方向）。  
3. **运行期 Web**：CSP（已收紧）；无敏感 localStorage。  
4. **部署**：密码强制、health 最小化、非 root 镜像（部分做）。  
5. **供应链**：依赖审计周期；extension 产物 secrets 扫描（release 已有）。  

### 6.6 性能与配额

| 策略 | 说明 |
|------|------|
| 模型表缓存 | ModelManager 内存缓存（已做） |
| SDK 懒加载 | 已有文档 llm-sdk-lazy-loading |
| 流式 UI | 避免整篇 Markdown 过频全量渲染 |
| MCP 截断 | 结果 max chars（已做） |
| 评估预算 | UI 显示预估 token/费用（可学 Promptfoo 成本意识） |

---

## 7. 改进建议路线图（可执行）

### 7.1 0–30 天（巩固）

1. **push** 本地 commits，让 CI 吃到门禁。  
2. 完成 **UI 内直引 core + 删除 re-export**（本任务后续刀）。  
3. 远程备份 **去掉 UI 的 AWS SDK 依赖**（或标记 Desktop-only）。  
4. 产品：评估结果「一键复制证据」；历史截断提示。  
5. 文档：CURRENT 补「竞品非目标」一节，防止范围膨胀。

### 7.2 30–90 天（差异化）

1. **用例集**与双模型对照视图。  
2. **导出 promptfoo** 适配。  
3. MCP 工具增强：返回结构化 JSON（原/优/diff）。  
4. Desktop **safeStorage** 存 Key。  
5. ServiceContainer + 单一 quit 路径（quit 已统一方向）。  

### 7.3 90–180 天（可选进取）

1. 实验性 **自动优化策略**插件。  
2. 模板「花园」与本地库双向同步协议（仍可无账号）。  
3. 若有团队需求：独立 `collab` 包，不塞进 core。  

### 7.4 明确 Won't do

- 不做通用 Agent OS。  
- 不做强制云同步账号。  
- 不重写为 React 只因流行。  
- 不默认 K8s。  
- 不把 eval 做成第二套 Promptfoo（可互操作即可）。  

---

## 8. 代码级实现逻辑对照表（学习用）

| 关注点 | 竞品常见做法 | 本项目做法 | 建议 |
|--------|--------------|------------|------|
| 改写 | 单次 meta-LLM | 模板 + LLM | 保持模板；增强变量 |
| 流式 | SSE/HTTP | Adapter stream + Desktop IPC stream | 保持 payload 契约测试 |
| 存储 | DB/SaaS | File/Dexie | 保持；加强导出 |
| 鉴权 | 租户 JWT | 本地无账号；Docker Basic；Vercel HMAC | 保持分层 |
| 扩展 | 插件市场 | MCP + 扩展 | 强化 MCP schema |
| 配置 | 云环境变量 | 用户模型管理器 | Key 加密 |
| 测试 | YAML eval | vitest + e2e VCR | 加用例集实体 |
| 更新 | 应用商店 | electron-updater | fork repo 已对齐 |

---

## 9. 风险登记册（架构视角）

| ID | 风险 | 可能性 | 影响 | 缓解 |
|----|------|--------|------|------|
| R1 | 包边界回潮（又 source alias 全开） | 中 | 高 | package-scripts 测试锁 |
| R2 | 上游大改导致分叉成本 | 中 | 中 | fork-only + 文档增量 |
| R3 | 安全回退（空密码脚本路径） | 低 | 高 | compose 强制 + 镜像构建检查 |
| R4 | 范围膨胀成 LLMOps | 中 | 高 | PRD Won't do |
| R5 | 评估不可复现损害信任 | 高 | 中 | 用例集 + 导出 |
| R6 | 单人维护过劳 | 中 | 高 | 小核心；拒平台化 |
| R7 | 依赖供应链 | 中 | 高 | 锁定 pnpm；周期审计 |

---

## 10. 结论

Prompt Optimizer（本 fork）在开源世界中应自我定位为：

> **隐私优先的多端提示词工程工作台**，而不是 LangSmith 替代品，也不是 Promptfoo 替代品。

技术栈与领域拆分整体正确；真正的胜负手在于：

1. **把闭环做完整**（测/评/存/导出证据）；  
2. **把边界做干净**（core/ui/app、IPC、备份）；  
3. **把安全做默认**（构建、部署、Desktop）；  
4. **有节制地学习竞品**（互操作与插件，而非重写平台）。

按此方向，单人 fork 可持续演进；偏离此方向，将陷入与资本型 LLMOps 的不对称竞争。

---

## 11. 附录 A：建议的「架构宪章」草案（可直接粘贴）

```markdown
# Architecture Charter — Prompt Optimizer Fork

1. core 不得依赖 ui/web/desktop/extension。
2. 新 IPC channel 必须登记 channel-manifest，并由 registerSecure* 注册。
3. 用户密钥不得进入前端静态 bundle；不得明文写日志。
4. 默认同源能力本地完成；网络同步必须显式用户动作。
5. 产品默认不做多租户与生产 Trace。
6. 大功能以适配器/策略接入，避免修改 PromptService 上帝类。
7. 文档数字只改 CURRENT；架构事实改 architecture 白名单。
```

## 12. 附录 B：功能对照矩阵（扩展）

| 功能 | 本项目 | Promptfoo | Agenta | LangSmith | PromptPerfect | DSPy |
|------|--------|-----------|--------|-----------|---------------|------|
| GUI 优化 | ● | ○ | ● | ● | ● | ○ |
| 本地无账号 | ● | ● | ○ | ○ | ○ | ● |
| Desktop | ● | ○ | ○ | ○ | ○ | ○ |
| 浏览器扩展 | ● | ○ | ○ | ○ | ○ | ○ |
| MCP | ● | ○ | ○ | ○ | ○ | ○ |
| 系统化 Eval | ○ | ● | ● | ● | ○ | ● |
| 红队 | ○ | ● | ○ | ○ | ○ | ○ |
| 团队版本 | ○ | ○ | ● | ● | ○ | ○ |
| 生产 Trace | ○ | ○ | ○ | ● | ○ | ○ |
| 自动搜索优化 | ○ | ○ | ○ | ○ | ○ | ● |
| 图像提示 | ● | ○ | ○ | ○ | ○ | ○ |
| 自托管 Docker | ● | ● | ● | 企业 | ○ | ● |

（● 强 / ○ 弱或无）

## 13. 附录 C：本仓库近态能力与债（与代码事实对齐）

**已增强（本机 develop 近提交，未必要已 push）：**  
流式 finish payload、双 toast 修复、Markdown XSS、Docker 密码与 health、vite 白名单、IPC secure、favorites 进备份、路径规范化对齐、CSP 收紧、model 缓存与可重试 init、MCP lastOptimized 与截断、ServiceContainer 抽取、quit flush 统一、evaluation 去 as any、生产 alias 策略、core 直接依赖声明等。

**仍建议优先：**  
UI 删除 core re-export 并改直引；远程备份单实现；Key safeStorage；用例集；push 与 CI 绿灯。

## 14. Sources（检索与文档）

### 14.1 本仓库 SSOT

- `docs/project/CURRENT.md`  
- `docs/PROJECT_HANDOFF.md`  
- `docs/architecture/README.md`  
- `D:\PromtOptimizer\docs\FULL-SCAN-PLAN-RECOMMENDATIONS-2026-07-21.md`  
- `D:\PromtOptimizer\docs\FULL-AUDIT-REPORT-2026-07-20.md`  

### 14.2 公开检索（竞品与综述）

- [promptfoo 文档介绍](https://www.promptfoo.dev/docs/intro/)  
- [Agenta：开源 Prompt 管理平台对比](https://agenta.ai/blog/top-open-source-prompt-management-platforms)  
- [Latitude：开源 Prompt Engineering 工具](https://latitude.so/blog/top-7-open-source-tools-for-prompt-engineering-in-2025)  
- [Braintrust：Prompt 管理工具综述](https://www.braintrust.dev/articles/best-prompt-management-tools-2026)  
- [PromptLayer：LangSmith 替代叙事](https://www.promptlayer.com/blog/langsmith-alternatives/)  
- [PromptPerfect](https://promptperfect.jina.ai/)  
- [Pezzo GitHub](https://github.com/pezzolabs/pezzo)  
- [Agenta GitHub](https://github.com/Agenta-AI/agenta)  
- [promptfoo GitHub](https://github.com/promptfoo/promptfoo)  
- [awesome-prompt-optimizer](https://github.com/jina-ai/awesome-prompt-optimizer)  
- [Prompt 库体验综述（Medium）](https://medium.com/design-bootcamp/i-tested-5-ai-prompt-libraries-for-30-days-heres-what-worked-f6efa8dc1b00)  
- [Agent evaluation 对比文](https://technspire.com/sv/blog/agent-evaluation-2026-deepeval-promptfoo-langsmith)  

---

## 15. 竞品深潜：实现逻辑与可迁移模式

本章把「同类项目」从名单推进到**可学习的实现模式**。对每一类给出：问题定义、典型流水线、技术选型偏好、边界纪律、对本 fork 的迁移清单。迁移清单只写「可落地动作」，不写空泛口号。

### 15.1 Promptfoo 模式：测试驱动的提示工程

**问题定义**：提示改动是否让输出在固定用例上变好？能否在 CI 里自动回答？

**典型流水线**：

1. 作者用 YAML/JS 声明：providers、prompts、tests、assertions。  
2. Runner 做笛卡尔积或显式矩阵展开。  
3. 并发请求各模型，缓存重复调用。  
4. 断言层：字符串包含、JSON schema、模型打分、相似度、自定义函数。  
5. 输出 HTML/JSON 报告；失败则非零退出码阻断合并。

**技术选型偏好**：CLI 优先、本地执行、provider 插件化、与语言无关的配置文件。  
**边界纪律**：不做账号体系；不做 Desktop 壳；把「评测」当一等公民，「编辑体验」当二等公民。  
**约束**：评测集质量决定价值；token 成本需预算；红队规则需持续更新。

**对本项目的迁移清单**：

| 优先级 | 动作 | 落点 |
|--------|------|------|
| P1 | 在 core 增加 `EvalCaseSet` 类型（input、expected、assertions） | `packages/core` |
| P1 | EvaluationService 支持批量跑用例并产出 JSON 报告 | `evaluation/service` |
| P2 | 导出 `promptfoo.yaml` 适配器（只出配置，不内嵌 CLI） | `packages/core` 或 `scripts/` |
| P2 | UI「双模型对照」视图：同一提示、两个 modelKey、并排输出 | `packages/ui` |
| P3 | Desktop/CI 可选调用本机 promptfoo（文档化，非强制依赖） | docs + optional script |

**反模式警告**：不要在 Vue 组件里写死断言逻辑；断言必须在 core 可单测。

### 15.2 Agenta / Pezzo 模式：版本化 Prompt 注册表

**问题定义**：团队如何共享「哪一版提示在生产」？如何回滚？

**典型流水线**：

1. Playground 编辑 → 保存为不可变版本号。  
2. 绑定环境（dev/staging/prod）指针。  
3. 运行时 SDK 拉取「环境当前版本」。  
4. 观测层记录 completion 与成本（Pezzo/Langfuse 更强调）。  

**技术选型偏好**：Postgres、容器、服务端 API、多租户或至少多项目。  
**边界纪律**：UI 与 runtime 分离；版本不可变；权限在服务端。

**对本项目的迁移清单**：

| 优先级 | 动作 | 说明 |
|--------|------|------|
| P0 | **不**在 core 引入多租户 | 维护不动 |
| P1 | Favorite/Template 增加可选 `semver` 或 `revision` 字段 | 个人版本语义 |
| P2 | 「导出注册表包」：模板+变量 schema+示例输入 | 文件级协作 |
| P3 | 若未来要协作：独立 `collab-server` 包，勿污染 core | 可选 |

**可学点**：版本不可变；**不可学点**：默认账号墙。

### 15.3 LangSmith / PromptLayer 模式：生产可观测

**问题定义**：线上链路哪里慢、哪里错、哪次提示变更导致回归？

**典型流水线**：应用埋点 → Trace/Span → 数据集抽样 → 人工标注 → 回归集。  

**对本项目**：「明确不做」应写进 PRD（已有类似表述）。若用户需要调试，提供：

- 本地「运行日志抽屉」（脱敏后的 request/response 摘要）；  
- 一键导出 JSONL；  
- **永不默认上传**。

### 15.4 PromptPerfect / 插件社区模式：消费级改写

**问题定义**：我不会写提示，给我一个更好的。

**流水线**：短输入 → 云端强模型 meta-prompt → 多风格输出 → 复制。  

**对本项目**：模板库 + 优化模式已经覆盖主路径。应加强：

1. **场景模板发现**（按任务类型推荐模板，而非只给高级用户模板 ID）。  
2. **结果解释**：为何这样改（结构/约束/角色）——评估摘要可承担。  
3. **一键应用到工作区**（已有部分 favorite apply 能力，应统一入口）。

### 15.5 DSPy / PromptWizard 模式：提示作为可优化参数

**问题定义**：给定 metric 与预算，自动找到更好的提示或 few-shot。

**流水线**：定义程序（签名）→ 优化器提议 → 在训练集评估 → 输出编译后提示。  

**对本项目的接口草图**：

```ts
// 概念接口，非现码
interface OptimizationStrategy {
  readonly id: string
  readonly displayName: string
  /** 预算：轮数、maxTokens、maxUSD */
  optimize(input: {
    seedPrompt: string
    mode: 'system' | 'user'
    metric: (candidate: string) => Promise<number>
    budget: { maxRounds: number; maxModelCalls: number }
  }): AsyncGenerator<{ prompt: string; score: number; note?: string }>
}
```

默认策略 = 现状模板 LLM 改写；实验策略 = 外部进程/脚本调用 DSPy，结果回灌工作区。  
**关键纪律**：自动优化必须显示成本预估与可取消（本项目已有 AbortSignal 传统）。

### 15.6 上游 linshenkx/prompt-optimizer 与 fork 策略

上游提供：品牌认知、基础功能、社区 issue 池。  
本 fork 提供：Desktop 安全、主题、文档体系、评估/图像/MCP 硬化。  

**分叉治理建议**：

1. 每月只合上游「安全/依赖」类，慎合 UI 大爆改。  
2. fork 增量功能一律带 feature flag 或独立目录，减少冲突面。  
3. 对外叙事用「基于 prompt-optimizer 的增强发行版」，避免商标误解。  
4. 继续 fork-only，除非上游明确欢迎且许可兼容。

---

## 16. 本项目模块级深描（优缺点与改进）

### 16.1 packages/core

**职责**：LLM、Prompt、Template、History、Favorite、Evaluation、Image、Storage 端口。  
**优点**：领域聚合清晰；electron 子路径隔离代理；SDK 懒加载降低启动成本；ImportExportable 接口统一备份。  
**缺点**：PromptService 曾严重双轨（同步/流式），仍有更多方法可抽取；Evaluation 解析历史脆弱；StorageFactory 单例限制测试隔离。  
**改进**：

- 全部「构建 messages + send/sendStream」模式化。  
- Evaluation 用 zod 校验模型 JSON（已部分去 as any）。  
- Storage 支持 scopeId 便于测试与多档案。  

### 16.2 packages/ui

**职责**：Vue 组件、工作区、主题、i18n、composable 编排。  
**优点**：Naive UI 体系完整；Paper 主题差异化；工作区模式覆盖 Basic/Pro/Image。  
**缺点**：index 聚合导出过多；曾 re-export core 工厂造成边界污染；远程备份拉入 AWS SDK 膨胀 bundle。  
**改进**：

- 删除或彻底 deprecated re-export（进行中）。  
- composable 全部 `from '@prompt-optimizer/core'`。  
- 远程备份改为 Port，Web 可降级提示。  

### 16.3 packages/desktop

**职责**：Electron 主进程、preload、自动更新、文件存储。  
**优点**：IPC 域拆分；stream 所有权取消；secure 注册；ServiceContainer 抽取方向正确。  
**缺点**：main.js 仍偏大；更新错误信封曾泄露 stack（已收敛）；dev-app-update 曾指上游（已改 fork）。  
**改进**：继续缩小 main 为「生命周期 + 接线」；safeStorage 存 Key；完整 e2e 冒烟挂 CI 可选 job。  

### 16.4 packages/web & extension

**职责**：壳应用。  
**优点**：极薄，逻辑在 ui。  
**缺点**：曾不声明 core 依赖；extension 开发强制 HTTPS 摩擦。  
**改进**：已声明 core；production 走 dist；extension dev HTTPS 可文档化「首次信任证书」。  

### 16.5 packages/mcp-server

**职责**：把优化能力暴露给 MCP 宿主。  
**优点**：与 IDE/Agent 生态对齐；参数校验；health 最小化；结果截断。  
**缺点**：工具面仍窄；iterate 语义曾用 prompt 冒充 lastOptimized（已增强参数）。  
**改进**：结构化返回（original/optimized/model/templateId）；可选 progress；工具级 rate limit。  

### 16.6 部署面 docker / vercel

**优点**：单容器路径清晰；public VITE 过滤；HMAC 会话。  
**缺点**：公网默认仍依赖运维纪律；supervisord 权限模型；镜像名/渠道 fork 分裂历史问题。  
**改进**：发布「加固 compose 示例」；非 root 镜像里程碑；文档大字警告。  

### 16.7 文档与工程

**优点**：CURRENT/HANDOFF/check:docs 在开源个人项目中属第一梯队。  
**缺点**：源码 docs 与 `D:\PromtOptimizer\docs` 双根；审计报告与代码进度需人工同步。  
**改进**：审计报告索引链回 CURRENT；发版时改 CURRENT 日期与 tip。  

---

## 17. 用户旅程与体验债

### 17.1 新用户 15 分钟旅程

1. 安装 Desktop 或打开 Web。  
2. 配置至少一个模型 Key。  
3. 选择系统/用户模式，输入提示，点优化。  
4. 流式查看结果，复制或再迭代。  
5. 可选：测试区试跑，收藏。  

**摩擦点**：

- Key 配置心智（多厂商字段）。  
- 模板过多不知选哪个。  
- 评估入口不够「主路径化」。  
- 历史静默截断无感知。  

**改进**：

- 首次引导：只配一个提供商 + 推荐模板。  
- 优化完成 CTA：「测试」「评估」「收藏」三按钮固定。  
- 历史接近上限时警告。  

### 17.2 高级用户旅程

- 多消息上下文中优化单句。  
- 工具定义注入。  
- 图像工作流。  
- MCP 从 Cursor/其他宿主调用。  

**摩擦点**：Pro 模式信息架构重；MCP 返回纯文本不利于再加工。  

### 17.3 团队用户旅程（非目标但常被要求）

当前应用**个人库文件导出**应付；若强需求，应外置协作服务，而不是把 Pinia 状态强行变多用户。

---

## 18. 详细架构迁移剧本（90 天）

### 阶段 A（第 1–2 周）：边界冻结

1. UI 内全部工厂改为 `@prompt-optimizer/core` 直引。  
2. 删除 `ui/src/index.ts` 中工厂/Proxy re-export。  
3. package-scripts 测试锁定 web/extension 依赖与 build alias 策略。  
4. push 远端，确认 CI lint+mcp+gate。  

**验收**：`rg "from '@prompt-optimizer/core'" packages/ui` 覆盖工厂；`ui/index.ts` 无 createX re-export；CI 绿。

### 阶段 B（第 3–5 周）：数据与安全

1. Desktop safeStorage 包装 API Key 字段。  
2. 远程备份移除 UI AWS SDK（或动态 import + Desktop-only）。  
3. 历史上限配置化 + UI 警告。  
4. 评估结果持久化实体 `EvaluationRun`。  

**验收**：导出包含 favorites+evaluationRuns；Web bundle 无 aws-sdk 或显著减小。

### 阶段 C（第 6–9 周）：评测与互操作

1. EvalCaseSet CRUD（本地）。  
2. 批量跑 + JSON 报告。  
3. promptfoo 导出。  
4. 双模型对照 UI。  

**验收**：用户可保存 10 条用例并一键重跑；可导出文件被 promptfoo 接受（文档级验证）。

### 阶段 D（第 10–12 周）：可选智能

1. OptimizationStrategy 接口。  
2. 实验开关「自动优化（费 token）」。  
3. 成本预估与取消。  

**验收**：默认关闭；开启后可取消；日志无密钥。

---

## 19. 架构决策记录（ADR 草案集）

### ADR-001：本地优先，不做默认云账号

- **状态**：Accepted  
- **上下文**：竞品多向 SaaS 协作。  
- **决策**：默认无账号；云能力 opt-in。  
- **后果**：协作弱；隐私强；运维简单。  

### ADR-002：core 为唯一领域层

- **状态**：Accepted  
- **决策**：业务规则只在 core；ui 只编排。  
- **后果**：需严格包边界；禁止 ui re-export 工厂长期存在。  

### ADR-003：Desktop 主进程为敏感能力宿主

- **状态**：Accepted  
- **决策**：文件、更新、远程存储、部分网络策略在 main。  
- **后果**：IPC 契约成为安全边界；必须 manifest + sender 校验。  

### ADR-004：评估可复现优先于评估花哨

- **状态**：Proposed  
- **决策**：先做用例集与导出，再做炫酷图表。  
- **后果**：对标 Promptfoo 的「可信」，而非对标 BI。  

### ADR-005：自动优化可选，默认人工模板

- **状态**：Proposed  
- **决策**：DSPy 类能力以策略插件存在。  
- **后果**：核心不被研究框架绑架。  

### ADR-006：fork-only

- **状态**：Accepted（CURRENT）  
- **决策**：默认不向上游开 PR。  
- **后果**：自由演进；需自觉合安全补丁。  

---

## 20. 指标与成功定义

### 20.1 产品指标（建议埋点仅本地聚合）

| 指标 | 定义 | 目标方向 |
|------|------|----------|
| 激活 | 首次成功优化次数 | ↑ |
| 闭环率 | 优化后发生测试或收藏的比例 | ↑ |
| 迭代深度 | 单链平均迭代次数 | 适中 |
| 导出率 | 使用导出/备份的用户比例 | ↑ |
| 崩溃率 | Desktop 会话崩溃 | ↓ |
| 取消率 | 流式取消使用 | 反映可控性 |

### 20.2 工程指标

| 指标 | 目标 |
|------|------|
| CI 必需 job 全绿 | 100% |
| P0 安全项开放数 | 0 |
| ui→core 工厂 re-export 数 | 0 |
| 关键路径单测覆盖 | 核心服务 > 现有 gate |
| 发版 checklist 机检 | check:docs + release notes |

### 20.3 架构健康评分卡（建议每季度打分）

| 维度 | 1–5 分标准 | 当前粗评 |
|------|------------|----------|
| 包边界 | 5=严格单向 | 3.5→4（改进中） |
| 安全默认 | 5=公网默认安全 | 3.5→4 |
| 可测性 | 5=领域全可单测 | 3.5 |
| 产品闭环 | 5=测评存导出完整 | 3 |
| 文档可信 | 5=SSOT 无漂移 | 4.5 |
| 范围克制 | 5=Won't do 执行好 | 4 |

---

## 21. 反模式清单（看到就打回）

1. 在 Vue 组件里直接 `new OpenAI()`。  
2. 为了省事把 core 类型只从 ui 再导出给 app。  
3. 新增 IPC 不改 manifest。  
4. 为了「企业功能」加入强制登录。  
5. 把 Promptfoo 整仓 vendoring 进 monorepo。  
6. 在渲染进程读用户数据目录。  
7. 用 `innerHTML` 拼接模型输出。  
8. 日志打印 API Key 或完整 Authorization。  
9. Docker 演示用空密码当默认。  
10. 无预算的「自动优化 100 轮」。  

---

## 22. 场景化方案设计（示例）

### 22.1 场景：自由职业提示词写手

**需求**：快速出多版本，复制到 ChatGPT/Claude 网页。  
**方案**：强化模板推荐 + 多候选输出（一次优化返回 2–3 变体，成本提示）+ 本地收藏标签。  
**不做**：团队权限。  

### 22.2 场景：独立开发者接入自己的应用

**需求**：在应用里用优化后的系统提示。  
**方案**：导出 JSON；MCP 工具返回结构化字段；可选生成「环境变量片段」。  
**不做**：托管推理。  

### 22.3 场景：安全/合规团队

**需求**：提示不泄露、可审计。  
**方案**：Desktop-only 策略；禁用远程备份；导出审计日志；CSP/加密存储。  
**可学**：Promptfoo 红队——可做成「可选检查清单」而非实时攻击模拟。  

### 22.4 场景：研究用户

**需求**：自动搜索更好提示。  
**方案**：Strategy 插件 + 外部脚本；结果回灌。  
**边界**：研究模式警告 token 消耗。  

---

## 23. 与「Agent 项目」模板的显式切割

本仓库**不是**自主 Agent 运行时：

| Agent 常见子系统 | 本项目对应 | 策略 |
|------------------|------------|------|
| 规划器 | 无 | 不做 |
| 工具调用环 | LLM tools + UI 展示；MCP 暴露优化 | 有限 |
| 长期记忆 | History/Favorite 截断存储 | 个人级 |
| 权限沙箱 | Desktop IPC/sandbox | 有 |
| 多 Agent 协作 | 无 | 不做 |

若强行按 Agent 平台建设，将失去「打开即用工作台」优势。正确做法是：**成为 Agent 宿主可调用的优质工具（MCP）**，而非成为宿主本身。

---

## 24. 沟通话术（对内/对外）

### 对外一句话

「开源、本地优先的多端提示词优化工作台：系统/用户/多轮/图像模板，评估与收藏，可 Docker，可 MCP。」

### 对内一句话

「小核心、硬边界、深闭环；协作与自动优化只能插件化。」

### 对上游

「感谢基线；本发行版聚焦 Desktop 安全与体验；默认独立维护。」

---

## 25. 结语

同类项目给出的最重要教训不是「抄功能列表」，而是：

1. **选对问题空间**（工作台 ≠ 平台 ≠ 优化器框架）；  
2. **用边界保护目标**（隐私、本地、小团队可维护）；  
3. **用契约与测试保护架构**（IPC、包导出、CI）；  
4. **用互操作代替重造**（导出到 Promptfoo/IDE，而不是内嵌第二个平台）；  
5. **用闭环定义完成**（优化后仍要测、评、存、证）；  
6. **用 Won't do 对抗焦虑**（看见 LangSmith 星标不意味着要做 Trace 云）。  

本 fork 已具备成为「中文世界最好的本地提示词工作台之一」的结构基础；下一步应是克制的产品闭环与干净的包边界，而非平台化冲动。若执行第 18 章迁移剧本并坚守第 19 章 ADR，十二个月内可以在不显著增加人力的前提下，把「能用」做成「可信、可维护、可扩展」。

---

## 26. 组织与流程建议（单人 fork 如何长期活）

开源个人项目失败，很少死于「少一个功能」，而多死于：**范围失控、文档腐烂、安全回退、发布不可重复**。下列流程把竞品学习落到「每周能做完」的节奏。

### 26.1 一周节奏（建议）

| 日 | 焦点 | 产出 |
|----|------|------|
| 一 | 安全与 CI | 看 CI、依赖告警、issue 里的崩溃 |
| 二 | 核心路径 bug | 优化/迭代/流式/IPC |
| 三 | 产品闭环 | 测试区、评估、收藏任一小改进 |
| 四 | 边界与债 | 包边界、删除死代码、补测试 |
| 五 | 文档与发版准备 | CURRENT、CHANGELOG、手测清单 |
| 周末可选 | 竞品一小时 | 只记「可迁移一条」 |

### 26.2 变更分级

| 级别 | 例子 | 要求 |
|------|------|------|
| S0 | 文案、主题 token | 自测截图 |
| S1 | 单服务逻辑 | 单测或契约测 |
| S2 | IPC/存储/安全 | 契约测 + 手测 Desktop |
| S3 | 多包边界/发版 | CI 全绿 + 安装包冒烟 |

### 26.3 发布列车

1. `pnpm check:docs` 与 `pnpm test:gate` 绿。  
2. Desktop `build:ci` 产物可启动、可优化一轮。  
3. CURRENT 版本与日期更新。  
4. tag 与 release notes。  
5. 安装侧 README 链接检查。  

### 26.4 学习竞品的「一条规则」

每次看竞品只允许带回 **一个** 可执行项（例如「导出 promptfoo」），禁止一次性开三个平台级 epic。这条规则是单人维护的生命线。

---

## 27. 技术债看板（按主题归并）

### 27.1 边界债

- UI 工厂 re-export 删除（进行中任务）。  
- UI 内深层 import 统一 `@prompt-optimizer/core`。  
- 生产构建必须先 build core/ui 再 build web（文档与 CI 顺序）。  

### 27.2 安全债

- 远程备份凭据存储形态。  
- generate-auth 在非 compose 路径的空密码行为。  
- 依赖 CVE 周期扫描（可依赖 GitHub Dependabot）。  

### 27.3 产品债

- 用例集实体缺失。  
- 模板发现性不足。  
- 评估主路径不显眼。  
- MCP 返回值结构化不足。  

### 27.4 性能债

- 大历史列表渲染。  
- 流式 Markdown 全量重绘。  
- 图像资产 GC 策略可观测性。  

### 27.5 文档债

- FULL-SCAN 进度与代码不同步时需改摘要。  
- 架构白名单外的旧 md 易误导，需继续冻结横幅。  

---

## 28. 目标架构的序列图（文字版）

### 28.1 优化流（Desktop）

```
用户点击优化
  → UI usePromptOptimizer
  → ElectronPromptServiceProxy.optimizePromptStream
  → preload: invoke prompt-optimizePromptStream + 监听 stream-* 
  → main: registerSensitiveIpc → PromptService
  → LLMService → Adapter → 厂商 API
  → onToken/onFinish(payload)/onError 回传
  → UI 更新 + 可选 History/Favorite
```

**检查点**：finish 必须带 payload；取消必须 owner 校验；错误不得双 toast。

### 28.2 备份流（目标）

```
用户导出
  → DataManager.exportAllData
  → 各服务 exportData（含 favorites）
  → 可选加密
  → 文件保存 或 RemoteObjectStorePort.put
```

**检查点**：Web 与 Desktop 同一 JSON schema；远程路径规范化一致。

### 28.3 评估流（目标）

```
用例集 → EvaluationService.batch
  → 每条：构造请求 → LLM → 解析分数 → 记录 EvaluationRun
  → UI 报告 / 导出 JSON / 导出 promptfoo
```

---

## 29. 资源与成本模型（为何不要盲目自动优化）

假设单次优化调用平均：

- 输入 2k tokens，输出 1k tokens，单价按中等模型估算。  
- 人工迭代 3 次 ≈ 3 次调用。  
- 若自动优化 30 轮搜索 ≈ 10 倍成本，且 metric 不良时结果无意义。  

因此产品策略应是：

1. 默认人工模板优化（低成本、可解释）。  
2. 自动优化单独入口 + 预算滑条 + 实时消耗。  
3. 评估用例先小后大，避免「一键烧钱」。  

这与 Promptfoo 强调缓存、本项目强调取消按钮，是同一成本哲学的不同表面。

---

## 30. 从调研到下一刀代码的接口

本调研若要立刻化为代码，推荐顺序（与实现任务对齐）：

1. **UI 直引 core / 删除 re-export**（边界，风险中，收益高）。  
2. **EvalCaseSet 最小类型 + 本地存取**（产品闭环）。  
3. **RemoteObjectStorePort 收敛 AWS SDK**（包体与安全）。  
4. **safeStorage 包装 Key**（Desktop 安全）。  
5. **promptfoo 导出脚本**（互操作）。  

不要并行开全部；完成 1 再开 2。

---

## 31. 附录 D：建议阅读顺序（新贡献者）

1. `docs/project/CURRENT.md`（版本与路径）  
2. `docs/PROJECT_HANDOFF.md`（模块与命令）  
3. 本文 §0、§4、§6、§15–§19（战略、竞品深潜与 ADR）  
4. `docs/architecture/README.md` 白名单  
5. `packages/core/src/services/prompt/service.ts` 与 `llm/`  
6. `packages/desktop/config/ipc/`  
7. FULL-SCAN / FULL-AUDIT 最新篇  
8. 本文 §18 迁移剧本与 §30 下一刀接口  

## 32. 附录 E：名词对照

| 中文 | 英文 | 备注 |
|------|------|------|
| 提示词 | Prompt | |
| 系统提示 | System prompt | |
| 元提示 | Meta-prompt | 用来改写提示的提示 |
| 用例集 | Eval set / test cases | |
| 红队 | Red teaming | 攻击性测试 |
| 可观测 | Observability | Trace/metrics/log |
| 本地优先 | Local-first | |
| 包边界 | Package boundary | |
| 发行版 | Distribution | 本 fork 相对上游 |
| 工作台 | Workbench | 本产品主形态 |
| 策略插件 | Strategy plugin | 自动优化等可插拔 |

## 33. 附录 F：竞品一页纸速查（评审会用）

### Promptfoo
- **一句话**：本地优先的提示与模型评测 CLI。  
- **学**：用例、断言、CI、缓存。  
- **不学**：放弃 GUI。  
- **对接**：导出配置。  

### Agenta
- **一句话**：开源 LLMOps，强调 playground 与版本。  
- **学**：版本不可变、环境指针。  
- **不学**：默认多租户复杂度。  
- **对接**：注册表导出包。  

### Pezzo
- **一句话**：自托管提示管理与交付。  
- **学**：SDK 拉取版本、缓存降本。  
- **不学**：重观测后端默认必备。  

### LangSmith
- **一句话**：LangChain 生态生产可观测与评测。  
- **学**：数据集与回归思维。  
- **不学**：云锁定与全量 Trace 平台。  

### PromptLayer
- **一句话**：偏视觉协作的提示工程 SaaS。  
- **学**：非技术角色可参与的编辑体验。  
- **不学**：账号墙。  

### PromptPerfect / AIPRM / PromptBase
- **一句话**：消费级改写与模板市场。  
- **学**：场景化模板与发现性。  
- **不学**：闭源云改写黑盒作为唯一路径。  

### DSPy / PromptWizard
- **一句话**：程序化或自动提示优化。  
- **学**：metric 驱动与预算。  
- **不学**：强制所有用户进入研究工作流。  

## 34. 附录 G：本 fork 能力清单（对照 PRD 与 CURRENT）

### 已具备
- 系统与用户提示优化、多轮迭代。  
- 多厂商文本模型与自定义 OpenAI 兼容端点。  
- 变量与工具上下文（Pro）。  
- 图像相关工作区与取消生成。  
- 历史链、收藏库、导入导出（含 favorites 方向）。  
- 评估面板（结构化解析增强中）。  
- Desktop 安装、自动更新、IPC 硬化。  
- Web、Docker、Vercel 访问门。  
- MCP 工具与截断、lastOptimized。  
- 文档 SSOT 与机检。  

### 明确不做（与竞品切割）
- 中心化托管对话。  
- 默认企业云协作。  
- 默认把密钥预置进公开前端。  
- 默认向上游开 PR。  
- 通用 Agent 运行时。  

### 应补齐（调研驱动）
- 用例集与可导出证据。  
- 包边界最终态（无 ui facade）。  
- 密钥安全存储。  
- 远程备份单实现。  
- 可选自动优化策略（默认关）。  

## 35. 附录 H：评审会问答预案

**问：为什么不做云协作？**  
答：目标用户与维护资源决定我们做本地工作台；协作用导出包或未来独立服务，避免 core 污染。  

**问：为什么还要 Desktop？**  
答：文件存储、更新、系统代理、安全隔离与安装即用；这是相对纯 Web SaaS 的差异化。  

**问：如何证明优化有效？**  
答：短期靠测试区与评估；中期靠用例集与导出报告；长期可对接 Promptfoo。  

**问：与上游如何相处？**  
答：fork-only；合安全补丁；功能增量独立演进并文档化。  

**问：最大技术风险？**  
答：包边界回潮与安全默认被「图省事」破坏；用契约测试和 Won't do 纪律对抗。  

**问：要不要做成 Agent 平台？**  
答：不要。应成为 MCP 工具被 Agent 调用，而不是再造宿主。  

## 36. 附录 I：九十天里程碑验收表

| 周 | 里程碑 | 验收问题（是/否） |
|----|--------|-------------------|
| 2 | 边界冻结 | UI 是否已无工厂 re-export？CI 是否全绿？ |
| 5 | 数据与安全 | Key 是否脱敏存储？导出是否含收藏？ |
| 9 | 评测互操作 | 是否能导出并在 Promptfoo 跑通最小集？ |
| 12 | 可选智能 | 自动优化是否默认关且可取消？ |

若任一项为「否」，则不进入下一阶段营销叙事，先补工程。

## 37. 附录 J：写作与传播建议

对外博客避免「最强 LLMOps」表述，推荐标题方向：

- 《为什么我们坚持本地优先的提示词工作台》  
- 《从改写到可复现：提示优化的证据链》  
- 《Desktop 安全：把 IPC 当边界而不是管道》  

对内 wiki 只链 CURRENT 与本文，避免复制版本号造成第三真相源。

## 38. 附录 K：实施检查清单（可打印）

在每次较大版本合并前，维护者可用下列清单自问：

1. 本次改动是否仍落在「本地工作台」问题空间，而没有滑向多租户平台？  
2. 是否新增了从 ui 到 core 的反向依赖或伪装 facade？  
3. 是否有新的 IPC 通道未登记、未做发送方校验？  
4. 是否有密钥、令牌、完整请求头进入日志或前端包？  
5. 流式路径是否仍支持取消，完成回调是否携带结构化结果？  
6. 导入导出是否覆盖收藏与关键用户数据，旧包是否仍可导入？  
7. Docker 与桌面安装说明是否同步，空密码与默认上游仓库是否被杜绝？  
8. 文档是否只更新了 CURRENT 中的权威数字，而不是在多处复制版本号？  
9. 是否补了能防止回归的最小测试，而不是只靠手工点一次？  
10. 若引入自动优化或外部策略，是否默认关闭、可取消、可显示成本？  

任一题答「否」时，应阻止发版宣传，先还技术债。清单的意义在于把调研中的原则，变成发布前的肌肉记忆，而不是写完报告就束之高阁。坚持这份清单，项目才能在竞品浪潮中稳住自己的节奏与边界。

---

**报告结束。**

- 路径：`D:\PromtOptimizer\docs\COMPETITIVE-ARCHITECTURE-RESEARCH-2026-07-21.md`  
- 用途：战略对齐、架构评审、新贡献者 onboarding、范围裁剪依据  
- 后续可拆：`architecture/charter.md`（宪章）+ `project/COMPETITIVE-BRIEF.md`（一页对外）  
- 相关代码债：UI 直引 core / 删除 re-export 仍为实现任务，与本调研分离推进  
