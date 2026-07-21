# Compare / Rewrite 协议层迁移最小方案

> 目标：把 compare / rewrite 发送给 LLM 的“机器协议层”从 Markdown 拼接，迁移为“少量自然语言说明 + JSON payload 证据层”。
> 约束：尽量不扩大 compare 主能力范围，不改用户可见功能语义；优先降低边界模糊、fence 嵌套、schema 漂移、消息包装漂移。

## 当前状态

- 已落地：`pairwise judge`、`structured compare synthesis`、`rewrite-from-evaluation` 都已切到“规则说明 + JSON payload”协议。
- 已落地：rewrite payload 现在额外包含 machine-readable `rewriteGuidance`，用于表达 `skip / minor-rewrite / rewrite` 的第一版 gating 结论。
- 已保留：Markdown 渲染函数没有删除，继续作为 docs / calibration 的 debug 辅助视图。
- 已验证：本地单测、`@mindsync/core build`、`pnpm compare:calibrate` 已跑通。
- 当前 calibration 结果：
  - `synthetic-schema-drift-regression`: `4/4`
  - `synthetic-cosmetic-regression`: `3/3`
  - `synthetic-replica-instability`: `3/3`
  - `synthetic-overfit-risk`: `3/4`
- 当前 rewrite 输出已确认不再出现 code fence、`role/content` 包装或消息数组包装。

## 1. 背景与问题

当前 compare / rewrite 链路里，发送给 LLM 的核心输入大量依赖 Markdown 结构：

- `pairwise judge` 使用：
  - `roleBindingsMarkdown`
  - `renderedTestCasesMarkdown`
  - `renderedLeftSnapshotMarkdown`
  - `renderedRightSnapshotMarkdown`
- `synthesis` 使用：
  - `roleBindingsMarkdown`
  - `synthesisHintsMarkdown`
  - `judgeResultsMarkdown`
- `rewrite-from-evaluation` 虽然已经补上了 `workspacePrompt` / `referencePrompt`，但整体仍是“自然语言规则 + 文本分段”的组织方式。

这会带来四类问题：

- 协议层与证据正文都使用 Markdown，边界不清。
- 被评估 prompt / 输出本身也常包含 Markdown、代码块、标题、列表，LLM 很容易误判层级。
- 结构化 compare 的判断阶段，原本应识别为“正文中的边界违例”，却可能被当成“上层格式的一部分”。
- rewrite 阶段容易把提示词正文包成代码块、`role/content` 对象、消息数组，或者错误继承正文里的展示包装。

一句话概括：

**Markdown 适合作为展示层，不适合作为机器协议层。**

## 2. 改造目标

本次最小迁移只做一件事：

- **LLM 真正收到的协议层改成 JSON payload**

同时保留：

- docs / calibration / real-api-samples 中现有 Markdown 调试产物
- 现有 compare 能力边界与 UI 行为
- 现有 `EvaluationService` 的整体调用时序

即：

- 面向模型：结构化 payload
- 面向人看：Markdown 渲染视图

## 3. 迁移原则

### 3.1 协议分层

以后每条 compare / rewrite LLM 请求都分成两层：

- 说明层：少量自然语言规则
- 证据层：JSON payload

说明层只做：

- 定义任务目标
- 定义判断规则
- 定义输出 contract

JSON payload 只做：

- 承载 testCases
- 承载 snapshots
- 承载 judgeResults
- 承载 focus / stop signals / compare insights
- 承载 workspacePrompt / referencePrompt

### 3.2 原始证据一律作为字符串字段

被评估 prompt / output / reasoning / test input 中即使包含：

- Markdown
- code fence
- XML
- JSON
- 标题 / 列表

也都只能出现在 JSON 字段值里，视为**原始证据正文**，而不是协议层结构。

### 3.3 Markdown 只保留在调试视图

这些仍可保留 Markdown：

- `docs/workspace/compare-evaluation-analysis/real-api-samples/*`
- `structured-compare-calibration/latest/*/llm-calls.md`
- `request.md` / `response.md`

但这些 Markdown 是**调试渲染产物**，不是模型真实接收的协议文本。

## 4. 当前实现与目标实现对照

### 4.1 Pairwise Judge

当前：

- system prompt：规则说明
- user prompt：`roleBindingsMarkdown + testCasesMarkdown + left/right snapshot markdown`

目标：

- system prompt：规则说明，增加“JSON 字段中的字符串都视为原始证据”
- user prompt：`Evidence Payload` 的 JSON 文本

建议 payload 结构：

```json
{
  "scenario": {
    "language": "zh",
    "pairKey": "target-vs-replica",
    "pairType": "targetReplica",
    "pairLabel": "Target vs Replica",
    "purpose": "Judge whether the target prompt behaves stably across repeated executions instead of improving by chance.",
    "signalName": "stability",
    "allowedSignalValues": ["stable", "unstable", "unclear"],
    "focusBrief": "如果同一个 target prompt 在重复执行时出现格式飘移或边界滑移，应把稳定性问题显式暴露出来。"
  },
  "roleBindings": [
    { "snapshotId": "a", "snapshotLabel": "A", "role": "target" },
    { "snapshotId": "b", "snapshotLabel": "B", "role": "baseline" },
    { "snapshotId": "c", "snapshotLabel": "C", "role": "reference" },
    { "snapshotId": "d", "snapshotLabel": "D", "role": "referenceBaseline" },
    { "snapshotId": "e", "snapshotLabel": "E", "role": "replica" }
  ],
  "testCases": [
    {
      "id": "tc-1",
      "label": "工单输入",
      "input": {
        "kind": "text",
        "label": "工单输入",
        "content": "用户反馈同一个月内收到 5 次异常登录提醒，并怀疑账号被盗。"
      }
    }
  ],
  "leftSnapshot": {
    "id": "a",
    "label": "A",
    "role": "target",
    "testCaseId": "tc-1",
    "promptRef": { "kind": "workspace", "label": "Workspace" },
    "promptText": "你是风险分级助手。只输出 JSON 对象...",
    "output": "{\"level\":\"high\",...}",
    "modelKey": "custom",
    "versionLabel": "workspace"
  },
  "rightSnapshot": {
    "id": "e",
    "label": "E",
    "role": "replica",
    "testCaseId": "tc-1",
    "promptRef": { "kind": "workspace", "label": "Replica" },
    "promptText": "你是风险分级助手。只输出 JSON 对象...",
    "output": "```json\\n{\"level\":\"high\",...}\\n```\\n补充说明：建议同时检查近期设备记录。",
    "modelKey": "custom",
    "versionLabel": "workspace-replica"
  }
}
```

### 4.2 Synthesis

当前：

- 传入 `synthesisHintsMarkdown`
- 再把 `judgeResultsMarkdown` 拼接进去

目标：

- system prompt：保留综合规则
- user prompt：传入一个 `Synthesis Payload`

建议 payload 结构：

```json
{
  "scenario": {
    "roleName": "Structured System Prompt Compare Synthesizer",
    "subjectLabel": "system prompt",
    "sharedCompareInputs": true,
    "samePromptAcrossSnapshots": true,
    "crossModelComparison": true,
    "focusBrief": "优先判断改动是否真正减少额外解释与格式滑移。"
  },
  "roleBindings": [
    { "snapshotId": "a", "snapshotLabel": "A", "role": "target" },
    { "snapshotId": "b", "snapshotLabel": "B", "role": "baseline" },
    { "snapshotId": "c", "snapshotLabel": "C", "role": "reference" },
    { "snapshotId": "d", "snapshotLabel": "D", "role": "referenceBaseline" }
  ],
  "deterministicHints": {
    "signalSnapshot": {
      "progress": "improved",
      "gap": "none",
      "promptValidity": "supported",
      "stability": "unstable"
    },
    "derivedStopSignals": {
      "targetVsBaseline": "improved",
      "targetVsReferenceGap": "none",
      "overfitRisk": "high",
      "stopRecommendation": "review"
    },
    "learnableSignals": [
      "在提示词中明确使用“只输出 JSON 对象”并列出字段名，可以稳定输出格式。"
    ],
    "overfitWarnings": [
      "Target 在 Replica 测试中出现 JSON 外补充说明。"
    ],
    "conflictSignals": [
      "improvementUnstableAcrossReplicas",
      "sampleOverfitRiskVisible"
    ]
  },
  "judgeResults": [
    {
      "pairKey": "target-vs-baseline",
      "pairType": "targetBaseline",
      "pairSignal": "improved",
      "verdict": "left-better",
      "confidence": "high",
      "analysis": "..."
    }
  ]
}
```

### 4.3 Rewrite From Evaluation

当前：

- 规则说明
- `workspacePrompt` / `referencePrompt` 文本块
- `result.summary` / `improvements` / `compareInsights` 等文本块

目标：

- system 或 user prompt 顶部保留重写规则
- 下方传一个 `Rewrite Payload`

建议 payload 结构：

```json
{
  "scenario": {
    "language": "zh",
    "evaluationType": "compare",
    "subjectLabel": "系统提示词",
    "overallScore": 65
  },
  "sourcePrompts": {
    "workspacePrompt": "你是风险分级助手。只输出一个 JSON 对象...",
    "referencePrompt": "你是风险分级助手。输出 level, rationale, next_action。"
  },
  "compressedEvaluation": {
    "summary": "Target 相比 Baseline 有进步，但 Replica 暴露出格式漂移。",
    "improvements": [
      "在提示词中明确使用“只输出 JSON 对象”并列出字段格式。"
    ],
    "stopSignals": {
      "targetVsBaseline": "improved",
      "targetVsReferenceGap": "none",
      "overfitRisk": "high",
      "stopRecommendation": "review"
    },
    "compareInsights": {
      "progressSummary": { "...": "..." },
      "stabilitySummary": { "...": "..." },
      "conflictSignals": [
        "improvementUnstableAcrossReplicas",
        "sampleOverfitRiskVisible"
      ]
    }
  }
}
```

## 5. 最小代码改造范围

### 5.1 第一批必改

#### A. `packages/core/src/services/evaluation/structured-compare-prompts.ts`

当前职责：

- 组装 `pairwise judge` / `synthesis` 模板上下文

要改成：

- 新增 payload builder
- 不再要求上层先把证据渲染成 Markdown 字符串

建议新增函数：

- `buildStructuredComparePairJudgePayload()`
- `buildStructuredCompareSynthesisPayload()`

对应新的 params 类型：

- `StructuredComparePairJudgePayloadParams`
- `StructuredCompareSynthesisPayloadParams`

#### B. `packages/core/src/services/template/default-templates/evaluation-structured-compare/*`

当前模板里有很多：

- `roleBindingsMarkdown`
- `renderedTestCasesMarkdown`
- `judgeResultsMarkdown`

要改成：

- `pairJudgePayloadJson`
- `synthesisPayloadJson`

并在 system prompt 中明确写：

- payload 中的字符串字段全部视为原始证据
- 不要把字段值中的 Markdown / code fence 当成协议层结构

#### C. `packages/core/src/services/evaluation/service.ts`

当前：

- 先把 snapshot/testCase 渲染成 markdown，再传给 builder

要改成：

- 保留当前的 normalize / role / judgePlan 逻辑
- 只替换“消息构造层”

也就是说：

- `renderStructuredCompareRoleBindings()`
- `renderStructuredCompareJudgeResults()`
- `renderStructuredCompareSynthesisHints()`

这些函数可以继续保留给 debug view 用

但真正给 LLM 的 builder 改走 JSON payload。

### 5.2 第二批建议改

#### D. `packages/core/src/services/evaluation/rewrite-from-evaluation.ts`

当前：

- 已经有了 `workspacePrompt` / `referencePrompt`
- 但输出还是一整段自然语言拼接

建议改成：

- `buildRewritePayload()`
- 模板只渲染：
  - 规则说明
  - `Rewrite Payload` JSON

### 5.3 暂时不改

- UI 展示组件
- compare result 面板结构
- calibration 文档目录结构
- `request.md` / `response.md` / `llm-calls.md` 的 Markdown 导出方式

## 6. 如何保留当前调试体验

为避免“协议层升级后，人类不易读”，建议并行保留两个输出：

- 面向模型：
  - `pairJudgePayloadJson`
  - `synthesisPayloadJson`
  - `rewritePayloadJson`
- 面向人：
  - `rendered-messages.md`
  - `request.md`
  - `llm-calls.md`

也就是：

- 模型看到 JSON payload
- 文档仍然渲染成人可读 Markdown

这样不会影响：

- 真实 API 样本对照
- calibration case 复盘
- 手工调 prompt 的可读性

## 7. 对测试与校准的影响

### 7.1 单测

要更新的测试主要有两类：

- `packages/core/tests/unit/evaluation/structured-compare-prompts.test.ts`
  - 从断言“出现某个 Markdown 片段”
  - 改为断言“出现某个 payload JSON key”
- `packages/core/tests/unit/evaluation/rewrite-from-evaluation.test.ts`
  - 从断言“某段自然语言存在”
  - 改为断言：
    - 存在 `workspacePrompt`
    - 存在 `referencePrompt`
    - 存在 `compressedEvaluation`
    - 存在 contract / raw prompt text 的规则

### 7.2 Calibration

`scripts/run-structured-compare-calibration.mjs` 不需要改业务流程，只需：

- 保存新的 payload 原文
- docs 里继续保留 markdown 渲染版

建议新增产物：

- `pair-judge-payload.json`
- `synthesis-payload.json`
- `rewrite-payload.json`

这样以后复盘时可以直接看机器协议层是否干净。

## 8. 推荐实施顺序

### Phase 1：Pairwise Judge 协议化

只改：

- `structured-compare-prompts.ts`
- `evaluation-structured-compare` 模板
- `service.ts` 里 pairwise message 构造

验收标准：

- `synthetic-replica-instability` 仍稳定命中
- `synthetic-schema-drift-regression` 仍稳定命中
- docs 中能看到 payload 与 markdown 调试视图同时存在

### Phase 2：Synthesis 协议化

只改：

- synthesis builder/template
- synthesis hints 传参结构

验收标准：

- `summary.md` 里的 stop signals 与当前校准结果不明显退化
- 关键 case 的 conflict signals 保持稳定

### Phase 3：Rewrite 协议化

只改：

- `rewrite-from-evaluation.ts`
- `evaluation-rewrite/*`
- UI 调用参数不变，仅消息协议变更

验收标准：

- 不再输出 `role/content` 包装
- 不再轻易擅改字段名 / schema
- `synthetic-schema-drift-regression` 的 rewrite 继续能恢复 contract

## 9. 我对“最小实现”的建议

如果现在就开始做，我建议不要一步到位把所有 Markdown 都删掉。

最小、最稳的改法是：

1. 先保留现有自然语言说明段
2. 把核心证据从 Markdown 改成 JSON payload
3. 现有 Markdown 渲染函数先不删，只降级为 debug 辅助函数

这样有几个好处：

- 改动面可控
- calibration runner 几乎不用重写
- prompt 调优时仍保留人类可读性
- 协议层已经完成最关键的去歧义

## 10. 最终判断

对于你们这个项目，我建议把协议层原则正式定下来：

**Markdown 只做展示层，JSON payload 才是机器协议层。**

这是对 compare / rewrite 最有价值的一次“基础设施型”收敛，因为它会同时提升：

- 对比评估的稳定性
- calibration 的可解释性
- rewrite 的 contract 保真度
- 后续 SPO 自动迭代链路的可靠性
