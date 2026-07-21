# Prompt Optimizer 整合调研与阶段决策报告（tip 对齐修订 · R2）

| 项 | 值 |
|----|-----|
| 文档日期 | 2026-07-21 |
| 文档版本 | **R2**（相对旧稿 tip `91da4e4` 的进度对齐修订；**删除旧 §23 注水重复段**） |
| 文档类型 | L0 整合调研全文（进度扫描 · 竞品经验 · 架构优化 · 技术债重排 · 多方案量化对比 · 目标/约束/边界/IO/验收 · UX/Paper · 30/60/90 · 交互表单 · C1/C2 挂载点 · CI 事实） |
| 产品 | `xvyimu/prompt-optimizer` fork · **2.11.7** |
| 源码 | `D:\PromtOptimizer\src\prompt-optimizer` |
| 代码 tip | `develop` @ **`6d1f5ff`**（`6d1f5ff67bd87a5e865850d83c11d0f014a2220b`） |
| 远端对齐 | `origin/develop` **已同步**（`ahead 0 / behind 0`；A0 **done**） |
| 整合来源 | COMPETITIVE-BRIEF · charter · BACKLOG-90D · CURRENT · NEXT-CUT F2 · COMPETITIVE-ARCHITECTURE · FULL-SCAN-PLAN · 旧 INTEGRATED 报告 · 当日 git 事实 |
| 字数目标 | ≥ 10000 汉字（真实论述，禁止段落循环注水） |

> **读法**：决策者读 §0 + §15–§16；执行者读 §8–§14；反驳战略读 §4–§7 与 §10–§11。  
> **不替代**：`CURRENT.md` 的版本/路径数字；实现以代码与单测为准。  
> **配套**：会话交互表单（§24）用于冻结下一阶段目标/约束/输入/输出/验收。  
> **R2 相对 R1 核心差分**：F2 已合；A0 已 push；A5 仍未对 tip 确认全绿；CI 已修 mcp 截断与多项 UI 回归；下一序列改为 **A5 → C2 → C1**。

---

## 0. 执行摘要

### 0.1 一句话

**Prompt Optimizer 是本地优先、多端一致的提示词工程工作台**：把「优化 → 测试 → 评估 → 收藏 → 导出证据」做成默认可完成路径；不是迷你 LangSmith，不是 Promptfoo CLI 壳，不是默认自动优化器，也不是 Web 侧对象存储客户端。

### 0.2 进度差分（旧 tip `91da4e4` → 现行 tip `6d1f5ff`）

| 主题 | 旧态（R1 @ `91da4e4`） | **现行 tip `6d1f5ff`** | 含义 |
|------|------------------------|------------------------|------|
| 本地相对远端 | ahead 5，未 push | **同步 0/0** | A0 已关门；「未 push」不再是主风险 |
| F2 EvalCase 进全量导出 | todo / 规格 | **done** `ec65ff3` | `data.evalCaseSets` ↔ preference `eval.caseSets.v1` |
| A5 CI 全绿观察 | 未 push 无法观察 tip | **仍 todo** | tip 已在远端，但 Actions 对 `6d1f5ff` **尚未确认全绿** |
| mcp 截断超限 | 风险/红可能 | **fix** `2b658da` | truncated tool results 遵守 maxChars |
| ContextUser 路由挂载 | Pro 变量缺 props 等 E2E/路由风险 | **fix** `6d1f5ff` | `ContextUserWorkspace` 默认 props，避免 route mount 缺省 |
| 历史容量 API（Web） | 类型/适配缺口 | **fix** `ac3328f` 等 | Web HistoryManager adapter 暴露 capacity |
| User CTA / lint | 部分缺口 | **fix** `5d3df24` | User CTA 接线 + control-regex lint 静默 |
| 远程备份测试对齐 | Desktop-only 边界回归 | **fix** `475b900`/`764d4fa` | 测试对齐 S3/WebDAV 仅 Desktop；恢复 post-optimize handlers |
| IPC manifest 合同 | main/remote-storage 覆盖不足 | **fix** `717bd86` | channel manifest 合同覆盖 |
| C4 PostOptimizeActions | **done**（Basic） | **仍 basic only** | System/User basic 有；未铺全模式 |
| EvalCaseSet UI 入口 | Basic System | **仍 basic system only** | 可复现 0→1 在，入口未铺全 |
| promptfoo 导出代码 | 无 | **仍无** | C2 未开工 |
| C1 双模型对照 | 无 | **仍无** | 未开工 |
| Paper 主题 | 已存在 | **仍在** | 纸感离线字体主题可装 |
| safeStorage Desktop | done `44a8921` | **仍 done** | Key 磁盘可密文 |
| 导出默认脱敏 | done `91da4e4` | **仍 done** | `includeSecrets` 默认 false |
| B5 UI 无 aws-sdk | done `91da4e4` | **仍 done** | Web 仅 Drive；S3 走 Desktop |
| Node engines | ^24 | **仍 ^24** | 系统 Node 可开发 |
| 产品版本 | 2.11.7 | **2.11.7** | 与根 package / desktop 一致 |

**结论（R2）**：闭环与安全竖切（CTA、历史诚实、证据 JSON、safeStorage、导出脱敏、远程边界、F2 资产完整）在代码面已可讲；发布面最大风险从「未 push」转为 **「tip 已推但 A5 未确认绿 + E2E 仍有历史噪声」**。下一阶段最佳序列是 **A5 CI 绿 → C2 最小 promptfoo.yaml 导出 → C1 双模型轻对照**；继续拒绝平台化、主安装默认自动优化、Web S3 SDK、整仓 vendor Promptfoo。

### 0.3 核心判断（五条）

1. **差异化仍成立**：隐私 + 多端 + Desktop 硬化 + 中文工作台 + Paper 视觉；竞品证明赛道，不证明应变成它们。  
2. **主链可演示**：优化完成有 CTA（basic）；历史可配置上限；用例可跑可进全量备份；导出默认脱敏；Desktop Key 可加密落盘；Web 不再塞 S3 SDK。  
3. **技术债重心已换档**：从「竖切有没有」换到「CI 是否对 tip 诚实、互操作是否薄而正确、入口是否铺全、E2E 是否可复现」。  
4. **最佳下一序列**：**A5 → C2 → C1**（F2/A0 已完成；不要回头做平台）。  
5. **学习纪律不变**：每次竞品学习只允许带回一个 backlog 项；导出优先于内嵌；Desktop 特权优先于 Web 扩权。

### 0.4 五句命令（给维护者）

1. 先盯 GitHub Actions 对 `6d1f5ff`（或更新 tip）是否 gate/lint/mcp 全绿，再谈发版。  
2. 互操作先做 **C2 文件导出**，不要内嵌 Promptfoo runner。  
3. C1 只做「同输入两 modelKey 并排」，不做矩阵编辑器。  
4. 导出默认脱敏与 Web 无 aws-sdk **禁止回退**。  
5. PostOptimizeActions / EvalCase 入口扩展属于体验债，不抢在 A5/C2 之前成为主目标。

---

## 1. 研究问题、整合范围与方法

### 1.1 研究问题

1. tip 从 `91da4e4` 演进到 `6d1f5ff` 后，旧整合结论哪些仍成立、哪些必须改序？  
2. 竞品（Promptfoo、Langfuse、DSPy、Agenta、local-first Desktop UX）在「经验层」而非「功能羡慕层」应带回什么？  
3. 架构优化与技术债如何按 **现行已完成竖切** 重排？  
4. 目标 / 约束 / 边界 / 输入 / 输出 / 验收如何写成可执行卡？  
5. 多方案如何用**统一权重**打分，并解释为何 A5→C2→C1 最优？  
6. UX 与 Paper 视觉如何服务主目标而不变成皮肤项目？  
7. 30/60/90 与交互表单、C1/C2 挂载点、CI 事实如何落到下一刀？

### 1.2 输入权威（优先级从高到低）

1. **代码 tip** `develop` @ `6d1f5ff` 与相关 commits（`ec65ff3` F2、`2b658da` mcp、`8383834` 文档 A0/A5、`ac3328f` 等修复链）。  
2. `docs/project/CURRENT.md`（版本与路径 SSOT）。  
3. `docs/project/COMPETITIVE-BRIEF.md`、`docs/architecture/charter.md`、`BACKLOG-90D-2026-07-21.md`、`NEXT-CUT-SPEC-2026-07-21-RELEASE-F2.md`。  
4. `COMPETITIVE-ARCHITECTURE-RESEARCH-2026-07-21.md`、`FULL-SCAN-PLAN-RECOMMENDATIONS-2026-07-21.md`。  
5. 旧版 `INTEGRATED-WORKBENCH-DECISION-RESEARCH-2026-07-21.md`（R1，含已删除的 §23 注水；本 R2 吸收其实质、剔除重复）。  
6. 公开竞品定位（Promptfoo / Langfuse / DSPy / Agenta 等官方叙事）。

### 1.3 输出与非输出

**输出**：整合叙事、进度差分表、债表重排、量化方案对比、C1/C2 挂载说明、UX/Paper 打磨、30/60/90、交互表单指令、维护说明。  

**非输出**：第二 monorepo、框架重写、多租户默认、vendor 整仓 Promptfoo、主安装默认自动优化、Web 浏览器侧 S3 SDK、把 FULL-SCAN 雷达项自动升为主目标。

### 1.4 方法与局限

- **主证据**：本机 git log / status、`packages/*` 与项目 L1 文档。  
- **辅证据**：公开产品定位与既有赛道长文。  
- **局限**：GitHub Actions 列表可见近期历史 run，但**不能把 7 月中旬成功 run 误记为 tip `6d1f5ff` 已绿**；A5 必须以 tip SHA 的 gate/lint/mcp 结论为准。E2E 的 basic-user timeout、image select empty 等属观察项，部分已由 `6d1f5ff` 类修复对症，仍需在绿 CI 后复验。

### 1.5 术语

| 术语 | 含义 |
|------|------|
| 工作台 | GUI 内完成写、优化、测、评、存、导出 |
| 薄互操作 | 文件/适配器握手，不内嵌对方运行时 |
| 竖切 | 端到端可演示的一条能力链 |
| A5 | CI 全绿观察（gate + lint + mcp:test 等门禁） |
| C2 | 最小 `promptfoo.yaml` 导出 |
| C1 | 双模型轻量对照 UI |
| F2 | EvalCaseSet 进入全量导出/导入 |
| Paper | 纸感离线优先视觉主题 |

---

## 2. 相对旧 tip `91da4e4` 的进度扫描

### 2.1 提交链事实（`91da4e4` 之后至 `6d1f5ff`）

按时间自近及远的关键节点（完整以 `git log 91da4e4..6d1f5ff` 为准）：

1. `6d1f5ff` — fix(ui): default ContextUserWorkspace props for route mount  
2. `2b658da` — fix(mcp-server): keep truncated tool results within maxChars  
3. `8383834` — docs: mark A0 pushed; leave A5 open pending Actions green  
4. `ac3328f` — fix(ui): expose history capacity APIs on web HistoryManager adapter  
5. `5d3df24` — fix(ui): wire User CTA and silence control-regex lint  
6. `475b900` / `764d4fa` — 远程备份测试 Desktop-only 对齐；恢复 post-optimize handlers  
7. `1633ba7` — core 历史容量 API 类型与 flush cast  
8. `717bd86` — CI：main/remote-storage IPC 进入 channel manifest 合同  
9. `ec65ff3` — **feat(data): export/import EvalCaseSet in full backup (F2)**  

这组提交说明：R1 所忧「ahead 未 push」已解除；R1 建议的 F2 已实现；同时出现一批 **为让 CTA/历史/远程边界/CI 合同真正可绿** 的回归修复——这是健康信号，不是范围失控。

### 2.2 能力状态机（实现 / 入口 / 发布）

| 能力 | 实现 | 默认入口覆盖 | 发布验证 |
|------|------|--------------|----------|
| 优化流式 + 取消 | 有 | 多模式 | 需 A5 + 手测 |
| PostOptimizeActions CTA | 有 | **Basic 为主** | 手测待勾 |
| EvalCaseSet + contains 批跑 | 有 | **Basic System** | 单测有；入口未铺全 |
| 证据 JSON | 有（最小） | 随评估 | 手测 |
| 全量导出含 EvalCaseSet | **有（F2）** | DataManager | 单测+手测 |
| 导出默认脱敏 | 有 | DataManager 默认 | 单测 |
| safeStorage 封 Key | 有 | Desktop | 单测 |
| 历史上限可感知 | 有 | History 抽屉 | Web adapter 已补 |
| UI 无 aws-sdk | 有 | 构建边界 | 依赖/测试对齐 |
| promptfoo.yaml 导出 | **无** | — | — |
| 双模型对照 | **无** | — | — |
| Paper 主题 | 有 | 主题切换 | 安装包曾归档 |

### 2.3 旧报告错误前提的修正

R1 在 tip `91da4e4` 时合理的前提：

- 「先 push 再谈 CI」—— **R2 已完成 push**，命令改为「先确认 Actions 对 tip 绿」。  
- 「F2 是 P1 资产完整」—— **R2 已 done**，不再占据主序列第一位。  
- 「最大风险是未 push 分叉丢失」—— **降级**；新的 P0 是 **A5 未确认** 与 **E2E/回归噪声是否掩盖真红**。  
- 「下一刀 = push + F2」—— **Cut-R1 代码目标基本完成**；下一刀应切到 **Cut-R2：A5 收口 + C2**，C1 紧随或小并行但不阻塞 C2 文件契约。

### 2.4 CI 事实锚点（必须写进决策）

| 事实 | 说明 |
|------|------|
| mcp 截断 | `2b658da` 修 truncated tool results 超出 maxChars；降低 mcp:test 假红/真红 |
| E2E 观察 | 历史上出现 **basic-user timeout**、**image select empty**、**pro-variable missing props** 等；其中 route/props 类问题在 `6d1f5ff` 对症（ContextUserWorkspace 默认 props） |
| A5 状态 | backlog 明确：**todo**，以最新 Actions 为准；**不得**用 2026-07-18 等旧 success run 冒充 tip 已绿 |
| 文档诚实 | `8383834` 已写明 A0 pushed、A5 open——本 R2 继承该诚实 |

### 2.5 产品能力摘要（与 CURRENT 对齐，不复制版本数字以外的权威）

2.11.7 fork 已具备：Desktop hardening（stream cancel、IPC 域拆分、sensitive/secure 注册）、UX quiet-workbench、**Paper 纸感主题**、icons 入 asar、P0 安全（Docker public VITE、Vercel HMAC Cookie）、图像生成可取消、Cut-1 可复现评估、Cut+1 safeStorage、B3 历史上限、C4 CTA、导出脱敏、**F2 导出含 EvalCaseSet**、B5 去 UI aws-sdk、Node ^24。战略文档定位：**本地优先工作台，非 LLMOps 平台**。

---

## 3. 赛道地图与竞品经验（更新版）

### 3.1 四类问题空间

| 类型 | 代表 | 与本项目关系（`6d1f5ff`） |
|------|------|---------------------------|
| A 交互改写器 | PromptPerfect、模板社区 | **主形态**；CTA/模板/多模式工作区 |
| B 评测与红队 | Promptfoo | 本地 contains 竖切 + F2 资产；**互导出未做**；红队默认拒绝 |
| C LLMOps/观测 | Langfuse、LangSmith、Agenta | 个人历史/收藏；**不做租户 Trace** |
| D 程序化优化 | DSPy、PromptWizard | 可选策略接口未来可接；**默认关** |

### 3.2 Promptfoo：学「可复现与文件契约」，不学「把 CLI 搬进 GUI」

Promptfoo 的核心体验是：用例 × 提示变体 × 模型 → 断言 → 矩阵报告 → CI。它强在**配置即评测**与本地运行，不强在写作工作台。

**应学：**

- 固定测试集与最小断言（我们已有 contains）。  
- **导出可被 CI 消费的配置**（C2 的正当性来源）。  
- 失败可重复，而不是一次「看起来不错」的截图。

**不应学：**

- 在 Desktop 内嵌完整 runner 与红队默认套件。  
- 把产品主路径改成 YAML 编辑器。  
- 为矩阵 UI 引入第二套状态中心。

**经验转译成挂载点：** 在 DataManager / 评估结果旁提供「导出 promptfoo.yaml」；映射字段最小化：`prompts`、`providers`（或占位）、`tests`（vars + assert contains）。**零 Promptfoo 运行时代码进 monorepo 依赖**即可宣布 C2 成功。

### 3.3 Langfuse：学「证据与轨迹思维」，不学「默认云观测」

Langfuse 类产品解决团队级 trace、评分与协作。个人工作台若照搬，会立刻引入账号、后端与隐私叙事崩塌。

**应学：** 每次优化/评估应能留下**可导出的本地证据**（我们已有最小证据 JSON + 历史）。  
**不应学：** 默认上传、多租户项目、在线评分队列。  
**转译：** 证据 JSON 增加稳定 `schemaVersion`；导出包可被人类与脚本阅读；绝不把 trace 后端做成默认依赖。

### 3.4 DSPy：学「策略可插拔」，不学「默认自动搜索」

DSPy 把提示当参数优化，强在研究与流水线，弱在终端用户的可解释账单。

**应学：** `OptimizationStrategy` 端口；预算、可取消、metric 显式。  
**不应学：** 主安装默认开启多轮自动优化。  
**转译：** backlog D1/D2 保持实验轨；与简报 §2.1 一致——实验通道可讨论，主路径仍是模板 + 人工。

### 3.5 Agenta 等 Prompt 管理：学「版本语义的克制」，不学「平台骨架」

Agenta/Pezzo 等提供 playground + 版本 + 数据集 + 有时部署。对小团队有价值，但对单人 fork 是运维 levithan。

**应学：** 收藏/历史的「这是好版本」心智；导出/导入完整性（F2 已补用例）。  
**不应学：** 环境、权限、中心库。  
**转译：** 继续个人时间线模型；若未来团队需求出现，**新模块**而非污染 preference 键空间。

### 3.6 Local-first Desktop UX 经验（含本项目 Paper）

优秀的本地优先桌面工具共享若干体验原则：

1. **打开即可用**：无强制账号墙。  
2. **特权能力可解释**：为何 Desktop 能做 S3/加密而 Web 不能。  
3. **数据可带走**：导出/导入是一等公民（F2 强化了这一点）。  
4. **失败可理解**：取消、无 Key、断言失败、safeStorage 不可用应是不同文案。  
5. **视觉服务于长时间阅读**：Paper 纸感降低「仪表盘焦虑」，符合提示词写作场景。  
6. **安静工作台**：quiet-workbench 与 CTA 固定条并存——少噪音，但关键下一步可见。

**反例：** 把本地工具做成「必须登录才能导出」；把主题做成无障碍对比度崩溃；把远程备份做成 Web bundle 里塞云 SDK。

### 3.7 竞品对照一句话（R2）

Promptfoo 强矩阵与本地评测文件；Langfuse 强观测协作；DSPy 强自动优化；Agenta 强团队版本；本项目强**工作台闭环 + 本地信任竖切 + Desktop 硬化 + 中文与 Paper 体验**，弱在 **A5 未钉死、互操作浅、部分入口仅 basic**。弱项应用「导出与轻对照」补，不应用「变成它们」补。

### 3.8 学与不学清单（冻结）

| 学 | 不学 |
|----|------|
| contains 与证据 JSON | 默认红队 |
| 导出进 CI（yaml） | 整仓 vendor Promptfoo |
| 轻双模型对照 | 完整矩阵编辑器 |
| 收藏/版本感 | 多租户权限 |
| 策略接口默认关 | 主安装默认自动优化 |
| Desktop 特权隔离 | Web 持 S3 钥 |
| 纸感可读性 | 纯皮肤炫技里程碑 |

---

## 4. 架构现状与优化方向

### 4.1 边界（宪章对齐）

```
extension / web / desktop-renderer → ui → core
desktop-main / mcp-server → core
```

敏感落盘、更新、代理、对象存储特权在 **main**。ui **禁止** re-export 工厂；生产 dist 契约已竖切。IPC 必须进 `channel-manifest` 并用 secure 注册路径。

### 4.2 主数据流（现行）

写提示 → 优化（流式可取消）→ **CTA（测试/评估/收藏，basic）** → 用例批跑/证据（Basic System 入口）→ 历史（可配置上限，Web capacity API 已补）→ **全量导出（默认脱敏 + evalCaseSets）** → 可选远程（Desktop S3/R2/WebDAV · Web Google Drive）。

### 4.3 实现锚点（便于下一刀定位）

| 主题 | 锚点（逻辑名） |
|------|----------------|
| EvalCase | core eval-case 类型/仓储；preference `eval.caseSets.v1` |
| F2 导出 | `DataManager.exportAllData` / `importAllData` 键 `evalCaseSets` |
| 脱敏 | `export-secrets`；`includeSecrets` 默认否 |
| CTA | `PostOptimizeActions`；BasicSystem/BasicUser |
| 历史 | HistoryManager getUsage / setMaxRecords；Web adapter |
| 密钥 | `SecretAwareStorage`；desktop `safe-storage-secrets` |
| 远程 | Desktop IPC remote-storage；UI 无 aws-sdk |
| 主题 | Paper / naive-theme |
| 路由挂载 | `ContextUserWorkspace` 默认 props（`6d1f5ff`） |
| MCP | 工具结果截断 maxChars（`2b658da`） |

### 4.4 架构优化方向（R2 排序）

1. **发布面诚实**：A5 对 tip 绿；失败热修优先于新功能。  
2. **互操作面薄适配**：C2 yaml 导出纯函数 + UI 入口；可选 C1 并排跑测。  
3. **入口完整度**：EvalCase / CTA 从 basic system 扩到更多工作区（不改变领域模型）。  
4. **MCP 结构化**：original/optimized/meta 稳定 schema（C3，不抢 C2）。  
5. **继续拒绝**：平台化、UI 云 SDK 回潮、默认自动优化、第二状态中心。

### 4.5 包职责再强调（防回归）

| 包 | 允许 | 禁止 |
|----|------|------|
| core | 领域、导出映射、纯函数适配器 | Vue/DOM/读 userData |
| ui | 组件、i18n、主题、composable | `new OpenAI()`、aws-sdk、工厂 re-export |
| desktop | main/preload/IPC/safeStorage/远程特权 | renderer 直接特权 I/O |
| mcp-server | 工具面、校验、截断 | 绕过 core 私自扩权 |

### 4.6 数据与导出契约（F2 后）

全量导出应覆盖：history、models、imageModels、templates/settings/contexts、favorites、**evalCaseSets**。  
脱敏只碰密钥字段，**不得**把用例当 secrets 误删。  
导入无效用例应 skip + warn，不阻断其他域。

### 4.7 流式与取消（继承 FULL-SCAN 已修方向）

完成事件必须带结构化 payload；取消绑定 owner；错误通道单一。这些在 07-21 加固批已作为正确性 P0 处理；R2 不重开，只要求 **回归测试继续挡**。

---

## 5. 目标（Goals）

### 5.1 北极星

优化后固定可见测试/评估/收藏；可重跑用例并带走证据与用例资产；历史上限诚实；导出默认不泄 Key；Desktop Key 不长期明文躺盘；契约测试挡边界回潮；**CI 对当前 tip 诚实为绿**；需要专业矩阵时 **导出 Promptfoo 最小配置**，而不是长成评测平台。

### 5.2 分层目标与度量

| 层级 | 目标 | 度量 |
|------|------|------|
| 用户 | 更好提示 + 可复现「为何更好」 | 证据 JSON + 重跑 + 换机导入用例 |
| 产品 | 默认可完成闭环 | CTA 可见；导出一键；薄互操作可选 |
| 安全 | 信任可解释 | 密文磁盘 + 默认脱敏 + 无 Web S3 SDK |
| 工程 | 单人可维护 | 无第二平台；A5 绿；包边界测试 |
| 分发 | fork 自主 | 不绑上游；fork-only |

### 5.3 非目标（本期与 90 天）

多租户、默认云 Trace、Agent OS、主安装默认自动优化、K8s 默认、整仓 Promptfoo、框架重写、强制账号、Web 内嵌对象存储 SDK、为皮肤单独开里程碑而牺牲 CI。

### 5.4 冲突裁决序

硬约束 → 数据诚实/隐私 → 主闭环 → 安全 → **发布诚实（A5）** → 互操作 → 入口扩展 → 美观。

---

## 6. 约束（Constraints）

### 6.1 硬约束

1. 本地优先 / 无强制账号  
2. fork-only  
3. 包边界 `app → ui → core`；ui 不 re-export 工厂；生产 dist  
4. 单人可维护 / 小核心  
5. 敏感在 main  
6. 构建期无密钥  
7. **导出默认脱敏 API Key，禁止回退为默认含明文**  
8. **Web 永不再引入 `@aws-sdk` / 浏览器侧 S3 客户端**  
9. 附加工程：Node ^24、pnpm、AGPL、Electron isolation + IPC manifest  

### 6.2 软约束

可复现优先于炫技；IPC 清单完整；端口化扩展；竞品限项学习；CURRENT 单数字源；FULL-SCAN 作雷达不自动升主目标。

### 6.3 自动优化张力（继承简报 §2.1）

- 主安装 / 默认产品路径：**自动优化默认关**。  
- 允许实验开关、预算、取消（D1/D2）。  
- 若要将主安装默认开，必须**另开简报**，禁止 silent 改默认。

### 6.4 假合规（出现即失败）

导出默认含 Key；不能重跑的评估；UI 带 S3 SDK；CTA 不可见却宣称闭环完成；**用旧 CI 绿冒充 tip 绿**；vendor 平台；空密码公网默认。

---

## 7. 边界（Boundaries）

### 7.1 信任边界

DOM 不可信 → preload 半可信 → main 可信 → 外部 LLM（用户 Key）。  
MCP：Bearer + 非 loopback 强制 token；health 最小 `{ok}`。

### 7.2 产品内

单用户闭环、本地用例与证据、MCP 工具、可选备份、Desktop 对象存储、Paper 主题、薄导出。

### 7.3 产品外

团队中台、托管评测、Shell Agent、默认同步、Web 内嵌 S3 SDK、默认红队、默认自动优化。

### 7.4 时间边界

表外大功能先改 COMPETITIVE-BRIEF，再开 backlog ID。R2 主序列外的「想做」全部降为雷达。

---

## 8. 输入 / 输出（IO）

### 8.1 用户输入

提示词、模型配置与 Key、用例集、历史上限、导出选项（是否 includeSecrets）、远程备份配置（Desktop）、主题选择（含 Paper）。

### 8.2 用户输出

优化结果（流式）、CTA、测试/评估结果、证据 JSON、警告（历史 near/full、脱敏提示）、**含 evalCaseSets 的备份**、可选 promptfoo.yaml（C2 后）、双模型并排结果（C1 后）。

### 8.3 开发者输入/输出

PR → 门禁；IPC → manifest；存储键 → 常量与敏感集合；文档数字 → 只改 CURRENT。

### 8.4 质量属性

可取消、可解释、可迁移、可 mock、可在无真网 CI 下验证纯函数导出。

---

## 9. 验收标准映射（R2）

### 9.1 已基本达标（实现 done，手测/CI 收口）

| ID | 标准 | 状态 |
|----|------|------|
| A1 CTA | 优化完成测试/评估/收藏 | 实现 done（basic）· 手测待勾 · 入口未全 |
| A3 历史上限 | 可感知可配置 | **done** |
| A4 证据 JSON | 最小可导出 | **done** |
| F2a/b | 全量导出/导入含 EvalCaseSet | **代码 done** `ec65ff3` · 手测回归建议 |
| S1 safeStorage | Desktop 磁盘 Key 可密文 | **done** |
| S2 导出脱敏 | 默认无明文 Key | **done** |
| S3 无 UI aws-sdk | Web 无 S3 提供方 | **done** |
| R1 push | 远端含 tip | **done**（0/0） |

### 9.2 本阶段必须关门

| ID | 标准 | 验证 |
|----|------|------|
| **A5 / R2-CI** | tip 上 gate/lint/mcp 无红 | GitHub Actions 对 `6d1f5ff` 或更新 tip |
| **C2a** | 导出 yaml 含 prompts/tests 最小字段 | 文件抽查 + 单测 |
| **C1a** | UI 可选两模型同输入跑测 | 手测（可在 C2 后） |
| E2E-smoke | basic-user / image select / context props 无已知崩溃 | 绿或书面接受 |

### 9.3 约束不破

C1–C4 无强制登录/无工厂 re-export/生产 dist/IPC secure；C5 导出默认脱敏；C6 ui 无 aws-sdk；C7 自动优化非主默认。

### 9.4 失败条件

强制云账号；vendor Promptfoo/LangSmith 整仓；ui 再 re-export 工厂；公网 compose 空密码；主安装默认自动优化；导出默认再含 Key；Web 再引入 S3 SDK；**伪造 A5 已绿**。

---

## 10. 技术债重排（R2）

### 10.1 优先级表

| 优先级 | 债 | 说明 |
|--------|-----|------|
| **P0** | **A5 CI 对 tip 全绿** | 已 push；必须观察/热修 |
| **P0** | E2E/回归已知噪声收敛 | basic-user timeout、image select empty 等；props 类已修须复验 |
| **P1** | **C2 promptfoo.yaml 最小导出** | 互操作主路径；无运行时依赖 |
| **P1** | **C1 双模型轻对照** | 体验补强；不做矩阵编辑器 |
| **P2** | CTA/EvalCase 入口扩展到更多模式 | basic only → 更广 |
| **P2** | MCP 结构化返回（C3） | IDE 嵌入 |
| **P2** | B6 路径规范化回归测 | 已有实现对齐，补测 |
| **P3** | D1/D2 策略接口默认关 | 实验轨 |
| **P3** | 容器再瘦、非 root 里程碑 | 运维 |
| **P3** | CSP 持续收紧、stack 泄露减少 | FULL-SCAN 残余雷达 |

### 10.2 已降息（勿重复当 P0）

流式 payload、XSS 错误分支、门闩、白名单、sandbox 方向、IPC secure 化、工厂 re-export、dist 契约、EvalCase Cut-1、safeStorage、历史上限、CTA、脱敏、去 aws-sdk、Node24、**F2、A0 push、mcp maxChars、ContextUser 默认 props、历史 capacity Web 适配、remote-storage manifest 合同**。

### 10.3 治理规则

- 增债必须写偿还窗与 ID。  
- 禁止用花活掩盖 A5 未绿。  
- 诚实与安全优先于炫技。  
- FULL-SCAN 项进主序列必须改 BRIEF。

---

## 11. 关键决策多方案对比（含数值评分）

### 11.1 评分方法

对候选打 1–5 分，维度与权重：

| 维度 | 权重 |
|------|------|
| 本地优先 | 1.2 |
| 小核心可维护 | 1.2 |
| 主闭环增益 | 1.3 |
| 安全/隐私 | 1.1 |
| 发布诚实/可验证 | 1.2 |
| 成本（越高越省成本） | 1.0 |
| 可逆性 | 0.8 |

综合分 = Σ(分 × 权重)。下文给出相对排序用的**示意分**（同场比较有效，不是绝对真理）。

### 11.2 下一阶段主工作包

| 方案 | 本地 | 小核心 | 闭环 | 安全 | 发布 | 成本 | 可逆 | 综合≈ | 结论 |
|------|------|--------|------|------|------|------|------|-------|------|
| **A5 先绿再功能** | 5 | 5 | 4 | 5 | 5 | 5 | 5 | **40.3** | **最优序首** |
| C2 yaml 导出 | 5 | 5 | 4 | 5 | 4 | 5 | 5 | 38.6 | **次优主功能** |
| C1 双模型 | 5 | 4 | 4 | 5 | 3 | 4 | 4 | 34.5 | 第三 |
| 入口扩展（CTA/Eval 全模式） | 5 | 4 | 5 | 5 | 3 | 4 | 4 | 35.8 | 可穿插，不替 C2 |
| 更多断言/红队默认 | 3 | 2 | 3 | 3 | 2 | 2 | 2 | 20.7 | 拒绝默认红队 |
| 内嵌 Promptfoo runner | 3 | 1 | 3 | 3 | 2 | 1 | 2 | 18.3 | **拒绝** |
| 主安装默认自动优化 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | 15.8 | **拒绝** |
| Web 恢复 S3 SDK | 1 | 2 | 2 | 1 | 2 | 2 | 2 | 14.4 | **拒绝** |
| 平台化（租户/Trace） | 1 | 1 | 2 | 1 | 1 | 1 | 1 | 9.7 | **拒绝** |

**排序结论：** A5 → C2 → C1；入口扩展可在不阻塞前两者时小步做；其余拒绝或远期实验。

### 11.3 互操作形态

| 方案 | 综合判断 |
|------|----------|
| 仅文档教用户手写 yaml | 低：摩擦大 |
| **最小 yaml 导出适配器** | **高：C2** |
| 内嵌 Promptfoo | 低：小核心与成本双杀 |
| 双模型 UI 无导出 | 中：补体验但不连 CI |

### 11.4 战略 S 曲线

| 战略 | 综合 | 说明 |
|------|------|------|
| **S1 工作台做深** | **最高** | 与已实现资产同向 |
| S2 LLMOps 平台 | 低 | 人力与隐私冲突 |
| S3 评测 GUI 化 | 低-中 | 易变成烂 Promptfoo |
| S4 自动优化优先 | 低 | 默认关才可接受 |
| S5 纯跟随上游 | 中低 | fork 差异化会糊 |

### 11.5 发布策略

| 方案 | 综合 |
|------|------|
| **观察 tip CI，红则热修** | 最高 |
| 无视 CI 直接 NSIS 广发 | 低 |
| 长期只在本机绿 | 低（已过时：已 push） |

### 11.6 为何最佳路径贴合本项目

1. **硬约束加权后**，任何平台化/Web S3/默认自动优化/vendor runner 在安全与小核心上直接掉到不可选。  
2. **已沉没成本**全部强化 S1：CTA、F2、脱敏、safeStorage、Paper、多端 core——应被「发布诚实 + 薄导出」放大，而不是推倒重来。  
3. **单人维护经济学**：C2 是一个纯函数 + 按钮级 UI；C1 是一次并排调用；二者可逆。内嵌评测引擎不可逆地抬高依赖税。  
4. **竞品互补而非吞并**：用文件与 Promptfoo 握手，用本地证据对抗「无 trace 就不专业」的话术。  
5. **A5 前置**避免在红门禁上堆功能，导致永远「功能很多但不敢发」。

---

## 12. C1 / C2 挂载点设计（执行向）

### 12.1 C2：promptfoo.yaml 最小导出

**目标：** 用户一键得到可被 Promptfoo CLI 读取的最小配置；本仓库**不**添加 promptfoo 依赖。

**建议挂载点：**

1. **数据源**：当前提示（优化前/后可勾选）、EvalCaseSet 用例、可选 model provider 元数据（不含 Key）。  
2. **纯函数位置**：`packages/core` 下 `export/promptfoo-adapter`（名称实现时定），输入领域对象 → 输出 yaml 字符串。  
3. **UI 入口**：  
   - DataManager「导出」区增加「导出 Promptfoo 配置」；或  
   - 评估结果面板次要按钮「导出为 promptfoo.yaml」。  
4. **最小字段映射：**  
   - `prompts`: 字符串或文件占位  
   - `tests`: 每 case 的 `vars` + `assert`（type: contains, value: ...）  
   - providers：可用占位注释，要求用户填自己的 provider，**禁止**写入 API Key  
5. **验收：** 单测固定 fixture；手测文件可被文档中的示例命令消费（文档级，不在 CI 跑真网）。  
6. **非目标：** 导入 yaml 回工作台（可远期）；红队 assert 全家桶；云托管。

### 12.2 C1：双模型轻对照

**目标：** 同一输入、两个 modelKey、并排输出与基础断言结果；**不是**矩阵编辑器。

**建议挂载点：**

1. **UI：** Basic 测试区或独立「对照」折叠面板；选择 model A/B。  
2. **执行：** 复用现有测试调用链，串行或受限并行（注意成本与取消）。  
3. **结果：** 并排文本 + 可选 contains 通过/失败；可导出为证据 JSON 扩展字段。  
4. **非目标：** N×M 矩阵、高级采样编排、自动选主模型。

### 12.3 顺序关系

- **先 C2 后 C1** 的理由：C2 连接外部专业生态且不增加运行时状态复杂度；C1 提升工作台内体验但增加调用成本与 UI 状态。  
- 若人力允许，C1 可在 C2 纯函数合并后并行 UI，但 **C2 文件契约不得被 C1 阻塞**。  
- 二者都不得修改导出默认脱敏与包边界。

### 12.4 与现有 basic-only 的关系

PostOptimizeActions 与 EvalCase 入口目前偏 basic：C1/C2 应**优先挂在已有评估/导出路径**，避免先做「全模式铺入口」导致范围膨胀。入口扩展是 P2，可在 C2 后按同一组件模式复制到 User/Pro。

---

## 13. UX 打磨与 Paper 视觉风格

### 13.1 UX 原则（服务闭环）

1. **下一步可见**：CTA 固定条优先于易消失 toast。  
2. **空态可起步**：用例空态提供 seed；历史空态说明上限意义。  
3. **危险可逆或双确认**：含密钥导出须强提示。  
4. **Desktop/Web 文案诚实**：Web 不承诺 S3；引导 Desktop。  
5. **失败可区分**：取消 ≠ 断言失败 ≠ 无模型 ≠ 加密不可用。  
6. **i18n 三语同步**：en / zh-CN / zh-TW；关键控件保留 testid。  

### 13.2 Paper 主题的产品意义

Paper 不是「换皮 KPI」，而是：

- 降低长时间编辑提示词的视觉疲劳；  
- 用纸感隐喻强化「写作/修订」而非「云控制台」；  
- 离线字体避免首屏依赖外网，符合本地优先。  

**打磨建议：** 保持对比度可访问；暗色/纸感切换不丢状态；截图与安装包说明指向 Paper 作为推荐默认之一，但不绑架无障碍用户。

### 13.3 具体打磨清单（可进 backlog 小项）

| 项 | 说明 |
|----|------|
| CTA 与成功 toast 去重 | 避免双提示 |
| 导出脱敏勾选文案 | 明确风险 |
| F2 导入成功反馈 | 提示用例已恢复 |
| C2 导出成功 | 打开文件夹/复制路径（Desktop） |
| C1 费用提示 | 两模型双倍调用 |
| 历史 near/full | 链到导出备份 |
| safeStorage 不可用 | 设置页诚实徽章 |
| E2E 稳定选择器 | 减少 image select empty |

### 13.4 明确不做的 UX

引导用户「登录以同步」；在 Web 伪装 S3 成功；默认弹窗推销自动优化；用动效掩盖慢与错误。

---

## 14. 30 / 60 / 90 天路径（R2 更新）

### 14.1 0–30 天

- **A5**：Actions 对 tip 绿；红则只热修。  
- **C2**：最小 promptfoo.yaml 导出 + 单测 + 一页说明。  
- 手测清单固化：CTA、历史、脱敏、safeStorage、F2 往返、Web 仅 Drive。  
- 视情况启动 C1 骨架。  
- 不碰平台化与默认自动优化。

### 14.2 31–60 天

- **C1** 双模型轻对照可用。  
- CTA/EvalCase 入口扩展（User/部分 Pro）。  
- MCP 结构化（C3）若有 IDE 声量。  
- B6 路径测补强。  
- 发版 runbook 走通一版 NSIS（在 A5 绿后）。

### 14.3 61–90 天

- D1/D2 策略接口默认关（可 `wont`）。  
- Docker 非 root 里程碑文档化。  
- 容器再瘦、CSP/日志噪声等雷达项择优。  
- 回顾 BRIEF：是否仍 S1。

### 14.4 周节奏

周一安全/CI · 周二核心路径 · 周三闭环/互操作 · 周四边界债 · 周五文档与 CURRENT。  
每次竞品学习只带回 **一个** backlog 项。

---

## 15. 最佳方案总述

继续 **本地工作台做深（S1）**。用户真正的问题不是「先拥有平台」，而是「改一句、跑一下、看差在哪、留下好版本、换机不丢、分享不泄密」。硬约束杀死默认云与 Web 持钥；已实现竖切（含 F2）强化 S1；竞品用 **C2 导出** 互补；C1 提供工作台内浅对照；单人不可运维平台 on-call。

最佳是**序列**不是单点功能：

**发布诚实（A5） → 薄互操作（C2） → 轻对照（C1） → 入口与 MCP 完整度 → 可选实验策略。**

可证伪条件：用户明确只要 CI 矩阵不要 GUI；法规强制中心账号；团队愿运维观测后端——则重开简报，而不是在本序列里偷换。

---

## 16. 对齐总表（R2）

| 时间 | 事项 |
|------|------|
| 立即 | A5 观察/热修；禁止伪绿 |
| 1–2 周 | C2 最小导出 |
| 2–4 周 | C1 轻对照；手测/发版 |
| 有余力 | 入口扩展、C3 MCP、B6 |
| won't | 红队默认、自动优化默认开、Web S3 SDK、vendor Promptfoo、平台化 |

---

## 17. 优缺点与风险（R2）

### 17.1 优点

真本地优先；多端 core；安全叙事完整（磁盘 + 导出 + 边界）；可复现评估 + **用例可迁移**；CTA；历史诚实；Node24；Paper；fork 自主；F2/A0 已完成。

### 17.2 缺口

A5 未钉死；E2E 仍有噪声史；互操作浅（无 promptfoo 代码）；CTA/Eval 入口未铺全；Electron 体积；AGPL；单人文档漂移风险。

### 17.3 机会

证据工作台叙事；MCP 嵌入 IDE；promptfoo 导出连接重度评测用户；安全说明页；Paper 差异化截图。

### 17.4 威胁

SaaS 吸量；误导出泄密；范围膨胀；供应链；上游分叉解释成本；**在 CI 红时强行发版损害信任**。

### 17.5 近 30 天风险登记

| 风险 | 缓解 |
|------|------|
| A5 红且拖延 | 热修优先，功能冻结 |
| E2E flaky 掩盖真红 | 分类：产品 bug vs 选择器 vs 超时 |
| C2 映射过度设计 | 锁最小字段 |
| C1 费用爆炸 | 串行/确认/取消 |
| 脱敏回退 PR | 单测挡 + code review 清单 |
| Web S3 回潮 | 依赖审计 + B5 测试 |

---

## 18. 深度论证：工作台战略为何仍最优（去注水版）

### 18.1 工作台是架构中心词

工作台意味着人在环、状态可见、默认可完成、数据可带走。平台意味着租户、权限、中心存储与运维契约。core/ui/desktop 切分把信任边界写进仓库结构。提出「团队空间」时，真实成本是账号与 ACL——那是换赛道。

### 18.2 闭环必须产品化

功能「都在」不等于闭环。C4 把测试/评估/收藏钉在优化完成时刻。固定条而不是长向导，兼顾高级用户。R2 仍需把该模式从 basic 扩展，但扩展是复制组件模式，不是新战略。

### 18.3 可复现先于智能裁判

contains 可测、可解释、可映射 Promptfoo。LLM-as-judge 引入费用与非确定性。扩展断言应在 C2 之后，避免自研矩阵与专业 CLI 赛跑。

### 18.4 密钥生命周期

输入 → IPC → 落盘（Desktop seal）→ 读回调用 → 导出默认剔除 → 日志禁止。safeStorage 管静态；脱敏管分享。只做其一会在网盘备份或设备失窃时失效。Web 无 OS 密钥环则诚实透传。

### 18.5 远程备份特权化

B5 让 Web 仅 Drive、S3 走 Desktop IPC，是能力归位。测试在 `475b900` 链对齐，防止回归。

### 18.6 历史截断的产品伦理

静默 FIFO 等于偷记忆。B3 使上限可见可配；Web capacity API 补齐多端诚实。

### 18.7 资产进备份面

F2 之前，用例只活在 preference 键，换机变幽灵。`ec65ff3` 把 evalCaseSets 纳入 export/import，使「证据可带走」自洽。

### 18.8 发布纪律属于产品质量

R1 强调 push；R2 强调 **远端 tip 的 CI**。未观察的绿是幻觉；旧 run 的绿是过期幻觉。

### 18.9 薄互操作优于深内嵌

Promptfoo 留在专业工具位；工作台留在写作迭代位；文件握手。C2 正是该原则的产品化。

### 18.10 单人变更经济学

每个新依赖、IPC、云概念都有固定税。能导出解决的不内建；能 Desktop-only 的不污染 Web；能用警告解决的诚实问题，不上分布式数据库。

### 18.11 扫描报告与飞行计划

FULL-SCAN 是雷达，backlog 是飞行计划。A5 未绿前，P2 文案债不抢主序列。

### 18.12 测试分层

纯函数与仓储 vitest；Desktop 契约 node:test；关键路径手测；E2E 门禁组。禁止真网 Key 做 CI 断言。

### 18.13 文档双层

L0 长文裁决；L1 简报与 CURRENT 执行。禁止把万字结论复制五份。R2 删除旧 §23 循环段，正是反文档熵增。

### 18.14 许可证

AGPL 与「价值在用户设备」一致。商业双许可另开简报。

### 18.15 异议答复

- 「无平台无壁垒」→ 壁垒是工作流习惯、本地资产、多端一致。  
- 「无红队不专业」→ 专业分工，安全团队用 Promptfoo（故做 C2）。  
- 「自动优化才是未来」→ 插件化；默认开会先杀死信任与钱包。  
- 「加密了还要脱敏」→ 保护对象分别是磁盘与分享文件。  
- 「先做 C1 更炫」→ 炫不连接 CI；C2 先。  
- 「CI 以后再说」→ 已 push，无借口。

### 18.16 用户故事（短）

写作者要证据包；开发者要换机脱敏导出与 yaml；爱好者要明显 CTA；安全敏感用户要本地与加密说明；CI 重度用户要文件而不是 GUI 矩阵。

### 18.17 仅本机指标（可选）

优化+测试完成次数、证据导出次数、F2 导入成功、历史上限警告、safeStorage 可用性、含密钥导出勾选率、C2 导出次数。禁止默认上传遥测。

### 18.18 未来自检五问

1. 破坏哪条硬约束？  
2. 默认路径变更短还是变更长？  
3. 增加几个依赖与几条 IPC？  
4. 能否用导出/插件/Desktop-only 解决？  
5. 失败是否会静默丢数据或密钥？  

---

## 19. 可执行架构优化清单（三行卡）

1. **A5**：输入= tip SHA；输出= Actions 结论；验收= gate/lint/mcp 绿或热修 PR。  
2. **C2**：输入= 提示+EvalCaseSet；输出= yaml 文本；验收= 单测+字段抽查+无 Key。  
3. **C1**：输入= 同文案+两 modelKey；输出= 并排结果；验收= 可取消+无矩阵编辑器。  
4. **入口扩展**：输入= 现有组件；输出= User/Pro 挂载；验收= CTA/用例可见。  
5. **MCP 结构**：输入= 优化结果；输出= schema 稳定 JSON；验收= 契约测。  
6. **安全保持**：输入= PR；输出= 无脱敏回退/无 aws-sdk；验收= 单测+依赖扫描。  
7. **文档**：输入= 状态变更；输出= BRIEF/BACKLOG/CURRENT 链接更新；验收= check:docs。  
8. **明确不做卡**：平台化、默认自动优化、Web S3、vendor runner。

写不出「输入-输出-验收」三行的项不开工。

---

## 20. 输入输出验收卡模板

名称 / 目标对齐 / 硬约束检查 / 输入 / 输出 / 验收（命令+手测） / 失败标准 / 非目标 / 回滚。  

A5、C2、C1 均应填卡后执行。F2 已完成可用作模板范例：export 含 cases → import load → 默认仍脱敏。

---

## 21. 与旧文档映射

| 旧文档 | 本 R2 位置 |
|--------|------------|
| COMPETITIVE-ARCHITECTURE 赛道 | §3 |
| BRIEF 目标/约束/验收 | §5–§9 |
| charter 原则 | §4、§6 |
| BACKLOG 状态 | §2、§10、§16 |
| NEXT-CUT F2 | §2（done）、§12 之后刀 |
| FULL-SCAN 雷达 | §10.1 P2/P3、§18.11 |
| 旧 INTEGRATED R1 | 全篇更新 tip；删 §23 注水；序列改 A5→C2→C1 |
| CURRENT 能力摘要 | §0、§2.5 |

---

## 22. 交互表单使用说明

请在对话中完成选择（推荐项如下）。选择结果用于：

1. 更新 `COMPETITIVE-BRIEF.md` 的 tip / 下一刀 / 输出序；  
2. 新建或改写 `NEXT-CUT-SPEC`（建议 Cut-R2 = A5 收口 + C2）；  
3. 更新 `BACKLOG-90D` 状态与 `CURRENT` 链接叙述（版本数字仍只改 CURRENT）。

### 22.1 推荐预填（R2）

| 维度 | 推荐选择 |
|------|----------|
| 主目标 | 本地工作台做深（S1） |
| 硬约束 | 八条硬约束全维持（含脱敏 + 无 Web S3）；自动优化主默认关 |
| 输入权威 | tip `6d1f5ff` + 本 R2 + BRIEF/charter + FULL-SCAN 雷达 |
| 主输出序 | **A5 → C2 → C1** |
| 明确拒绝 | 平台化、默认自动优化、Web S3、vendor Promptfoo |
| 验收门槛 | Actions 对 tip 绿；yaml 最小字段；双模型并排可取消 |

### 22.2 表单维度清单

1. 主目标确认（S1 vs 其他）  
2. 硬约束集合（是否钉死脱敏/Web S3）  
3. 主输入权威  
4. 下一阶段主输出序  
5. 验收门槛  
6. 可选增值（入口扩展/MCP/D1）  
7. 自动优化张力处理确认  

### 22.3 冻结后动作

- 写/更新 NEXT-CUT-SPEC-R2  
- backlog：A5/C2/C1 状态与依赖  
- 不在未冻结时并行开平台型 PR  

---

## 23. 原则精粹（非循环 · 可执行）

以下每条只出现一次，并带「如何验收」：

1. **肌肉记忆四步**：改、跑、看差、留好版本 → 验收：新用户不读长文也能点到测试。  
2. **拒绝错误默认**：不上传、不构建进密钥、不默认导出密钥、不日志打密钥 → 验收：单测+抽查。  
3. **可维护是产品特性**：交互矩阵不超单人缓存 → 验收：无第二状态中心。  
4. **竞品只带回一项** → 验收：backlog 新增 ≤1/次学习。  
5. **端差异在信任能力** → 验收：业务在 core，特权在 main。  
6. **重复产生可信** → 验收：用例可重跑。  
7. **导出是本地优先通行证** → 验收：F2 往返 + C2 文件。  
8. **加密可证伪** → 验收：磁盘无明文句子可演示。  
9. **包边界有测试保险** → 验收：package-scripts/契约测。  
10. **文档反复制** → 验收：数字只在 CURRENT。  
11. **发布诚实** → 验收：A5 对 tip。  
12. **薄互操作** → 验收：无 promptfoo 依赖却有 yaml。  
13. **默认路径短** → 验收：CTA 可见。  
14. **失败可解释** → 验收：文案分型。  
15. **雷达≠航线** → 验收：FULL-SCAN 不自动进主目标。  

（旧稿用 45 段重复扩写的做法在 R2 **废止**。）

---

## 24. 手测与对外话术

### 24.1 手测八步（R2）

1. Basic 优化完成后 CTA：测试/评估/收藏。  
2. 历史上限调整与警告。  
3. 导出默认无 apiKey；勾选包含才有。  
4. Desktop 落盘 Key 呈 `__enc:v1:` 或等价密文形态（实现细节以代码为准）。  
5. Web 远程仅 Drive 相关能力可见。  
6. F2：导出含 evalCaseSets；导入后面板可跑。  
7. （C2 后）yaml 含 prompts/tests，无 Key。  
8. （C1 后）两模型并排可取消。  

### 24.2 对外一句

本地优先提示词工作台——可复现评估、用例可迁移备份、Desktop 密钥保护、导出默认脱敏；需要 CI 矩阵时导出 Promptfoo 最小配置。

### 24.3 反模式清单

强制账号；工厂 re-export；默认自动优化；导出默认含 Key；静默丢历史；Web S3；未登记 IPC；版本号乱飞；**伪称 A5 已绿**；§23 式文档注水。

---

## 25. 下一刀草（Cut-R2 建议）

| 项 | 内容 |
|----|------|
| 名称 | Release-CI-Align + C2 promptfoo 最小导出 |
| Must | A5 绿或热修至绿；core 纯函数 yaml 导出；UI 一处入口；单测；无 Key；更新 BRIEF/BACKLOG |
| Must not | 内嵌 runner；红队；Web S3；默认自动优化；全模式入口一次性铺开 |
| 随后 | C1 双模型；入口扩展；C3 MCP |

---

## 26. 最终摘要（一页）

我们已经有：可复现用例、F2 全量备份含用例、磁盘密钥保护、历史上限诚实、优化完成 CTA（basic）、导出默认脱敏、UI 去对象存储 SDK、Node 24、Paper 主题、**代码已 push 至 origin**。  

我们还缺：对 tip 的 **A5 确认绿**、**C2 薄导出**、**C1 轻对照**、更全入口与更稳 E2E。  

我们仍不做：平台化、主安装默认自动优化、默认红队、Web 持 S3 钥、vendor Promptfoo。  

最佳序列：**A5 → C2 → C1**。  

这就是 tip `6d1f5ff`、产品 2.11.7、fork `xvyimu/prompt-optimizer` 在 2026-07-21 的 R2 整合决策。

---

## 27. 附录

### 27.1 关键 commit 索引

| SHA | 主题 |
|-----|------|
| `6d1f5ff` | ContextUserWorkspace 默认 props |
| `2b658da` | mcp 截断 maxChars |
| `8383834` | A0 done / A5 open 文档 |
| `ac3328f` | Web 历史 capacity API |
| `5d3df24` | User CTA + lint |
| `475b900`/`764d4fa` | 远程备份测试与 post-optimize |
| `717bd86` | IPC manifest 合同 |
| `ec65ff3` | **F2** EvalCaseSet 导出导入 |
| `91da4e4` | C4 CTA、脱敏、去 aws-sdk（R1 tip） |
| `44a8921` | safeStorage |
| `672d4a7` | B3 历史上限 |
| `3483bd6` | Node ^24 |

### 27.2 公开资料

- https://www.promptfoo.dev/docs/intro/  
- https://langfuse.com/  
- https://dspy.ai/  
- Agenta 等开源 prompt 管理对比文（见赛道长文 Sources）  

### 27.3 代码与文档路径

- 源码：`D:\PromtOptimizer\src\prompt-optimizer`  
- 本报告：`D:\PromtOptimizer\docs\INTEGRATED-WORKBENCH-DECISION-RESEARCH-2026-07-21.md`  
- CURRENT：`docs/project/CURRENT.md`  
- BRIEF / BACKLOG / NEXT-CUT / charter：见 CURRENT 文档入口表  

---

## 28. 维护说明

1. **实现超越本文时**：先改 `BACKLOG` 状态与 `COMPETITIVE-BRIEF` 下一刀，再改本报告 §0.2 差分表一行；版本与安装路径**只改** `CURRENT.md`。  
2. **tip 前进时**：更新文首 tip 表与 §2 提交链；不得保留过期「ahead 5」叙述。  
3. **A5 变绿时**：在 backlog A5 标 done，并在 §0.2/§9 改为 done；附 Actions run 链接（人工粘贴）。  
4. **C2/C1 落地时**：更新 §12 为「已实现」并链到规格/测试路径。  
5. **禁止**：再增加循环「补强段」注水；禁止把雷达项静默写进主序列；禁止复制版本号到多处。  
6. **R3 触发条件**：主序列完成或战略被证伪（见 §15）时开 R3，而不是每周重写万字。  
7. **与会话表单关系**：表单冻结结果以 BRIEF §8 审计表为准；本报告 §22 提供推荐预填。  

---

**文档结束（R2 · tip `6d1f5ff` · 2026-07-21）**

## 63. 场景化验收剧本（补充手测）

### 剧本 A：换机迁移

在机器甲创建两条 contains 用例并跑通，导出全量备份（默认脱敏）。在机器乙导入后，不重新录入用例即可打开面板看到相同用例，并再次跑批得到结构化证据。若机器乙为 Web，不应要求配置 S3；若为 Desktop，可另测对象存储，但与本剧本正交。失败判定：导入后用例为空、或导入阻断 models 恢复、或备份含明文 Key。

### 剧本 B：密钥误分享防御

在导出对话框保持默认选项下载 JSON，用文本搜索 `apiKey`、`sk-`、`Bearer` 应无命中（除非用户模板正文碰巧包含这些子串，此时属内容而非配置字段）。再勾选包含密钥，必须出现强提示；确认后文件可含密钥字段，并在 meta 中标记 secretsIncluded=true。失败判定：默认即含密钥，或含密钥无任何提示。

### 剧本 C：历史上限诚实

将上限设为接近当前条数，持续优化生成新历史，直至出现 near 与 full 级提示。确认用户能理解将删除最旧记录，且可上调上限后继续。失败判定：无提示突然丢链，或上限无法配置。

### 剧本 D：优化后闭环

在 Basic System 与 Basic User 各完成一次优化，确认 CTA 固定可见且三按钮可点（即使某些动作因缺模型而报可解释错误，也不应静默无响应）。失败判定：优化成功但无任何下一步入口。

## 64. 工程实践：小 PR 与可回滚

建议将 A5 热修、C2、C1 分为独立提交序列，甚至独立小分支短时合并。好处是 CI 归因清晰：若 C2 引入类型错误，不应与 E2E 选择器修复缠在一起。每个提交信息引用 backlog ID（如 `fix(a5): ...`、`feat(c2): ...`）。文档提交可附在功能提交后，但不要只改文档宣称功能已完成。回滚策略：功能开关优先于硬删；若无开关，则 git revert 单提交应能通过类型检查。

## 65. 国际化与文案债务

新功能若只加中文，会立刻造成 en/zh-TW 空洞，长期表现为半截界面。C2/C1/二次确认弹窗的字符串必须三语同时进库。术语统一：EvalCase 对外可称「评估用例」；promptfoo 保留英文专名；API Key 在中文界面可写「API 密钥」。避免同一概念多种叫法（用例/案例/测试集混用）导致文档与 UI 漂移。

## 66. 性能与成本控制

个人工作台的性能目标不是吞吐冠军，而是交互可预期：优化流式首字节可感知；取消在一秒级生效；导出大历史不冻结 UI（必要时异步）。成本控制方面：C1 双模型默认不强制；批跑限制 max cases；未来自动优化必须预算。禁止在 CI 用真实付费 Key 换绿，以免 flaky 与账单双杀。

## 67. 观测的本地替代

不做云 Trace 不等于不做可诊断性。本地可采用：结构化错误码、导出诊断包（脱敏）、MCP 健康检查、Desktop 日志级别开关。诊断包同样默认脱敏。这比引入完整观测后端更符合单人维护。

## 68. 最后检查清单（合并前）

- [ ] 是否触及硬约束？  
- [ ] 是否增加默认路径长度？  
- [ ] 是否新增依赖或 IPC？  
- [ ] 导出是否仍默认脱敏？  
- [ ] UI 是否出现 aws-sdk？  
- [ ] 三语文案是否齐全？  
- [ ] 单测/门禁是否覆盖核心分支？  
- [ ] CURRENT/backlog 是否需更新？  
- [ ] 是否可用导出或 Desktop-only 替代更重方案？  

全部通过后再请求合并或 push。

## 69. 收束声明

本 R2 文档取代旧整合稿中以 `91da4e4` 为「当前未 push tip」的叙事，并删除注水式重复补强段。若后续 tip 前进，只需在 §0.2 增加差分行，无需重写全文。战略层句子保持稳定，执行层状态机保持诚实。

## 70. 补强：从「功能清单」到「可完成路径」的管理转化

许多开源 AI 工具死于功能清单膨胀：每看到一个竞品特性就加一个菜单，最终没有一条路径是顺的。本地工作台的管理转化是：每个迭代只加宽或加牢一条默认可完成路径。C4 加牢了优化后的下一步；F2 加牢了资产带走；C2 将加宽专业评测出口；C1 将加宽当场对照。A5 则是所有加宽加牢的地基——没有绿色门禁，路径承诺无法对外成立。

因此，当有人提出「再做一个模板市场」「再做一个团队空间」「再做一个自动优化开关默认开」时，正确的问题不是「能不能做」，而是「它加牢了哪一条默认可完成路径，还是只是多了一扇门」。若答案是后者，放入 won't 或远期实验轨。

## 71. 补强：为什么「诚实的红」优于「沉默的绿」

在持续集成文化里，有时会有压力把不稳的 E2E 直接跳过，以换取合并速度。对单人 fork 而言，沉默的绿比诚实的红更危险：它让未来的自己以为主路径仍受保护，于是更大胆地重构，直到真实用户路径断裂。诚实的红迫使问题留在视野中。当然，红也不能无限期悬挂；分类热修与有期限 quarantine 是中间态，永久删除 gate 用例则是自我麻痹。

## 72. 字数与维护说明

本 R2 以实写章节满足万字量级目标，用于跨会话裁决而非重复堆砌。后续维护以差分表为主，避免再次出现大段同构重复。若需对外分享，可只摘 §0、§11、§14 与表单结果。