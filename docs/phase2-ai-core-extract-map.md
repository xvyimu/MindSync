# Phase2 · AI-Core 抽离地图（MindSync P1 预研）

**状态**：预研 / 只读方案（本轮**不改代码、不改 Vue 面板、不写业务大改**）  
**日期**：2026-07-22  
**分支**：`xvyimu/ms-2`  
**SSOT**：`D:\orca\docs\portfolio-side-track-2026-07-22.md` · `architecture-decision-2026-07-22-approved.md` · Master §3.3 / Phase 2  
**最高目标**：Better-wins-with-evidence（有证据才换实现；禁止无证换栈重写）

---

## 0. 结论摘要

| 项 | 结论 |
|----|------|
| **目标态** | 从 monorepo 内 `@mindsync/core` 的 **编排 / 评测 / 批跑** 能力，绞杀抽到 **Python AI-Core**；面板已 Vue **不动**；Electron 壳可暂留 |
| **P0 优先抽** | `evaluation`（含 structured compare、eval-case、promptfoo 导出、rewrite-from-evaluation）、`prompt` 编排面（optimize / iterate / test 协议）、`variable-extraction` / `variable-value-generation`、优化策略预算环 |
| **P1 后抽 / 可旁路** | LLM 适配器热路径（暂留 TS 或双轨）、批跑作业调度 + 证据包持久化、MCP 侧工具面映射 |
| **明确不抽（留 TS）** | `storage` / Dexie / FileStorage、`preference`、`favorite`、`history` UI 链、`template` 大量静态文案与 UI 绑定、`compare`（jsdiff 文本 diff）、图像生成全套、Electron IPC 壳 |
| **边界原则** | Vue / Electron **不直连** Python 内部端口；桌面经 **主进程网关**（现有 IPC → 未来可挂 HTTP/stdio sidecar）；Web 经同源 BFF 或可选本地 sidecar；密钥只在服务端 / 主进程 |
| **本轮非目标** | 不实现 Python 服务、不改面板、不改计费/生产、不 push、不抢 TransitHub 模块二 |

**规模锚点（`packages/core/src/services`，约 2026-07-22 统计）**：

| 模块 | 文件数 | 约行数 | 抽离倾向 |
|------|--------|--------|----------|
| template | 154 | ~11.8k | 大部分留 TS；仅「运行时协议 + 少量表」进 Python |
| llm | 24 | ~6.3k | 适配器暂留；协议契约可镜像 |
| **evaluation** | 10 | **~4.8k** | **P0 主战场** |
| image | 19 | ~4.7k | 不抽（生成/存储） |
| model | 13 | ~3.3k | 配置元数据留 TS；Python 只吃 `ModelRef` |
| favorite / storage / history | — | ~2–2.3k 各 | 不抽 |
| **prompt** | 6 | **~1.5k** | **P0 编排协议** |
| variable-* | 8 | ~0.75k | **P0 薄服务** |
| compare (jsdiff) | 4 | ~0.3k | 不抽 |

---

## 1. As-Is 运行时拓扑（证据）

### 1.1 包与职责

```
mindsync/  (pnpm monorepo, AGPL-3.0)
├── packages/core     @mindsync/core     领域服务 + LLM/图像适配器（TS）
├── packages/ui       @mindsync/ui       Vue3 面板（已 Vue，本轮冻结）
├── packages/web      Web 壳
├── packages/desktop  Electron 主进程 / preload / IPC
├── packages/extension
└── packages/mcp-server  复用 core 的 MCP 工具面（TS）
```

- **Core 双入口**（`docs/architecture/electron-adapter-entrypoint.md`）：
  - `@mindsync/core`：浏览器中立领域
  - `@mindsync/core/electron`：Renderer 侧 Proxy（`ElectronLLMProxy`、`ElectronPromptServiceProxy` 等）
- **Desktop 装配**（`packages/desktop/config/service-container.js`）：主进程 `createCoreServices` 装配 storage → preference → managers → **LLM / Prompt / Image** → data。  
  **注意**：主进程容器**当前不装配** `EvaluationService` / `VariableExtraction*`；评估在 **UI 初始化路径**用已代理的 `llmService` 等在渲染进程侧 `createEvaluationService(...)`（见 `packages/ui/src/composables/system/useAppInitializer.ts`）。
- **IPC 已覆盖**（`channel-manifest.js` 等）：model / image(+understanding) / template / history / llm(stream) / prompt(sync+stream) / preference / context / data / favorite / system…  
  **无** `evaluation-*` / `eval-case-*` / `variable-extraction-*` channel → 评估与变量智能**未**走主进程 IPC，依赖 Renderer 内 core + 经代理的 LLM。

### 1.2 逻辑分层（现状 vs 目标）

```
[ 现状 ]
Vue UI ──IPC/直接──► @mindsync/core (TS)
                         ├─ PromptService (编排)
                         ├─ EvaluationService (LLM 评判 + structured compare)
                         ├─ LLMService + 多 Provider Adapter
                         ├─ TemplateManager + 大量 default-templates
                         └─ Storage / Preference / History / Favorite …

[ 目标 · 绞杀 ]
Vue UI ──IPC──► Electron Main (网关/密钥/本地存储)
                    │
                    ├─ 仍留 TS：storage, preference, history, template CRUD, image gen, jsdiff compare
                    │
                    └─ HTTP/stdio ──► services/ai-core (Python)
                                        ├─ 优化/迭代/测试 作业
                                        ├─ Evaluation / Structured Compare / Rewrite brief
                                        ├─ EvalCase 批跑 + 断言 + 证据包
                                        └─ 变量提取 / 变量值生成
```

Master §3.3 目标形态（引用）：

```
apps/desktop/      → 可暂留 Electron
packages/…         → 逐步瘦身
services/ai-core   → Python（优化/评测/批跑）
console/           → Vue3+NaiveUI（已满足，本轮不动）
```

---

## 2. 模块表：可抽 / 缓抽 / 不抽

### 2.1 P0 — 优先抽到 Python（编排与评测）

| ID | 源路径（TS） | 职责 | 为何适合 Python | 建议 Python 落点 | 依赖缝 | 证据/风险 |
|----|--------------|------|-----------------|------------------|--------|-----------|
| **E1** | `services/evaluation/service.ts` + `types.ts` + `structured-compare-prompts.ts` | LLM 评估：result / compare / prompt-only / prompt-iterate；structured compare = pairwise judge + synthesis | 长链路编排、并发 judge、JSON 修复与协议演进；Master 明确 AI-Core | `ai_core/evaluation/` | 入：`EvaluationRequest`+`ModelRef`+模板 id/正文；出：`EvaluationResponse`+metadata | ~4.8k 行；与 UI 会话强耦合字段多，**契约先冻结** |
| **E2** | `services/evaluation/eval-case-runner.ts` + `eval-case-types.ts` + `eval-case-repository.ts` | 用例集串行跑 + contains/not_contains 断言 + 证据包 | 批跑/CI 友好；纯函数断言易 port | `ai_core/eval_cases/` | 入：`EvalCaseSet`+`modelKey`；出：`EvalEvidenceBundle` | Runner 已是薄依赖 `ILLMService.sendMessage` |
| **E3** | `services/evaluation/promptfoo-export.ts` | EvalCaseSet → promptfoo.yaml（纯适配，不 vendor） | 导出/互操作属工具链 | `ai_core/interop/promptfoo.py` | 纯数据 in/out | 已宣称 no secrets；契约测试易做 |
| **E4** | `services/evaluation/rewrite-from-evaluation.ts` | 评估结果 → rewrite brief / 模板上下文 | 压缩、分层、stop/conflict 信号属评测后处理 | `ai_core/evaluation/rewrite.py` | 入：`EvaluationResponse` 压缩视图；出：rewrite prompt 材料 | 文档：`structured-compare-and-evaluation-rewrite.md` |
| **P1** | `services/prompt/service.ts` + `types.ts` | optimize / iterate / test / message-optimize 编排 | 「纯优化/批跑」= Phase2 A2 | `ai_core/prompt_jobs/` | 入：`OptimizationRequest` 等；出：流式 token 事件 + 最终文本 | 现已有 IPC；迁移时 **保持 channel 语义** 或加 `ai-core-*` 旁路 |
| **P2** | `services/prompt/optimization-strategy.ts` | template vs auto-experimental 预算（maxRounds/chars） | 策略环 + 预算更适合服务端可观测 | `ai_core/prompt_jobs/strategy.py` | 设置项来自 preference（TS 读，传快照） | 默认 auto **关闭**（ADR-005），迁移勿改默认 |
| **V1** | `services/variable-extraction/*` | LLM 抽变量 | 与评测同构：模板→LLM→JSON | `ai_core/variables/extract.py` | 同 E1 | 薄 |
| **V2** | `services/variable-value-generation/*` | LLM 生成变量值 | 同上 | `ai_core/variables/generate.py` | 同 E1 | 薄 |

**P0 合包建议**：一个进程内模块 `evaluation` + `prompt_jobs` + `variables`，共享 `llm_client` 端口抽象（见 §4）。

### 2.2 P1 — 有条件抽离 / 双轨

| ID | 源路径 | 职责 | 建议 | 触发条件（证据） |
|----|--------|------|------|------------------|
| **L1** | `services/llm/service.ts` + `adapters/*` | 多 Provider 文本调用、流式、tool call | **默认暂留 TS**（桌面主进程已持密钥与 stream registry）；Python 侧用 **httpx/openai-compatible 客户端** 复用用户已配 endpoint，**不重写全部 adapter** | 当批跑/服务端部署需要与桌面 **同配置矩阵** 且 TS 适配器维护成本 > Python 官方 SDK 时，再开 R2 |
| **L2** | `services/llm/types.ts`（`Message`/`StreamHandlers`） | 消息与流协议 | **契约镜像**到 OpenAPI / JSON Schema；TS 与 Python 双实现对照测试 | 契约测试套就绪后 |
| **I1** | `services/image-understanding/*` | 多模态理解（桌面有 IPC） | 可进 Python 多模态路径；桌面仍可走 nativeImage 预处理 | 评测 E1 需要统一理解管道时 |
| **M1** | `packages/mcp-server` | MCP 工具暴露 core 能力 | 工具实现改为调 AI-Core HTTP，而非 in-process core | AI-Core 稳定 + MCP 集成测绿 |
| **J1** | （新）作业/队列 | 长时批跑、取消、重试 | Python + 可选 SQL 任务表（Master A4） | 出现「单次 UI 会话放不下」的批跑需求 |

### 2.3 明确不抽（留 Electron/Vue/TS）

| ID | 模块 | 理由 |
|----|------|------|
| **N1** | `services/storage/*`（Dexie/Local/Memory/File/SecretAware） | 桌面本地持久化与 secret codec 属壳与信任边界 |
| **N2** | `services/preference/*` | UI 设置；Python 只收**作业快照** |
| **N3** | `services/history/*`、`favorite/*`、`context/*` | 会话/收藏/上下文 UI 域 |
| **N4** | `services/data/*`（导入导出） | 与本地存储强绑定；密钥脱敏逻辑留 TS |
| **N5** | `services/compare/*`（jsdiff） | 纯前端文本 diff，无 LLM |
| **N6** | `services/image/*` + `image-model/*`（生成与存储） | 图像生成适配器与本地图存；非「编排/评测」主目标 |
| **N7** | `services/template/*` 主体 + `default-templates/**` | ~12k 行模板与 i18n 文案；**先**通过「传 templateId + 已渲染 messages 或 prompt 正文」给 Python，避免一次性搬迁文案库 |
| **N8** | `services/model/*` 配置 CRUD | 模型配置与 UI；Python 收 `ModelRef{provider, model, baseUrl?, apiKeyHandle}` |
| **N9** | `packages/ui/**`、`packages/web/**` | **本轮禁止面板大改** |
| **N10** | Desktop IPC 安全壳（`ipc-security`、stream-registry、safeStorage） | 信任边界；AI-Core 只做被调用方 |

---

## 3. 与 Electron / Vue 的边界

### 3.1 信任与数据流

| 层 | 允许 | 禁止 |
|----|------|------|
| **Vue Renderer** | 展示、会话状态、发作业请求、消费流式 token/进度 | 持有明文 API Key（桌面）；直连 `127.0.0.1:ai-core` 若无网关 |
| **Electron Main** | 密钥（safeStorage）、装配、IPC 校验、**转发** AI-Core、本地文件存储 | 把 secret 打进评测日志/证据包 |
| **Python AI-Core** | 编排、评测、断言、导出 yaml、作业状态 | 写用户 IndexedDB；绕过主进程读密钥文件 |
| **Web** | 可选：同源 BFF → AI-Core；或纯 TS 路径直至 sidecar 可选 | 浏览器暴露内部 AI 端口到公网 |

### 3.2 迁移期绞杀顺序（文档级，本轮不实施）

1. **契约冻结**：把 `EvaluationRequest/Response`、`EvalCaseSet/EvidenceBundle`、`OptimizationRequest`、流式事件 envelope 写成 OpenAPI 3 + JSON Schema（与现 TS 类型对齐）。  
2. **Python 影子实现**：同输入 → 对比输出（golden / 现有 VCR / calibration 脚本 `compare:calibrate` 思路复用）。  
3. **Desktop 旁路开关**（feature flag）：`prompt-*` / 未来 `evaluation-*` IPC 可路由到 AI-Core；默认仍 TS。  
4. **评估主路径迁移**：因评估**尚未**进 IPC，可先在 Main 新增 `evaluation-*` channel **直接**挂 Python，避免 Renderer 双实现长期并存。  
5. **Prompt 路径**：IPC 语义不变，Main 内 `promptService.*` 改为 HTTP client 调 AI-Core（Strangler）。  
6. **下线**：TS 内对应服务标 deprecated；core 体积下降后再考虑删 adapter 重复。

### 3.3 流式与取消

- 现状：`stream-registry` + `owned-stream-runner` 绑定 sender；LLM/Prompt 流事件 `stream-content|thinking|finish|error|tool-call`。  
- AI-Core：建议 **SSE 或 NDJSON over HTTP**，Main 翻译为既有 IPC 事件名 → **UI 零改**（符合「面板不动」）。  
- 取消：Main 持有 `Abort`/`job_id`，转发 cancel；Python 协作式取消。

---

## 4. 建议仓库布局

### 4.1 推荐（monorepo 内旁路，低协调成本）

与 Master A1「`services/ai` 或独立 `ai-core`」对齐，**优先仓内目录**（证据：与 desktop/mcp 同仓契约测试更便宜；未证明需独立发布前不拆仓）：

```
mindsync/
├── packages/                 # 现有 TS（逐步瘦身）
├── services/
│   └── ai-core/              # Python AI-Core（新建 · 本轮仅规划）
│       ├── pyproject.toml
│       ├── README.md
│       ├── src/ai_core/
│       │   ├── __init__.py
│       │   ├── main.py              # FastAPI app + /health
│       │   ├── api/
│       │   │   ├── v1_prompt_jobs.py
│       │   │   ├── v1_evaluation.py
│       │   │   ├── v1_eval_cases.py
│       │   │   └── v1_variables.py
│       │   ├── domain/
│       │   │   ├── evaluation/
│       │   │   ├── prompt_jobs/
│       │   │   ├── eval_cases/
│       │   │   └── variables/
│       │   ├── llm/
│       │   │   ├── port.py          # Protocol: complete / stream
│       │   │   └── openai_compat.py # 默认客户端
│       │   ├── contracts/           # 生成或手写 JSON Schema 镜像
│       │   └── obs/                 # 结构化日志（禁 secret）
│       ├── tests/
│       │   ├── contract/            # 与 TS golden 对齐
│       │   └── unit/
│       └── scripts/
│           └── export_openapi.py
├── docs/
│   └── phase2-ai-core-extract-map.md  # 本文
└── ...
```

### 4.2 备选（独立仓）

仅当需要 **多产品复用**（TransitHub 网关 → 同一 AI-Core）且版本发布节奏分叉时：`D:\orca\ai-core` 或组织级仓。MindSync 通过 OpenAPI 版本约束消费。  
**本阶段不强制**；先仓内验证契约。

### 4.3 与组合栈关系

| 组件 | 语言 | MindSync 中角色 |
|------|------|-----------------|
| Console | Vue3（已有 ui） | 面板；本轮冻结 |
| Desktop shell | Electron/TS | 网关 + 本地存储 |
| AI-Core | Python | 编排/评测/批跑 |
| Gateway | Go（TransitHub） | **不**在本轮接入；未来可选「云端 MindSync」时再接 |
| MCP | TS 薄壳 → HTTP | 工具面 |

---

## 5. 接口缝（Interface Seams）

### 5.1 核心 REST 草案（v1，文档级）

| Method | Path | 对应 TS | 说明 |
|--------|------|---------|------|
| GET | `/health` | — | A1 验收 |
| POST | `/v1/prompt/optimize` | `promptService.optimizePrompt` | 非流式 |
| POST | `/v1/prompt/optimize:stream` | stream 变体 | SSE |
| POST | `/v1/prompt/iterate` | `iteratePrompt` | |
| POST | `/v1/prompt/test` | `testPrompt` | |
| POST | `/v1/evaluation/run` | `EvaluationService` 主入口 | 含 type + mode |
| POST | `/v1/evaluation/structured-compare` | structured 路径 | 可并入 run |
| POST | `/v1/evaluation/rewrite-brief` | `rewrite-from-evaluation` | 纯变换可无 LLM |
| POST | `/v1/eval-cases/run` | `runEvalCaseSet` | 批跑 |
| POST | `/v1/eval-cases/export/promptfoo` | `exportPromptfooYaml` | |
| POST | `/v1/variables/extract` | VariableExtraction | |
| POST | `/v1/variables/generate-values` | VariableValueGeneration | |
| POST | `/v1/jobs/{id}/cancel` | AbortSignal 映射 | |

**鉴权（桌面）**：localhost + 启动时随机 token（Main 注入）；**不做**公网默认监听。  
**鉴权（未来云）**：走 Go 网关；本图不展开。

### 5.2 共享 DTO 原则

1. **camelCase JSON** 与现 TS 字段对齐，降低 UI 适配。  
2. 大字段（完整 snapshot 输出）可截断 + `artifact_ref`；证据包可文件落盘由 Main 写 userData。  
3. **禁止**在请求/响应中回传 API Key；只用 `modelKey` + Main 侧解析配置后，由 Main 以 **server-side** 方式调 Provider，或把 **短时 scoped credential** 仅注入 AI-Core 内存（桌面同源进程信任模型需书面 R2）。  
4. **推荐默认**：**LLM 调用仍由 Main/TS `LLMService` 执行**，AI-Core 通过 **回调 port** 或「预渲染 messages + 由调用方执行 complete」两种模式之一——见下。

### 5.3 LLM Port 两种部署模式（需后续择一）

| 模式 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| **A. AI-Core 自持 LLM 客户端** | Python 用用户 endpoint 直接调 Provider | 批跑简单、可无 Electron | 密钥与 adapter 矩阵要迁/镜像 |
| **B. AI-Core 无密钥，回呼 Main** | Python 只出 messages 计划；Main 调 `LLMService` 再回填 | 密钥与现 adapter 零迁移 | 延迟/复杂度高；批跑往返多 |

**预研推荐**：**批跑与 CI 走 A（显式注入 env/配置）**；**桌面交互路径优先 B 或「Main 作 LLM 代理的 A'」**（AI-Core → `http://main-proxy/llm`），避免复制 15+ adapter。最终以 R2 证据门选定。

### 5.4 契约测试缝

| 套件 | 位置建议 | 断言 |
|------|----------|------|
| OpenAPI 与 TS 类型字段对齐 | `services/ai-core/tests/contract` + 现有 core unit | 必填字段、枚举 |
| EvalCase 断言纯函数 | 双端同 fixture | `evaluateAssertions` 金标 |
| Promptfoo 导出 | 无 secret + yaml 形状 | `assertPromptfooYamlHasNoSecrets` 行为一致 |
| Structured compare 元数据 | 复用 `docs/workspace/compare-evaluation-analysis` 样本 | `compareJudgements` / `stopSignals` 形状 |

---

## 6. 风险登记

| # | 风险 | 等级 | 缓解 |
|---|------|------|------|
| R1 | Evaluation 类型面巨大，UI 强依赖 metadata 形状 | 高 | 先冻结 OpenAPI；影子双跑；禁止「顺手改协议」 |
| R2 | 评估现跑在 Renderer，迁 Main/Python 改变时序与取消语义 | 高 | 新 IPC + 与 stream-registry 对齐；e2e gate 覆盖 |
| R3 | 模板库体量 (~12k) 若强行搬 Python | 高 | **不搬文案库**；传 templateId 或已渲染 messages |
| R4 | LLM adapter 分叉（TS vs Python） | 中 | 默认不复制；Main 代理或 openai-compatible 子集 |
| R5 | 流式体验回归 | 中 | Main 翻译 SSE→既有 IPC 事件；UI 不动 |
| R6 | 密钥进日志/证据包 | 高 | 沿用 export-secrets 纪律；Python obs 脱敏中间件 |
| R7 | 与 TransitHub 抢人/抢范围 | 中 | SSOT：TH 优先；本文仅文档 |
| R8 | AGPL 边界 | 中 | 同仓旁路降低分发歧义；独立仓发布需法务/许可策略另议 |
| R9 | 无证据「为 Python 而 Python」 | 高 | 每步 Better-wins：可测延迟/可维护性/批跑能力；不达标则停损 R2 |

---

## 7. 非目标（本轮与紧随预研）

**本轮（本 worker）**

- 不创建 `services/ai-core` 代码、不装 Python 依赖  
- 不改 `packages/ui` / 面板交互  
- 不改计费、不生产破坏、**不 push**  
- 不实施 IPC 旁路或业务大改  
- 不抢 TransitHub 模块二（WP-G/V/S）范围  

**明确延后**

- Vue 重做或 Naive 迁移（面板已 Vue）  
- 图像生成链路 Python 化  
- 全量模板 i18n 迁移  
- Go 网关接入 MindSync  
- LexVoyage / 内容站任何工作  

---

## 8. 建议后续里程碑（仅规划，需协调员/用户 gate）

| 步 | 内容 | 验收 | 依赖 |
|----|------|------|------|
| **A0** | 本文评审 + 契约字段清单（从 `evaluation/types.ts` 导出） | 评审通过 | 本文 |
| **A1** | `services/ai-core` 脚手架 + `/health` + pyproject | 健康检查绿 | A0 |
| **A2** | Port `evaluateAssertions` + `exportPromptfooYaml` + 契约测 | 与 TS 金标一致 | A1 |
| **A3** | Port `runEvalCaseSet`（模式 A LLM） | 集成测 + 无 secret 日志 | A2 |
| **A4** | Evaluation run 影子模式（桌面 flag） | 抽样 diff 报告 | A3、UI 仍不动可仅 Main 侧对比工具 |
| **A5** | Prompt optimize/iterate 旁路 | IPC 语义不变 e2e | A4 |
| **A6** | 作业表/可观测（可选 SQL） | 状态机文档 + 指标 | 批跑需求确认后 |

---

## 9. 关键源码与文档索引

| 主题 | 路径 |
|------|------|
| Core 导出 | `packages/core/src/index.ts` |
| Electron 代理入口 | `packages/core/src/electron.ts` |
| 评估服务 | `packages/core/src/services/evaluation/` |
| Prompt 编排 | `packages/core/src/services/prompt/` |
| 优化策略 | `packages/core/src/services/prompt/optimization-strategy.ts` |
| Desktop 装配 | `packages/desktop/config/service-container.js` |
| IPC 清单 | `packages/desktop/config/ipc/channel-manifest.js` |
| UI 内创建 Evaluation | `packages/ui/src/composables/system/useAppInitializer.ts` |
| Structured compare 设计 | `docs/architecture/structured-compare-and-evaluation-rewrite.md` |
| Electron 入口 ADR | `docs/architecture/electron-adapter-entrypoint.md` |
| 组合 Master | `D:\orca\docs\architecture-stack-refactor-master-2026-07-22.md` §3.3 / Phase 2 |
| 侧线 SSOT | `D:\orca\docs\portfolio-side-track-2026-07-22.md` |
| 批准决策 | `D:\orca\docs\architecture-decision-2026-07-22-approved.md` #6 MindSync P1 |

---

## 10. 验收自检（本 worker）

| 项 | 状态 |
|----|------|
| 产出路径 `docs/phase2-ai-core-extract-map.md` | 本文 |
| 模块表含 P0/P1/不抽 | §2 |
| Electron/Vue 边界 | §3 |
| 建议仓库布局 | §4 |
| 接口缝 | §5 |
| 风险 | §6 |
| 非目标（不改面板、不写业务大改） | §7 |
| 只读 + 方案文档，无业务代码改动 | 是 |
| 不 push | 是 |

---

*End of presearch map · MindSync Phase2 AI-Core*
