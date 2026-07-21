# Prompt Optimizer 整合调研与阶段决策报告（R3 · 90d 收工后下一阶段）

| 项 | 值 |
|----|-----|
| 文档日期 | 2026-07-21 |
| 文档版本 | **R3**（相对 R2：90 天 A–D **全部 done**；功能 tip `fe12cbf`；文档 tip `9070556`） |
| 文档类型 | L0 整合调研全文（进度扫描 · 市场需求 · 竞品经验 · 架构设计 · 开发规范 · 路线图 · API 接口 · 技术债 · 多方案量化 · 目标/约束/边界/IO/验收 · UX/Paper · 交互表单） |
| 产品 | `xvyimu/prompt-optimizer` fork · **2.11.7** |
| 源码 | `D:\PromtOptimizer\src\prompt-optimizer` |
| 代码 tip | `develop` @ **`9070556`**（文档去重）；功能 tip **`fe12cbf`**（D3/D4） |
| 远端对齐 | `origin/develop` **同步 0/0** |
| CI（功能 tip） | [29807745038](https://github.com/xvyimu/prompt-optimizer/actions/runs/29807745038) **test success** @ `fe12cbf` |
| 字数目标 | ≥ 10000 汉字（真实论述，禁止段落循环注水） |
| 策略 | **fork-only** · 本地工作台做深 · 非 LLMOps / 非评测 CLI |

> **读法**：决策者读 §0 + §12–§14；执行者读 §8–§11、§15–§16；反驳战略读 §4–§7。  
> **不替代**：`CURRENT.md` 的版本/路径；实现以代码与单测为准。  
> **R3 相对 R2 核心差分**：A5/C1/C2/C3/B6/D1–D4 **全部 done**；下一问题从「竖切有没有」变为「**入口铺全 + 真机验收 + 可发布**」。  
> **配套**：会话交互表单（§24）冻结 **下一 30 天** 目标/约束/输入/输出/验收。

---

## 0. 执行摘要

### 0.1 一句话

**Prompt Optimizer 是本地优先、多端一致的提示词工程工作台**：把「优化 → 测试 → 评估 → 收藏 → 导出证据」做成默认可完成路径；不是迷你 LangSmith，不是 Promptfoo CLI 壳，不是默认自动优化器，也不是 Web 侧对象存储客户端。

### 0.2 进度差分（R2 tip `6d1f5ff` → R3 tip `9070556` / 功能 `fe12cbf`）

| 主题 | R2 态 | **R3 现行** | 含义 |
|------|--------|-------------|------|
| A5 CI 全绿 | 未对 tip 确认 | **done** @ `fe12cbf` run 29807745038 | 功能 tip 可发布门禁通过 |
| C2 promptfoo.yaml | 无代码 | **done** `7509047`+`e21e7fd` | 最小 contains 映射导出 |
| C1 双模型 | 无 | **done** `02c5db7` | Basic System/User 一键并排 |
| C3 MCP 结构化 | 无 | **done** `eaceab5` | `{original,optimized,meta.v1}` |
| 密钥导出二次确认 | 无 | **done** `eaceab5` | DataManager includeSecrets |
| B6 路径测 | 规格 | **done** `a4b54db` | UI+Desktop 对齐 |
| D1/D2 策略+实验 auto | 规格 | **done** `a4b54db` | 默认 template；auto **关** |
| D3 ServiceContainer | todo | **done** `fe12cbf` | main 仅 composition root |
| D4 非 root Docker | todo | **done** `fe12cbf` | app/10001 + MCP user=app |
| 手测清单 | 无 | **落盘未勾** | 真机 15 min 待做 |
| CTA / EvalCase 入口 | basic only | **仍 basic only** | 体验债主战场 |
| 产品版本 | 2.11.7 | **2.11.7** | 未升版号 |
| 90d backlog A–D | 部分 | **全 done** | 见 BACKLOG-90D |

**结论（R3）**：90 天「边界冻结 + 闭环数据 + 薄互操作 + 可选进取」**代码面已关门**。发布与体验的最大风险从「竖切缺失」转为 **「真机未签 + 入口未铺全 + 安装包/版本节奏未定」**。下一阶段最佳序列是 **E0 真机手测 → E1 入口铺全（CTA/EvalCase）→ E2 发版/NSIS**（或等价 Release 节奏）；继续拒绝平台化、主安装默认自动优化、Web S3 SDK、整仓 vendor Promptfoo。

### 0.3 核心判断（六条）

1. **差异化仍成立**：隐私 + 多端 + Desktop 硬化 + 中文工作台 + Paper 视觉；竞品证明赛道，不证明应变成它们。  
2. **主链可演示（代码）**：CTA、历史诚实、EvalCase、证据 JSON、promptfoo 导出、双模型、MCP 结构化、脱敏+二次确认、safeStorage、Web 无 S3、D3/D4 装配与镜像降权。  
3. **技术债重心再换档**：从「有没有竖切」→「**入口是否一致、手测是否签字、发版是否可重复**」。  
4. **最佳下一序列**：**E0 手测 → E1 入口铺全 → E2 发版**（E3 仅在 E0 暴露缺陷时插入）。  
5. **学习纪律不变**：每次竞品学习只允许带回一个 backlog 项；导出优先于内嵌；Desktop 特权优先于 Web 扩权。  
6. **自动优化**：D1/D2 接口已在；**主安装默认关**不可破（ADR-005 / 宪章 §7）。

### 0.4 五句命令（给维护者）

1. 先跑 `HANDTEST-CHECKLIST-2026-07-21.md` 真机勾选，再谈 NSIS/发版。  
2. 入口铺全优先 **PostOptimizeActions + EvalCase 到 Context 模式**，不做评测矩阵编辑器。  
3. 发版只改 `CURRENT.md` 版本数字与 RELEASE-RUNBOOK，不另开第二 SSOT。  
4. 导出默认脱敏与 Web 无 aws-sdk **禁止回退**。  
5. 实验 auto-opt 可做 UI 开关，但不得成为主 CTA 或主安装默认。

---

## 1. 研究问题、整合范围与方法

### 1.1 研究问题

1. 90d A–D 全部 done 后，旧 R2 结论哪些仍成立、哪些必须改序？  
2. 竞品（Promptfoo、Langfuse、DSPy、Agenta、PromptPerfect）在「经验层」应带回什么？  
3. 架构优化与技术债如何按 **现行已完成竖切** 重排为下一 30/60/90？  
4. 目标 / 约束 / 边界 / 输入 / 输出 / 验收如何写成可执行卡？  
5. 多方案如何用**统一权重**打分，并解释为何 E0→E1→E2 最优？  
6. UX 与 Paper 视觉如何服务主目标而不变成皮肤项目？  
7. 市场需求、开发规范、API 文档、交互表单如何落到下一刀？

### 1.2 输入权威（优先级从高到低）

1. **代码 tip** `develop` @ `9070556` / 功能 `fe12cbf` 与相关 commits。  
2. `docs/project/CURRENT.md`（版本与路径 SSOT）。  
3. `COMPETITIVE-BRIEF.md`、`charter.md`、`BACKLOG-90D-2026-07-21.md`、手测清单与各 NEXT-CUT 规格。  
4. 本仓既有 R2 整合调研、COMPETITIVE-ARCHITECTURE 长文、FULL-SCAN。  
5. 公开竞品定位（Promptfoo / Langfuse / DSPy / Agenta / PromptPerfect 等）。  
6. GitHub Actions 对 `fe12cbf` 的 success 事实。

### 1.3 输出与非输出

**输出**：R3 整合叙事、进度差分、市场需求报告、架构设计、开发规范、路线图、API 接口、债表重排、量化方案对比、UX/Paper、30/60/90、交互表单。  

**非输出**：第二 monorepo、框架重写、多租户默认、vendor 整仓 Promptfoo、主安装默认自动优化、Web 浏览器侧 S3 SDK、把雷达项自动升为主目标。

### 1.4 方法与局限

- **主证据**：本机 git log/status、`packages/*`、L1 文档、Actions run 29807745038。  
- **辅证据**：公开产品定位与既有赛道长文；Web 检索 2025–2026 工具对比摘要。  
- **局限**：真机手测清单 **未勾选**——代码绿 ≠ 用户路径绿；上游 `linshenkx` Actions 列表与 fork Actions 分离，勿混用。

### 1.5 术语

| 术语 | 含义 |
|------|------|
| 工作台 | GUI 内完成写、优化、测、评、存、导出 |
| 薄互操作 | 文件/适配器握手，不内嵌对方运行时 |
| 竖切 | 端到端可演示的一条能力链 |
| E0 | 真机手测签字（15 min 清单） |
| E1 | 入口铺全（CTA / EvalCase / 双模型一致性） |
| E2 | 发版节奏（NSIS / version / RELEASE-RUNBOOK） |
| Paper | 纸感离线优先视觉主题 |
| fork-only | 默认不向上游 PR |

---

## 2. 进度扫描（相对 R2 与 90d backlog）

### 2.1 90 天 backlog 关门表

| 阶段 | ID | R3 状态 | 锚点 commit / 备注 |
|------|-----|---------|---------------------|
| A | A0–A5 | **done** | push 同步；CI @ fe12cbf 绿 |
| B | B1–B6 · F2 | **done** | EvalCase、safeStorage、脱敏、路径测、导出含用例 |
| C | C1–C4 | **done** | 双模型、promptfoo、MCP 结构化、PostOptimize CTA |
| D | D1–D4 | **done** | 策略接口、实验 auto 默认关、ServiceContainer、Docker 非 root 里程碑 |

权威表：`docs/project/BACKLOG-90D-2026-07-21.md`。

### 2.2 关键提交链（摘）

| Commit | 内容 |
|--------|------|
| `2b658da` | MCP truncateResult 预留 marker |
| `afbbb37` | E2E VCR 预设 allowlist |
| `7509047` / `e21e7fd` | **C2** promptfoo + core barrel |
| `02c5db7` | **C1** 双模型一键 |
| `eaceab5` | **C3** MCP JSON + 密钥导出确认 + 手测清单 |
| `a4b54db` | **B6** 路径测 · **D1/D2** 策略默认关 |
| **`fe12cbf`** | **D3** 瘦 main · **D4** 非 root 里程碑 |
| `619561c` | pipeline review SHIP |
| `9070556` | CURRENT 去重 bullet |

### 2.3 仍打开的「非 backlog ID」项

| 项 | 类型 | 严重度 | 说明 |
|----|------|--------|------|
| 手测清单未勾 | 验收债 | **P0 体验** | 代码绿但无人签字 |
| CTA 仅 Basic System/User | 入口债 | P1 | Context / Image 模式无 PostOptimizeActions |
| EvalCase 仅 Basic System | 入口债 | P1 | User / Context 无面板 |
| 双模型仅 Basic | 入口债 | P2 | Context 测试区未接 seed |
| D2 实验 auto 无主 UI | 产品债 | P2 | 接口在，开关/预算 UI 可后置 |
| Docker 默认仍可 root:80 | 安全债 | P2 | 里程碑已文档化；非默认 USER |
| 2.11.7 未升版 | 发版债 | P2 | 能力已远超上次 NSIS 叙事 |
| web-dist 进仓/缓存 | 工程债 | P3 | 构建产物噪声 |

### 2.4 验证事实（机器）

```text
git: develop...origin/develop  (ahead 0)
HEAD: 9070556
feature tip: fe12cbf
Actions test: success 29807745038 @ fe12cbf
desktop unit (D3 当时): 75 pass
desktop-ipc-handlers: 10 pass
```

真机：`HANDTEST-CHECKLIST-2026-07-21.md` 全部 ☐。

---

## 3. 市场需求调研报告

### 3.1 市场问题陈述

提示词工程已从「会写 ChatGPT」演进为：**可复现、可对比、可移交、可嵌入 IDE** 的工程活动。用户痛点分四层：

1. **质量**：同一意图多写法，不知哪版更好。  
2. **复现**：换机器/换人后「当时为什么好」丢失。  
3. **隐私与成本**：Key 与对话不愿上第三方 SaaS；云评测按 token 烧钱。  
4. **工具碎片**：改写器、评测 CLI、观测平台、自动优化框架各管一段，切换成本高。

### 3.2 目标用户细分

| 细分 | 需求强度 | 本产品匹配 | 备注 |
|------|----------|------------|------|
| 独立开发者 / 中文创作者 | 高 | **高** | 本地、中文、Desktop |
| 小团队提示词负责人 | 中高 | 中 | 导出证据 > 多租户 |
| 企业 LLM 平台组 | 中 | 低 | 他们要 Langfuse/LangSmith |
| 研究/自动优化 | 中 | 低–中 | DSPy 类；本产品仅实验口 |
| 安全/红队 | 中 | 低 | Promptfoo 主场 |

**定位结论**：主市场是 **个人与小团队的本地工作台**，不是企业 LLMOps。市场需求存在且稳定，但 **付费 SaaS 化不是本 fork 的 90 天目标**（AGPL + fork-only + 本地优先）。

### 3.3 需求优先级（Kano 视角）

| 需求 | 类型 | 现行满足 |
|------|------|----------|
| 多厂商 Key 自管、本地数据 | 基本型 | 强 |
| 优化→测试→收藏闭环 | 基本型 | 强（basic） |
| 导出无明文 Key | 基本型（安全） | 强 |
| 可复现评估用例 | 期望型 | 有（入口窄） |
| 双模型对照 | 期望型 | 有（basic） |
| 与 Promptfoo 互操作 | 兴奋/期望 | 有导出 |
| MCP 进 IDE | 兴奋型 | 有结构化 JSON |
| 默认自动搜索优化 | 伪需求/风险 | **故意不做默认** |
| 多租户协作 | 平台需求 | won't |

### 3.4 市场规模与趋势（定性）

2025–2026 公开讨论一致趋势：

- **Eval + Observability 组合**（Promptfoo + Langfuse）成为团队默认栈。  
- **Local / self-host** 因隐私与合规持续走强。  
- **Programmatic optimization**（DSPy 等）从论文进入工程试验，但 **GUI 工作台用户仍要人工可读迭代**。  
- SaaS 改写器（PromptPerfect 类）获增长但 **不可替代本地 Key 与离线**。

对本产品含义：**不要追平台份额数字**；要在「本地闭环 + 薄互操作」上做深，成为「个人工作台 + 可导出到团队栈」的连接点。

### 3.5 市场风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| 被 Promptfoo GUI / Langfuse Playground 蚕食 | 中 | 差异化：多端 Desktop 硬化、中文、Paper、无账号 |
| 用户期望「一键自动变好」 | 中 | 产品文案诚实；实验开关默认关 |
| AGPL 限制商业分叉 | 低–中 | fork-only 已接受 |
| 上游功能分叉漂移 | 中 | 安全/依赖合入；产品竖切自控 |

### 3.6 市场结论（可执行）

1. 需求真实：**闭环 + 证据 + 隐私**。  
2. 增长路径：口碑安装包 + MCP + 导出互操作，**非广告获客 SaaS**。  
3. 下一阶段市场动作 = **产品可演示签字 + 安装包可信**，不是新赛道扩张。

---

## 4. 竞品经验：优缺点与可带回项

### 4.1 定位对照

| 产品 | 形态 | 强项 | 弱项（相对本产品） | 可学习 | 禁止照搬 |
|------|------|------|---------------------|--------|----------|
| **Promptfoo** | CLI/YAML 评测 | 矩阵、CI、红队、断言生态 | 非中文工作台 GUI | **最小 yaml 导出**（已 C2） | 整仓 vendor、内嵌 runner |
| **Langfuse** | 观测/提示管理平台 | Trace、数据集、自托管 | 偏生产观测，非改写工作台 | 证据字段命名、版本感 | 默认云 Trace、多租户 |
| **DSPy** | 程序化优化框架 | 编译式优化、可复现实验 | 无终端用户 GUI | **策略接口 + 预算**（已 D1/D2 口） | 主安装默认 auto |
| **Agenta** | LLMOps 工作台 | Playground、版本、人评 | 偏协作平台 | 版本对比 UX | 平台化、计费 |
| **PromptPerfect** | SaaS 改写 | 一键、多模型包装 | 账号/隐私/锁厂商 | 结果并排叙事 | SaaS 默认、强制账号 |

### 4.2 经验层（不是功能羡慕）

1. **Promptfoo**：断言与配置即文档；我们只做 **单向导出适配器**。  
2. **Langfuse**：一切可追溯；我们做 **本地证据 JSON + 历史链**，不做分布式 Trace。  
3. **DSPy**：优化是带预算的搜索；我们 **实验通道** 对齐，主路径仍是模板+人工。  
4. **Agenta**：Playground 要「改完立刻测」；我们用 **PostOptimize CTA** 固化。  
5. **PromptPerfect**：并排结果降低决策成本；我们用 **C1 双模型** 薄实现。

### 4.3 每次竞品只带回一项（纪律）

R3 建议下一带回候选（**只选一个进入下一 backlog**）：

| 候选 | 来源 | 拟合度 | 风险 |
|------|------|--------|------|
| Context 模式 CTA 铺全 | Agenta 闭环 | 高 | 低 |
| EvalCase 入口到 User | Promptfoo 可复现 | 高 | 低 |
| 证据包一键 zip（JSON+yaml+元数据） | Langfuse 导出感 | 中 | 中（范围） |
| 实验 auto UI（默认关） | DSPy | 中 | 中（误开） |

**推荐默认带回**：**Context 模式 PostOptimize CTA**（闭环一致性，零战略风险）。

---

## 5. 架构设计文档（现行 + 目标态）

### 5.1 现行逻辑架构

```
[Web / Extension / Desktop Renderer]
        │  仅 UI + public 配置
        ▼
   packages/ui  ──► packages/core（领域）
        ▲
[Desktop main] ──► core + FileStorage + safeStorage + IPC
[MCP Server]   ──► core（三工具 + 结构化 JSON）
[Docker]       ──► nginx + web + mcp(user=app)  [可选非 root 文档路径]
```

依赖方向（宪章）：`extension|web|desktop-renderer → ui → core`；`desktop-main|mcp-server → core`。  
**ui 禁止 re-export 工厂**；**敏感在 main**。

### 5.2 包职责（再确认）

| 包 | 现行职责 | R3 后仍禁止 |
|----|----------|-------------|
| core | 优化、模板、历史、EvalCase、promptfoo 导出、策略接口、DataManager | Vue/Electron/DOM |
| ui | 工作区、CTA、双模型 seed、Eval 面板、i18n、Paper | aws-sdk、工厂 re-export |
| web/extension | 壳与路由 | 业务复制 |
| desktop | ServiceContainer、IPC 域注册、密文存储、远程对象存储 | renderer 特权 I/O |
| mcp-server | 三工具 + structured-result + HTTP 安全 | 日志打 Key |

### 5.3 关键数据流

1. **优化闭环**：用户输入 → PromptService（template 策略）→ 流式输出 → PostOptimizeActions → 测试/评估/收藏。  
2. **评估**：EvalCaseSet preference → runner contains → 证据 JSON；可选 promptfoo.yaml。  
3. **导出**：DataManager.exportAllData({ includeSecrets? }) 默认脱敏；含 evalCaseSets；含密钥须二次确认。  
4. **Desktop 密钥**：createSecretAwareStorageProvider + Electron safeStorage → `__enc:v1:`。  
5. **MCP**：CallTool → core optimize → `buildMcpStructuredResult` → JSON text（无密钥）。

### 5.4 信任边界

| 区域 | 信任 | 控制 |
|------|------|------|
| DOM / Web | 不可信 | 无密钥、无 S3 SDK |
| preload | 半可信 | contextIsolation + 显式 API |
| main | 可信 | IPC manifest 1.1.0 + secureHandle |
| 外部 LLM API | 外部 | 用户 Key；取消绑定 stream owner |
| MCP HTTP | 条件可信 | Bearer；非 loopback 强制 token |

### 5.5 目标架构增量（仅下一阶段）

| 增量 | 说明 | 非目标 |
|------|------|--------|
| E1 入口一致性 | 同一 composable/组件挂到 Context* | 新状态中心 |
| E2 发版管线 | version:sync + NSIS + CURRENT | K8s |
| 可选 E3 | 手测缺陷修复 | 新平台模块 |
| 可选证据包 | 单文件导出增强 | 云端数据集托管 |

### 5.6 架构决策记录（继承）

| ADR | 内容 | 状态 |
|-----|------|------|
| 本地优先 | 无强制账号 | 有效 |
| 包边界 | app→ui→core | 有效 |
| 导出脱敏 | 默认无 Key | 有效 |
| Web 无 S3 | Desktop IPC only | 有效 |
| ADR-005 | 主安装 auto-opt 默认关 | 有效 |
| fork-only | 不默认上游 PR | 有效 |
| D3 | createCoreServices 内聚 | **已落地** |
| D4 | 非 root 里程碑（非强制 USER） | **已落地** |

---

## 6. 技术债重排（R3）

### 6.1 债分类

| ID | 债 | 类 | 成本 | 价值 | 建议窗口 |
|----|----|----|------|------|----------|
| T1 | 手测未签 | 验收 | 低 | 极高 | **立即 E0** |
| T2 | CTA 未铺 Context/Image | 体验 | 中 | 高 | E1 |
| T3 | EvalCase 仅 System basic | 体验 | 中 | 高 | E1 |
| T4 | 双模型仅 basic | 体验 | 低–中 | 中 | E1 可选 |
| T5 | 实验 auto 无 UI | 产品 | 中 | 低–中 | 60d+ |
| T6 | Docker 默认 root:80 | 安全 | 中 | 中 | 文档已缓；可选强制 |
| T7 | 版本号未反映能力 | 发布 | 低 | 中 | E2 |
| T8 | E2E 历史噪声/VCR 维护 | 工程 | 中 | 中 | 持续 |
| T9 | web-dist / 构建缓存 | 工程 | 低 | 低 | 清理 playbook |
| T10 | 上游漂移合入 | 战略 | 高 | 视安全 | 按需 |

### 6.2 已还清（勿重复立项）

B5 aws-sdk 移除、safeStorage、F2 导出、C1–C3、B6、D1–D4、A5 CI、工厂 re-export 清理。

### 6.3 债治理规则

- 新功能 PR 必须声明：**是否扩大入口债**（只在 basic 加能力 = 新增债）。  
- 安全债（脱敏、S3、auto 默认）**不可交易**为速度。  
- FULL-SCAN 雷达项 **不自动**进入主目标。

---

## 7. 目标 · 约束 · 边界 · 输入 · 输出 · 验收（下一阶段卡）

### 7.1 目标（Goal）— 候选，由表单冻结

**默认推荐一句话**：在 90d 竖切已齐的前提下，完成 **真机验收签字 + 主路径入口一致 + 可重复发版**，使 2.11.x（或下一补丁版）成为「可交付的本地工作台」而非「仅 CI 绿的开发 tip」。

| 层级 | 目标 | 非目标 |
|------|------|--------|
| 用户 | 装上就能走完闭环并导出证据 | 强制云账号 |
| 产品 | 手测绿 + 入口一致 + 安装包 | 迷你 LangSmith |
| 工程 | RELEASE-RUNBOOK 可重复 | 默认 K8s |
| 维护 | 单人可持续 | 平台化大爆炸 |

### 7.2 硬约束（Constraints）— 继承钉死

1. 本地优先 / 无强制账号  
2. fork-only  
3. 包边界 `app → ui → core`  
4. 单人可维护 / 小核心  
5. 敏感在 main  
6. 构建期无密钥  
7. **导出默认脱敏**  
8. **Web 无 `@aws-sdk` / 浏览器 S3**  
9. **主安装自动优化默认关**  
10. Node ^24 · pnpm · AGPL · IPC secure  

### 7.3 边界（Boundary）

| 内 | 外 |
|----|----|
| GUI 工作台闭环 | 生产 Trace 云 |
| 文件级互操作 | 内嵌 Promptfoo 运行时 |
| MCP 三工具优化 | 通用 Agent OS / 任意 Shell |
| Desktop 对象存储 IPC | Web 直连 S3 |
| 实验 auto（关） | 主 CTA 自动优化 |

### 7.4 输入（Inputs）

| 输入 | 路径 | 用途 |
|------|------|------|
| 代码 tip | `9070556` / `fe12cbf` | 实现真相 |
| 本 R3 文档 | `docs/INTEGRATED-...-R3.md` | 决策 |
| 简报+宪章 | COMPETITIVE-BRIEF · charter | 约束 |
| 手测清单 | HANDTEST-CHECKLIST | E0 |
| RELEASE-RUNBOOK | docs/project | E2 |
| CURRENT | docs/project/CURRENT.md | 版本 SSOT |

### 7.5 输出（Outputs）— 候选有序

| 序 | 交付 | 验收一句话 |
|----|------|------------|
| E0 | 手测清单签字 | 关键项 Pass 或缺陷入 E3 |
| E1 | 入口铺全 | Context（±User Eval）可见 CTA/用例 |
| E2 | 发版/NSIS | 安装包可启动 + CURRENT 版本更新 |
| E3 | 缺陷修补 | 手测回归绿 |

### 7.6 验收标准（Acceptance）

| ID | 标准 | 验证 |
|----|------|------|
| H1 | 手测 §1–§5 无 Fail | 勾选表 |
| H2 | 导出默认无 apiKey | JSON 抽查 |
| H3 | includeSecrets 有确认 | 手测 |
| H4 | promptfoo 无 sk- | 文件抽查 |
| H5 | 双模型两列不同 modelKey | 手测 |
| E1a | ContextSystem 有 PostOptimize CTA | UI |
| E1b | （若选）EvalCase 入口扩展 | UI |
| R1 | CI 对发版 tip 绿 | Actions |
| C5–C7 | 约束不破 | grep + 单测 |

### 7.7 失败条件

- 主安装默认 auto-opt  
- 导出默认含明文 Key  
- Web 再引入 S3 SDK  
- vendor 整仓 Promptfoo  
- 强制云账号  
- 未手测即宣称「可交付」

---

## 8. 多方案对比与评分

### 8.1 候选方案

| 方案 | 描述 |
|------|------|
| **P0 冻结维护** | 只修安全/CI，不做入口与发版 |
| **P1 E0→E1→E2（推荐）** | 手测 → 入口铺全 → 发版 |
| **P2 先发版后铺全** | NSIS 先打，入口债遗留 |
| **P3 平台化试点** | Trace/多租户/自动优化默认开 |
| **P4 评测深化** | 内嵌 runner / 矩阵编辑器 |
| **P5 自动优化产品化** | 主 CTA 接入 DSPy 风格搜索 |

### 8.2 权重（与 R2 一致，略调「可交付」）

| 维度 | 权重 |
|------|------|
| 战略契合（本地工作台） | 25% |
| 用户可感知价值 | 20% |
| 风险/约束不破 | 20% |
| 工程成本（单人 30 天） | 15% |
| 可维护性 | 10% |
| 可发布/可演示 | 10% |

### 8.3 评分（1–5）

| 方案 | 战略 | 价值 | 风险 | 成本* | 维护 | 发布 | 加权 |
|------|------|------|------|-------|------|------|------|
| P0 | 4 | 1 | 5 | 5 | 4 | 1 | **3.35** |
| **P1** | **5** | **5** | **5** | **4** | **5** | **5** | **4.85** |
| P2 | 4 | 3 | 4 | 4 | 3 | 5 | **3.85** |
| P3 | 1 | 3 | 1 | 1 | 1 | 2 | **1.45** |
| P4 | 2 | 3 | 2 | 2 | 2 | 2 | **2.15** |
| P5 | 2 | 4 | 1 | 2 | 2 | 2 | **2.20** |

\*成本分高 = 更省力。

### 8.4 为何 P1 最佳

1. **战略**：不扩张边界，只消灭「代码有、用户摸不到」的落差。  
2. **价值**：手测签字直接提升可信度；入口铺全放大已有竖切 ROI。  
3. **风险**：不碰脱敏/S3/auto 默认。  
4. **成本**：E0 半日级；E1 以复用组件为主；E2 有 runbook。  
5. **发布**：有签字的安装包才是产品，不是 git tip。  
6. **对比 P2**：先发包会把 basic-only 债固化进用户预期。  
7. **对比 P3–P5**：直接违反简报与宪章，维护爆炸。

### 8.5 敏感性

若维护者 **完全无时间做 UI**：退化为 **P0+E0**（至少手测），加权仍优于 P3–P5。  
若 **必须本周给安装包**：可 **P2 变体**（E0+E2 并行，E1 随后），但须在发行说明写明入口限制。

---

## 9. 开发规范与编码标准（R3 执行版）

### 9.1 语言与工具链

- TypeScript 严格；Vue 3 SFC；Node **^24**；pnpm 10。  
- 单测：core/ui vitest 或 node:test（desktop 用 node:test）。  
- E2E：Playwright + VCR replay；预设 allowlist 纪律。  
- 文档：`pnpm check:docs`；版本只改 CURRENT。

### 9.2 包与导入

- 新代码遵守依赖方向；**禁止** ui 引入 node:fs / aws-sdk。  
- 跨包公共 API 走 package exports / core barrel；C2 教训：UI 用的符号必须从 core 入口 re-export。  
- Desktop：业务工厂进 `service-container`；IPC 进 domain handlers；main 保持薄。

### 9.3 安全编码

- 密钥：不进日志、不进 MCP meta、不进默认导出。  
- IPC：新 channel 写 manifest；`registerSecure*` / sender 校验。  
- 路径：`normalizeObjectPath` 拒 `..`、反斜杠、控制字符。  
- HTML：用户内容默认转义；流式 payload 结构化。

### 9.4 产品行为规范

- 破坏性导出（含密钥）必须 **二次确认**。  
- 历史截断必须 **可感知**。  
- 取消流必须绑定 owner。  
- 实验功能：`isExperimental` + 默认 false + 文案标明实验。

### 9.5 Git / 发布规范

- 提交信息引用 backlog ID（如 `E1`）。  
- fork-only：不默认 `upstream` PR。  
- 发版：`version:sync` → 构建 → 手测子集 → 更新 CURRENT/RELEASE 笔记。  
- 高风险（force push、删远端、外发密钥）先确认。

### 9.6 代码风格（与仓一致）

- 匹配邻接文件的注释密度与命名。  
- 最小变更：不做无关重构。  
- 测试与实现同 PR。  
- i18n：zh-CN / en-US / zh-TW 同步键。

---

## 10. 开发路线图（30 / 60 / 90 天 · 自 2026-07-21）

### 10.1 第 0–30 天（交付窗口 · 推荐 P1）

| 周 | 焦点 | 出门条件 |
|----|------|----------|
| W1 | **E0 手测** + 缺陷表 | 清单签字或 E3 列表 |
| W2 | **E1a** Context PostOptimize CTA | Context System/User 可见 CTA |
| W3 | **E1b** EvalCase 入口扩展（可选深度） | User 或 Context 可开面板 |
| W4 | **E2** 版本/NSIS/CURRENT | 安装包启动 + CI 绿 |

### 10.2 第 31–60 天

- E3 余债与 E2E 稳定性。  
- 双模型铺 Context（若表单选）。  
- 证据包一键（JSON+yaml）薄增强。  
- Docker 非 root 默认路径评估（高端口）。  

### 10.3 第 61–90 天

- 实验 auto **UI**（仍默认关）或标 wont。  
- MCP 工具面小扩展（只读类）或稳定性。  
- 上游安全补丁合入窗口。  
- 文档漂移台账清零。  

### 10.4 里程碑定义

| 里程碑 | 定义 |
|--------|------|
| M-Hand | 手测清单关键项全 Pass |
| M-Parity | Basic 与 Context 主路径 CTA 一致 |
| M-Ship | 带版本号的安装包 + CURRENT 更新 |
| M-Hard | 无约束回退（脱敏/S3/auto） |

---

## 11. API 接口文档（工作台相关 · 现行）

> 完整 IPC 以 `packages/desktop/config/ipc/channel-manifest.js` **1.1.0** 为准。  
> 本节列 **产品关键契约**，供集成与验收，不替代 OpenAPI（本产品无中心 REST 业务 API）。

### 11.1 Core：数据导出

```ts
// DataManager
exportAllData(options?: { includeSecrets?: boolean }): Promise<ExportPayload>
// 默认 includeSecrets !== true → models/imageModels 去 apiKey
// payload 含 favorites、evalCaseSets、history、templates、settings、contexts …
```

**验收**：默认导出无明文 Key；`meta.secretsIncluded` 为 false 或等价。

### 11.2 Core：EvalCaseSet

| 符号 | 职责 |
|------|------|
| `EvalCaseSet` / `EvalCase` / `EvalAssertion` | 类型（contains / not_contains …） |
| repository（preference `eval.caseSets.v1`） | 本地存取 |
| runner | 批跑 contains 等 |
| 证据 JSON | 可导出结果 |

### 11.3 Core：promptfoo 导出（C2）

```ts
export interface PromptfooExportInput {
  prompt: string;
  secondaryPrompt?: string;
  caseSet: EvalCaseSet;
  description?: string;
}
export function exportPromptfooYaml(input: PromptfooExportInput): PromptfooExportResult
// → { yaml, fileName, skippedAssertionTypes }
```

**保证**：不映射未知断言则 skip；**永不**写入 apiKey。

### 11.4 Core：OptimizationStrategy（D1/D2）

```ts
type OptimizationStrategyKind = 'template' | 'auto-experimental'
interface OptimizationStrategy {
  readonly kind: OptimizationStrategyKind
  readonly isExperimental: boolean
  plan(ctx: OptimizationStrategyContext): OptimizationStrategyPlan
}
// TemplateOptimizationStrategy — 默认产品路径
// ExperimentalAutoOptimizationStrategy — 必须 opt-in；预算 maxRounds/maxCharsBudget
```

**偏好**：实验开关仅显式 `true` 时 enabled；默认 false。

### 11.5 MCP Tools（C3）

| Tool | 模式 | 成功返回（JSON text） |
|------|------|------------------------|
| `optimize-user-prompt` | user | `{ original, optimized, meta }` |
| `optimize-system-prompt` | system | 同上 |
| `iterate-prompt` | iterate | 同上 |

```ts
meta: {
  version: 1,
  tool: string,
  mode: 'user' | 'system' | 'iterate',
  templateId: string,
  modelKey: string,
  truncated: boolean,
  requirements?: string  // 无密钥
}
```

传输：stdio 或 HTTP（Bearer；安全中间件见 `http-security`）。  
Health：`/healthz` 最小 `{ ok }`。

### 11.6 Desktop IPC 域（摘要）

| 域 | 前缀示例 | 说明 |
|----|----------|------|
| model | `model-*` | 文本模型 CRUD/导入导出 |
| image | `image-*` / `image-model-*` | 图像生成与配置 |
| template | `template-*` | 模板 |
| history | `history-*` | 历史与 chain |
| preference / data | 偏好与全量备份 | 含密钥路径仅 main |
| remote-storage | Desktop only | S3/R2/WebDAV |
| stream | stream events + cancel | owner 绑定 |
| image-understanding | `image-understanding-understand` | 主进程理解 |

协议版本：**1.1.0**。新 channel 必须更新 manifest + 契约测试。

### 11.7 UI 级「接口」（组件契约）

| 组件/工具 | 输入 | 输出行为 |
|-----------|------|----------|
| `PostOptimizeActions` | 优化完成态 | 测试 / 评估 / 收藏 CTA |
| `EvalCaseSetPanel` | workspace 提示上下文 | 跑批 / 证据 / promptfoo 导出 |
| `seedDualModelKeys` | 已启用 models + 当前 key | 两 modelKey；不足则失败提示 |
| DataManager UI | includeSecrets 勾选 | 导出前确认 |

### 11.8 非接口（明确）

- 无多租户 REST。  
- 无浏览器直调对象存储。  
- 无 Promptfoo 进程内 runner API。

---

## 12. UX 与视觉打磨

### 12.1 原则

1. **闭环优先于装饰**：任何视觉改动不得挡住 CTA。  
2. **Paper 纸感**：离线字体、低炫光、阅读优先；不是玻璃拟态表演。  
3. **安静工作台**：少 toast 轰炸；错误单一通道。  
4. **诚实容量**：历史上限 near/full 可见。  
5. **危险操作显式**：含密钥导出二次确认。

### 12.2 体验升级清单（下一阶段）

| 项 | 优先级 | 说明 |
|----|--------|------|
| 手测走查文案 | P0 | 清单即脚本 |
| Context 挂 CTA | P1 | 与 basic 文案一致 |
| EvalCase 入口发现性 | P1 | 评估从 CTA 可达 |
| 双模型空态 | P2 | 不足两模型时的教育文案（已有 toast） |
| 实验 auto 入口 | P3 | 设置页隐藏区，默认关 |
| 对比度 | 持续 | ≥4.5 文本（与 Paper 协调） |

### 12.3 反模式

- 为「高级感」增加必填云登录。  
- 优化成功后无下一步。  
- 矩阵编辑器代替双列。  
- 自动优化按钮大于「测试」。

---

## 13. 开发路线图与 BACKLOG 增量建议（E 系列）

| ID | 项 | 验收 | 建议状态 |
|----|-----|------|----------|
| E0 | 真机手测清单 | 勾选签字 | **todo · 立即** |
| E1a | Context* PostOptimizeActions | 两 Context 工作区可见 | todo |
| E1b | EvalCase 入口扩展 | 至少 +Basic User 或 Context System | todo |
| E1c | 双模型铺 Context | 可选 | todo |
| E2 | 发版 / NSIS / version | 安装包 + CURRENT | todo |
| E3 | 手测缺陷修复 | 回归 | 按需 |
| E4 | 证据包 zip | 可选 60d | 后备 |
| E5 | 实验 auto UI | 默认关 | 60d+ |

Won't 继承：多租户、生产 Trace 云、Agent OS、默认 K8s、整仓 Promptfoo、主安装默认 auto。

---

## 14. 方案执行映射（表单 → 动作）

| 表单选择 | 执行 |
|----------|------|
| 主目标=可交付工作台 | 采用 P1 |
| 主目标=仅维护 | P0+E0 |
| 主输出含 E0 | 打开手测清单协助勾选/修缺陷 |
| 主输出含 E1 | 挂载 CTA/EvalCase |
| 主输出含 E2 | 走 RELEASE-RUNBOOK |
| 硬约束全维持 | 任何实现前 grep 脱敏/S3/auto |
| 带回竞品项=CTA | E1a 优先 |

---

## 15. C1/C2/C3/D3/D4 挂载事实（防回退）

| 能力 | 挂载点 | 测试 |
|------|--------|------|
| C1 | BasicSystem/UserWorkspace + `dual-model-seed.ts` | unit seed + 手测 |
| C2 | EvalCaseSetPanel + `promptfoo-export.ts` + core barrel | unit export |
| C3 | mcp `structured-result.ts` + 三工具 | structured-result tests |
| 导出确认 | DataManager.vue | 手测 |
| D1/D2 | `optimization-strategy.ts` + pref normalize | unit strategy |
| D3 | `service-container.js` + `register-domain-handlers.js` | desktop tests 75 |
| D4 | Dockerfile app/10001；supervisord mcp user=app | 静态+文档 |

---

## 16. CI 与发布事实

| 项 | 值 |
|----|-----|
| 功能 tip CI | success @ fe12cbf · run 29807745038 |
| 文档 tip | 9070556（通常不单独重跑全量也可接受） |
| 本地门禁 | `pnpm test:gate` / desktop test / docs check |
| 发版 | RELEASE-RUNBOOK + version:sync |
| Docker 推送 | workflow_run 常 skip（与 test 成功解耦） |

---

## 17. 风险登记册（R3）

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 手测发现 basic 回归 | 中 | 高 | E0 优先；E3 插入 |
| 入口铺全引入 props 缺省 | 中 | 中 | 学 ContextUser 默认 props |
| 发版 asar 漏 icons | 低 | 中 | runbook 检查表 |
| 用户误开 auto | 低 | 中 | 默认 false + 文案 |
| 上游大改包边界 | 低 | 高 | fork-only；按需 cherry-pick |

---

## 18. 30 天详细工作分解（P1）

### Week 1 — E0

1. 安装 `D:\PromtOptimizer\app\PromptOptimizer.exe` 或 `pnpm dev:desktop`。  
2. 按 HANDTEST 1–18 勾选。  
3. Fail 项建 E3 列表（含复现）。  
4. 可选：Web 仅 Drive 抽查。

### Week 2 — E1a

1. 在 `ContextSystemWorkspace.vue` / `ContextUserWorkspace.vue` 复用 `PostOptimizeActions`。  
2. i18n 键复用，不新造文案体系。  
3. 最小单测或组件挂载测。  
4. 手测回归 basic + context。

### Week 3 — E1b

1. EvalCase 入口：优先 Basic User 或 Context System 其一。  
2. 保持 preference 键 `eval.caseSets.v1` 不变。  
3. promptfoo 导出按钮随面板走。

### Week 4 — E2

1. 决定版本号（2.11.8 或 2.12.0 策略：补丁 vs 次版本）。  
2. `version:sync` + desktop 构建。  
3. 子集手测 + 更新 CURRENT / 安装 README 链接叙述。  
4. 归档 NSIS 路径记入 CURRENT。

---

## 19. 质量属性场景

| 属性 | 场景 | 度量 |
|------|------|------|
| 安全性 | 导出默认 | 无 apiKey |
| 可靠性 | 流式取消 | 无跨窗取消 |
| 可维护 | 新 IPC | manifest 同步 |
| 可用性 | 优化完成 | 3 秒内看到 CTA |
| 可移植 | 换机导入 | evalCaseSets 可跑 |
| 可观测（本地） | 证据 JSON | 含输入断言结果 |

---

## 20. 与 R2 文档关系

| 文档 | 关系 |
|------|------|
| INTEGRATED … R2 | 被本 R3 **进度取代**；战略段落仍可参考 |
| COMPETITIVE-ARCHITECTURE | 赛道长文仍有效 |
| COMPETITIVE-BRIEF | 须在表单后修订「下一刀」为 E 系列 |
| BACKLOG-90D | A–D done；E 系列可新表或续页 |
| CURRENT | 链到本 R3 |

---

## 21. 附录 A — 竞品 Sources（公开）

- Promptfoo：本地/CI 评测与红队定位（官方文档与开源仓库叙事）  
- Langfuse：自托管观测与提示管理  
- DSPy：程序化 LM 优化  
- Agenta：开源 LLMOps playground  
- PromptPerfect：SaaS 提示改写  
- 生态趋势：Eval + Observability 组合、local-first/self-host 持续（2025–2026 公开对比文）

> 星标数易变，本报告不以星标排序。

---

## 22. 附录 B — 检查命令速查

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer
git log -1 --oneline
gh run list --branch develop --limit 5
pnpm -F @prompt-optimizer/desktop test
node --test scripts/desktop-ipc-handlers.test.mjs
pnpm check:docs
```

---

## 23. 附录 C — 字数与诚实性声明

本 R3 以进度差分、架构、债表、API、路线图与量化对比为主体，**禁止**为凑字数复制同一段落。若未来修订，只追加差分节，不整体注水。

---

## 24. 市场需求深描：场景、价值链与定价边界

### 24.1 典型用户日程（Persona 叙事）

**Persona A · 独立全栈**  
上午用 Desktop 改系统提示，跑两条 contains 用例，导出证据 JSON 丢进项目 `docs/prompts/`。下午在 Cursor 里通过 MCP 再 iterate 一次，结构化 JSON 直接贴进 PR 描述。他不需要团队权限模型，但需要 **Key 不进 git** 与 **换机可导入**。

**Persona B · 小团队提示词负责人**  
自己本机完成优化与双模型对照，把 promptfoo.yaml 交给同事在 CI 跑回归。同事使用 Promptfoo 或内部脚本，不安装本工作台也行。价值链卡在 **薄导出**，而不是逼全员上同一 SaaS。

**Persona C · 内容/中文创作者**  
Paper 主题下长文阅读舒适；收藏夹与历史链比「数据集版本库」更符合心智。若产品跳转到英文 SaaS 或强制登录，直接流失。

### 24.2 价值链拆解

| 环节 | 用户付出 | 产品应交付 | 现行 |
|------|----------|------------|------|
| 写 | 时间 | 模板+多模式工作区 | 强 |
| 优化 | token 费 | 流式、可取消、可迭代 | 强 |
| 测 | token 费 | 多模型、双列 | basic 强 |
| 评 | 设计用例时间 | EvalCase + 证据 | 有、入口窄 |
| 存 | 磁盘 | 历史/收藏/偏好 | 强 |
| 交 | 分享成本 | 脱敏导出 + yaml | 强 |
| 嵌 | IDE 切换 | MCP 结构化 | 强 |

**瓶颈不在「再做一个优化算法」**，而在 **评入口窄** 与 **真机信任未建立**。

### 24.3 替代品与转换成本

| 从…迁移 | 转换成本 | 我们可降低的点 |
|---------|----------|----------------|
| 纯 ChatGPT 网页 | 低 | 一键优化+本地史 |
| Promptfoo only | 中 | yaml 导出对齐心智 |
| Langfuse 云 | 高 | 不宣称替代；做本地前端 |
| 自建脚本 | 中 | GUI 降低维护 |

### 24.4 「要不要商业化」边界

本 fork **不在 90 天内**定义订阅价。原因：AGPL、单人维护、主价值是本地工具。若未来商业化，合理切口是 **桌面发行与支持**，而非云租户——与宪章一致。

### 24.5 需求调研方法局限与仍可信结论

未做大规模问卷；证据来自：产品自身使用路径、竞品公开定位、本仓 issue/修复史（导出脱敏、CTA、MCP）。**可信结论**只有三条：隐私本地有需求；闭环比单点改写值钱；互操作应文件化而非平台化。

---

## 25. 竞品细节打磨参考（可执行颗粒度）

### 25.1 从 Promptfoo 学「配置即契约」

- 断言类型命名稳定（contains / not-contains）。  
- 我们已映射；未知类型 **skip 列表可见**，不静默丢。  
- **不要**在 UI 实现 promptfoo 的 provider 矩阵；那是 CLI 的护城河。

### 25.2 从 Langfuse 学「证据字段」

- 每次评估至少：输入、提示版本标识、模型键、断言、通过与否、时间。  
- 我们证据 JSON 已覆盖最小集；下一步若做 zip，只是打包，不改语义。

### 25.3 从 DSPy 学「预算」

- `maxRounds`、`maxCharsBudget` 已在策略 plan。  
- UI 若暴露，必须并排显示 **预计调用次数** 与 **取消**。  
- 禁止「智能优化中」无限转圈无进度。

### 25.4 从 Agenta 学「改完就测」

- PostOptimizeActions 是正确抽象。  
- 铺全时保持 **同一组件**，避免 Context 一套、Basic 一套文案分叉。

### 25.5 从 PromptPerfect 学「并排」与要拒绝的

- 并排降低认知负担 → C1。  
- 拒绝：强制账号、结果上传训练、默认厂商锁。

### 25.6 社区与内容运营（非代码）

若维护者做内容：演示「脱敏导出 + yaml 进 CI」一条视频，比罗列二十个模型厂商更有效。这不进入代码 backlog，但服务 P1 的市场叙事。

---

## 26. 架构优化专题：装配、模式入口与扩展点

### 26.1 Desktop 装配演进（已完成 D3 的意义）

**过去**：`main.js` 直接 require 大量 core 工厂，环境 Key 探测与 Preference 初始化散落，review 困难。  
**现在**：`createCoreServices` 内聚顺序（storage → preference → template language → … → prompt/data）；测试可 mock core。  
**仍须遵守**：新服务只加 container 与 domain handler，不回主文件堆逻辑。

### 26.2 模式入口一致性模型

```
WorkspaceShell
  ├─ BasicSystem   ✅ CTA ✅ Eval ✅ Dual
  ├─ BasicUser     ✅ CTA ❌ Eval ✅ Dual
  ├─ ContextSystem ❌ CTA ❌ Eval ❌ Dual
  ├─ ContextUser   ❌ CTA ❌ Eval ❌ Dual
  └─ Image*        ❌ CTA（图像闭环另论）
```

E1 的架构动作不是「复制粘贴三份」，而是：

1. 确认优化完成事件/状态在 Context 与 Basic 同构或可适配；  
2. 挂载同一 `PostOptimizeActions`；  
3. Eval 面板依赖的 `useEvalCaseSet` 与当前提示 ref 对齐；  
4. 双模型仅依赖测试区列模型 API，优先 Context 测试条。

### 26.3 扩展点清单（允许 vs 禁止）

| 扩展点 | 允许 | 禁止 |
|--------|------|------|
| OptimizationStrategy | 新策略类 + 实验旗标 | 默认替换 template |
| 导出适配器 | 新文件格式纯函数 | 导出时上传云 |
| MCP tool | 只读/优化类小工具 | 任意 shell |
| IPC domain | manifest+secure | 无校验 ipcMain.handle |
| UI 主题 | Paper 变量 | 运行时远程皮肤包（无签名） |

### 26.4 数据所有权

- Preference / FileStorage：用户机器。  
- 导出文件：用户移动时的权威快照。  
- MCP 调用：无持久会话库（除非用户自己配）；结构化结果即时返回。  
- 远程备份：显式动作；路径规范化；Desktop 特权。

### 26.5 失败域隔离

| 失败 | 隔离策略 |
|------|----------|
| 单模型 API 5xx | 双列另一侧仍可显示错误卡 |
| Eval 跑批部分失败 | 不丢表单；错误区列出 |
| safeStorage 不可用 | 回退策略需诚实提示（已有 secret 路径演进，勿静默明文） |
| MCP 超长输出 | truncate + meta.truncated |

---

## 27. 技术债工作说明书（How-to-pay）

### 27.1 T1 手测未签

**步骤**：装现网 app 或 dev → 打开清单 → 逐项；Fail 记 `docs/project/HANDTEST-LOG-YYYYMMDD.md`（可选）。  
**完成定义**：关键项 Pass 或 E3 列表有 owner。

### 27.2 T2/T3 入口债

**步骤**：读 BasicSystem 挂载片段 → Context 对称 → 视觉与 i18n 复用 → 手测。  
**完成定义**：Context 优化成功后 3 秒内可见 CTA；评估入口可发现。

### 27.3 T7 版本号

**步骤**：语义化：仅修复 → 2.11.8；入口可感知功能集合 → 可考虑 2.12.0。本仓库习惯补丁也可，但 CURRENT 必须写清「相对 2.11.7 用户可见变更」。  
**完成定义**：安装包版本 = package.json = CURRENT。

### 27.4 永不「用债换债」

禁止用「先开默认 auto 提升爽感」换取演示效果——那是战略级回退，不是债置换。

---

## 28. 开发规范补充：评审清单与测试金字塔

### 28.1 PR 自检表（复制到描述）

- [ ] 未引入 ui→aws-sdk / 工厂 re-export  
- [ ] 导出路径默认脱敏  
- [ ] 新 IPC 已进 manifest  
- [ ] 实验功能默认关  
- [ ] i18n 三语键齐全  
- [ ] 单测或契约测  
- [ ] 未把绝对本机路径写入用户文档  
- [ ] 若改版本：只通过 CURRENT 流程  

### 28.2 测试金字塔（现行）

| 层 | 代表 | 何时必跑 |
|----|------|----------|
| 纯函数单测 | promptfoo-export、dual-model-seed、strategy | 每次相关改动 |
| 包测 | core/ui gate | CI |
| Desktop 契约 | service-container、ipc handlers | desktop 改动 |
| E2E VCR | gate/extended replay | CI；录制慎用 |
| 手测 | HANDTEST | 发版前 |

### 28.3 命名与错误消息

- 用户可见错误：可行动（「请启用两个模型」而非 `Error: undefined`）。  
- 日志：英文或结构化；无 Key。  
- 功能旗标：`experimental*` 前缀偏好键，避免与正式设置混名。

### 28.4 文档规范（方案 C）

- L0 调研可长；L1 CURRENT/BRIEF 短且权威。  
- 冻结横幅与 `pnpm check:docs` 必须过。  
- 归档不删证据；不把 archives 当现行。

---

## 29. API 接口文档扩写：错误、版本与示例

### 29.1 MCP 错误形状（逻辑）

调用失败时不得假装成功 JSON。应走 MCP 错误通道或 isError 内容；**禁止**在 optimized 字段塞堆栈。  
截断成功仍是成功：`meta.truncated=true`。

### 29.2 导出 JSON 最小期望字段（逻辑模型）

```json
{
  "meta": { "secretsIncluded": false, "exportedAt": "ISO-8601" },
  "models": [],
  "imageModels": [],
  "history": [],
  "favorites": [],
  "evalCaseSets": [],
  "userTemplates": [],
  "userSettings": {},
  "contexts": []
}
```

实际键名以 DataManager 实现为准；验收时以 **无明文 apiKey** 与 **evalCaseSets 可解析** 为硬标准。

### 29.3 promptfoo.yaml 最小示例（示意）

```yaml
description: prompt-optimizer-export
prompts:
  - "优化后的系统提示…"
tests:
  - description: case-1
    vars:
      input: "用户输入样例"
    assert:
      - type: contains
        value: "必须出现的短语"
```

### 29.4 IPC 调用约定

- 成功信封：`{ success: true, data }`  
- 失败：`{ success: false, error }`  
- 流式：事件通道与 invoke 分离；cancel 校验 sender。  
- 版本：`IPC_PROTOCOL_VERSION = 1.1.0`；破坏性变更递增并写契约测。

### 29.5 策略 plan 示例

```ts
// template（默认）
{ kind: 'template', templateId: 'general-optimize', note: 'Default human template path' }

// auto-experimental（仅 opt-in）
{ kind: 'auto-experimental', maxRounds: 3, maxCharsBudget: 20000, templateId: '…', note: '…' }
```

### 29.6 版本策略

- MCP structured `meta.version`：现为 **1**；加字段保持兼容，删字段或改义则升版本。  
- 导出格式：优先加可选字段；读取端应忽略未知字段。

---

## 30. UX 流程脚本（手测可复用）

### 30.1 快乐路径（System）

1. 启动 → Basic System。  
2. 粘贴提示 → 选模板 → 优化。  
3. 见 CTA → 点测试 → 双模型 → 测试全部。  
4. 打开用例 → 一条 contains → 跑批 → 导出证据与 yaml。  
5. 收藏优化结果。  
6. 数据管理导出（默认）→ 确认无 Key。

### 30.2 危险路径

1. 勾选包含密钥 → 导出 → **必须**确认框。  
2. 取消确认 → 无文件。  
3. 确认 → 文件含 Key → **不上传、不贴聊天**。

### 30.3 容量路径

1. 历史抽屉看 count/max。  
2. 调低上限 → 警告 → 确认截断策略符合文案。

### 30.4 视觉验收（Paper）

- 长文本区对比度可读。  
- 无多余动画挡住 CTA。  
- 暗光环境下纸感不发灰到看不清边框（按主题变量微调，不单开皮肤项目）。

---

## 31. 方案对比补充：决策树

```
是否要 30 天内给「可给他人用的包」？
├─ 否 → P0 + 至少 E0（自己信任）
└─ 是 → 手测是否已签？
         ├─ 否 → 先 E0（可并行准备 E2 构建脚本）
         └─ 是 → 入口债是否阻塞演示？
                  ├─ 是（只 demo Context）→ E1 优先再 E2
                  └─ 否（只 demo Basic）→ 可 E2，发行说明写清范围
是否想做自动优化主按钮？
└─ 是 → 拒绝；引导实验开关设计（P5 否决）
是否想内嵌 Promptfoo？
└─ 是 → 拒绝；导出即可（P4 否决）
```

### 31.1 加权分计算说明

加权分 = Σ(维度分 × 权重)。P1 在「价值/风险/发布」拿满，成本分 4（非 5）因 E1 仍有工作量——这是诚实分，不是广告分。

### 31.2 若资源只够两天

Day1：E0 手测 + 阻塞缺陷。  
Day2：E2 子集（不升大版本，仅打当前 tip 包）或 E1a 二选一；**优先修阻塞缺陷**。

---

## 32. 安全与合规对照（工作台范围）

| 主题 | 要求 | 现行 |
|------|------|------|
| 密钥存储 | OS 级优先 | Desktop safeStorage |
| 密钥传输 | 仅至用户配置的厂商 | 是 |
| 密钥导出 | 默认否 + 确认 | 是 |
| 供应链 | lockfile / 可信 registry | pnpm |
| 容器 | 能非 root | 里程碑；默认 80 仍 root 可能 |
| 许可证 | AGPL-3 | 保留声明 |
| 日志 | 无密钥 | 需持续 code review |
| XSS | 用户 HTML 不默认 v-html | 加固批已关注 |

---

## 33. 发布工程（E2）细案

### 33.1 输入

- 绿 CI tip  
- 手测记录  
- `version` 决策  

### 33.2 步骤（逻辑）

1. `pnpm version:prepare` / 同步 scripts  
2. 全量 desktop 构建  
3. NSIS 产出路径记入 CURRENT  
4. 安装到干净目录冒烟：启动、优化一次、导出一次  
5. 打 tag（若策略需要）— **先确认用户是否要 push tag**  
6. 更新 handoff 记忆  

### 33.3 回滚

安装包保留旧目录 `nsis-*` 归档；CURRENT 指回旧路径即可叙事回滚。代码回滚用 git revert，不 rewrite 已发 tag。

---

## 34. 团队节奏与单人节奏

单人维护建议：

| 日 | 焦点 |
|----|------|
| 一 | CI/安全 grep |
| 二 | 核心路径代码 |
| 三 | 闭环/入口 |
| 四 | 边界债 |
| 五 | 文档与手测 |

与旧调研 § 每周节奏对齐；竞品学习 **周五最多一项** 入 backlog。

---

## 35. 指标建议（本地产品 · 非增长黑客）

| 指标 | 定义 | 目标 |
|------|------|------|
| 手测通过率 | 清单 Pass/总项 | ≥ 90% 关键项 |
| 导出安全 | 默认包抽查 | 100% 无 Key |
| CI | tip success | 保持 |
| 入口覆盖 | 模式数含 CTA | Basic+Context |
| 崩溃 | 启动后 5 min | 0 必现崩溃 |

不做强制遥测；指标靠发版前人工与 CI。

---

## 36. 反例库（曾经或可能的错误方向）

1. **把 FULL-SCAN 五十条全做完** → 失去主目标。  
2. **Web 引 S3「先方便」** → 包体积与密钥面扩大。  
3. **默认 auto-opt** → 账单与不可解释性。  
4. **为追上游每周 merge** → 边界回退。  
5. **矩阵编辑器** → 维护量爆炸、偏离 GUI 工作台。  
6. **未手测发大版本** → 信任一次透支。  

---

## 37. E 系列规格骨架（表单后可落盘）

```markdown
# NEXT-CUT-SPEC-E0-HANDTEST
目标：签字
非目标：新功能
验收：清单 §1-5
```

```markdown
# NEXT-CUT-SPEC-E1-ENTRY-PARITY
目标：Context 挂 PostOptimizeActions；（可选）Eval 入口
约束：复用组件；不改 preference 键
验收：手测 Context 路径
```

```markdown
# NEXT-CUT-SPEC-E2-RELEASE
目标：版本+安装包+CURRENT
约束：fork-only；不强制 push
验收：干净目录安装冒烟
```

---

## 38. 与记忆 / 跨会话交接

- 记忆文件：`prompt-optimizer-handoff-2026-07-21.md`  
- 新会话口令：「继续 PromptOptimizer / 手测」或「按 R3 表单执行」  
- 本文 R3 为 L0；执行以表单冻结 + BRIEF 为准  

---

## 39. 完整问题—方案追溯矩阵

| 用户问题 | 方案元素 |
|----------|----------|
| 提示好不好？ | 优化+双模型+Eval |
| 为什么好？ | 证据 JSON/历史链 |
| 能不能给同事？ | 脱敏导出+yaml |
| Key 会不会泄露？ | safeStorage+默认脱敏+确认 |
| IDE 里能不能用？ | MCP 结构化 |
| 能不能全自动？ | 实验策略默认关 |
| 能不能当公司平台？ | **不**；边界外 |

---

## 40. 交互表单指令（会话内呈现）

向维护者呈现表单，维度建议：

1. **主目标**：可交付工作台（P1） / 仅维护+手测 / 先发包后铺全（P2）  
2. **硬约束**：全维持（推荐）  
3. **主输出（可多选）**：E0 手测 / E1 入口 / E2 发版 / E3 仅修缺陷  
4. **E1 深度**：仅 CTA / CTA+EvalCase / CTA+EvalCase+双模型  
5. **发版节奏**：本周 NSIS / 手测全绿后再说 / 不发版  
6. **竞品只带回一项**：Context CTA / EvalCase User / 证据 zip / 暂不带回  

选择完成后：更新 COMPETITIVE-BRIEF 下一刀、写 NEXT-CUT-SPEC-E*、按序执行。

---

## 41. 最终建议（表单前默认）

| 项 | 默认 |
|----|------|
| 方案 | **P1** |
| 序 | **E0 → E1a → E1b → E2** |
| 硬约束 | 全维持 |
| 竞品带回 | Context CTA |
| 不做 | P3/P4/P5 |

---

## 42. 收束语

R3 的核心不是再讲一遍「我们是本地工作台」——R2 已讲清——而是承认：**竖切完成之后，产品成熟度由「手测签字、入口一致、可重复发版」定义**。竞品仍只提供经验颗粒，不提供身份。P1 方案在统一权重下显著优于平台化与评测深化；执行时用表单冻结范围，避免会话级范围蔓延。

**维护**：表单冻结后，将结论写回 `docs/project/COMPETITIVE-BRIEF.md` 与（可选）新 `BACKLOG-E-SERIES`；版本路径只改 `CURRENT.md`。  
**本文路径**：`D:\PromtOptimizer\docs\INTEGRATED-WORKBENCH-DECISION-RESEARCH-2026-07-21-R3.md`  
**配套链接**：CURRENT 已增加 R3 入口；旧 R2 文件保留作历史进度快照。
