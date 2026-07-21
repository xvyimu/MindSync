# 整理记录

## 当前文档对齐结论（2026-03-17，第二轮收口）

### 当前应优先相信哪些文档

- 请求结构与模板最终形态：
  - `real-api-samples/`
  - `real-api-samples/review-summary.md`
  - `manual-acceptance.md`
- 本文件下方按日期展开的长记录，仍保留“问题如何一步步收敛”的价值，但其中部分请求字段、样例命名、旧 compare 结构描述已经变成历史阶段信息。

### 当前已明确的实现事实

- 左侧分析：
  - 只围绕当前工作区目标本身展开。
  - `basic` 默认不再注入 `referencePrompt`。
  - `pro-variable` 只保留变量结构，不带变量值。
  - `pro-multi` 只保留最小会话位置上下文，不再发送完整 transcript。
- 右侧单结果评估：
  - 只使用“测试输入 + 当前快照执行提示词 + 当前输出”作为证据。
  - 不再额外注入 `## 当前工作区提示词`。
  - 当前保留的是方向性 `improvements`，不再要求 `patchPlan`。
- 右侧对比评估：
  - 只使用“公共测试输入 + 多个执行快照”作为证据。
  - 不再默认注入 `## 当前工作区提示词`。
  - 普通 compare 与跨模型 compare 都已经收紧为“必须先解释已观察到的关键差异”，不能先发散到泛建议。
- `pro-variable` / `pro-multi` 的右侧评估链路都已按“公共输入一次 + 快照差异单独展开”的最小化结构收口。

### 阅读旧记录时要特别注意

- 如果下文出现这些说法，应优先理解为历史阶段记录，而不是当前事实：
  - `workspacePrompt + variants[]`
  - `resolvedPrompt` 仍直接进入右侧评估请求
  - compare 里继续保留 `## 当前工作区提示词`
  - 每个 compare variant 继续带“输入快照（渲染内容）”
  - `pro/multi` 右侧评估继续带 `targetMessage + conversationMessages` 原始 JSON

### 当前建议

- 后续如果再需要核对“代码现在到底发了什么给模型”，不要从本文件中段的旧日志反推，直接看：
  - `docs/workspace/compare-evaluation-analysis/real-api-samples/*/rendered-messages.json`
  - `packages/core/src/services/template/default-templates/evaluation/builders.ts`
  - `packages/core/tests/unit/evaluation/result-compare-evidence-behavior.test.ts`

## 补充状态（2026-03-17，左侧真实样例已清理为最终版本）

### 本次人工审查结论

- 左侧 `prompt-only` 的正式标准参考样例，应统一收敛到“最小输入”版本。
- 旧的 `current / 冗余对照` 样例已经从 `real-api-samples/` 中删除，不再继续保留。

### 原因

- 历史样例中曾存在：
  - `当前工作区提示词`
  - `参考提示词`
  - `designContext.rawPrompt`
  在同一次左侧分析请求里重复出现的问题。
- 这会导致同一份长提示词在一次左侧分析请求中重复出现。
- 与当前已经确认的输入最小化原则不一致：
  - 当前工作区提示词尽量只出现一次
  - 左侧分析不应默认携带旧参考提示词
  - 变量模式只保留变量结构，不保留测试值，也不重复保留原 prompt

### 当前收口后的标准参考口径

- `basic-user`
  - 标准参考：`basic-user-prompt-only`
- `basic-system`
  - 标准参考：`basic-system-prompt-only-minimal`
- `pro-variable`
  - 标准参考：`pro-variable-prompt-only-minimal`
- `pro-multi`
  - 标准参考：`pro-multi-prompt-only-system-selected`
  - 标准参考：`pro-multi-prompt-only-user-selected`

### 文档更新

- `real-api-samples/`
  - 已只保留最终标准样例目录
  - 旧的 `basic-system-prompt-only`
  - 旧的 `pro-variable-prompt-only`
  - 旧的 `pro-variable-prompt-only-current`
  - 旧的 `pro-multi-prompt-only`
  - 旧的 `pro-multi-prompt-only-current`
  - 旧的 `pro-multi-prompt-only-minimal`
    均已删除
- `README.md`
  - 已改为“真实样例目录里只保留最终版本”的阅读指引

## 补充状态（2026-03-17，真实样例覆盖矩阵补齐 + Focus 有效性校验）

### 本次新增的真实样例

- 左侧：
  - `basic-user-prompt-iterate-focus`
- 右侧单结果评估：
  - `basic-user-result-focus`
- 右侧对比评估：
  - `basic-system-compare-focus`
  - `pro-variable-compare-focus`

### 当前 `real-api-samples` 的真实覆盖状态

- 左侧分析
  - `prompt-only`
    - `basic-user / basic-system / pro-variable / pro-multi` 均已有真实样例
  - `prompt-only + focus`
    - `basic-user / basic-system / pro-variable / pro-multi` 均已有真实样例
  - `prompt-iterate + focus`
    - 当前已有 `basic-user` 真实样例
- 右侧单结果评估
  - `result`
    - `basic-user / basic-system / pro-variable / pro-multi` 均已有真实样例
  - `result + focus`
    - 当前已有 `basic-user / pro-variable / pro-multi` 真实样例
- 右侧对比评估
  - `compare`
    - `basic-user / basic-system / pro-variable / pro-multi` 均已有真实样例
  - `compare + focus`
    - 当前已有 `basic-user / basic-system / pro-variable / pro-multi` 真实样例

### 本次新增的“Focus 是否真的生效”校验

- `scripts/generate-real-api-samples.mjs`
  - 现在支持为指定 case 配置 `focusKeywords`
  - 生成真实样例后，会检查响应中的：
    - `summary`
    - `improvements`
    - `patchPlan`（如果有）
  - 是否至少有一处命中 Focus 关键词
- 如果 Focus 没有真正反映到结果里，脚本会直接 fail

### 当前结论

- `real-api-samples/` 现在不只是覆盖了“请求结构”。
- 对于重点的 focus case，还额外覆盖了“结果是否真的围绕 focus 展开”这一层语义验证。

## 补充状态（2026-03-17，右侧 `result / compare` 输入继续瘦身）

### 本次收口的实现点

- `pro/variable` 右侧单结果评估
  - 保留：
    - 公共测试输入中的变量值
    - 快照中的执行提示词与输出
  - 移除：
    - `executionInput` 中整段渲染后输入
    - 变量值在快照里的二次重复
- `pro/multi` 右侧单结果评估
  - 公共测试输入中的会话上下文，当前已改为：
    - 目标消息位置用 `【当前执行提示词见下方快照】` 标记
    - 实际目标消息内容只保留在下方 `promptText`
- `pro/multi` 右侧对比评估
  - 公共会话上下文现在只出现一次
  - 每个快照不再重复携带 `executionInput`
  - 对比时的差异集中体现在：
    - `promptText`
    - `output`
    - `reasoning`
    - `modelKey / versionLabel`

### 这次调整解决的重复问题

- 同一份变量值不再同时出现在：
  - 测试输入
  - 渲染后输入摘要
  - 渲染后整段 prompt
- 同一条被测上下文消息不再同时出现在：
  - 公共会话上下文
  - 每个 compare variant 的 `executionInput`
  - 每个快照的 `promptText`

### 本次验证

- `pnpm -F @mindsync/core test -- tests/unit/evaluation/result-compare-evidence-behavior.test.ts`
- `pnpm -F @mindsync/core test -- tests/unit/evaluation/rendered-samples.test.ts`
- `pnpm -F @mindsync/ui test -- tests/integration/context-user-tester.spec.ts tests/integration/conversation-tester.spec.ts`
- `pnpm -F @mindsync/ui exec tsc --noEmit -p tsconfig.json`
- `pnpm -F @mindsync/core exec tsc --noEmit -p tsconfig.json`

## 补充状态（2026-03-17，`pro/multi prompt-only` 示例进一步收口）

### 本次文档与样例收口

- `pro/multi` 左侧分析样例不再使用“情感陪伴”之类复杂示例
- 当前统一改为最简单的双消息场景：
  - `system: 你是一个诗人`
  - `user: 请你写一首关于{{主题}}的诗。`
- 并且不再写“相关会话摘要”，而是明确写成：
  - `会话上下文`
  - 当前工作区消息位置用 `【当前工作区要优化的提示词】` 标记

### 新增的最终参考样例

- `real-api-samples/pro-multi-prompt-only-system-selected`
  - 选中 `system` 消息时：
    - `system: 【当前工作区要优化的提示词】`
    - `user: 请你写一首关于{{主题}}的诗。`
- `real-api-samples/pro-multi-prompt-only-user-selected`
  - 选中 `user` 消息时：
    - `system: 你是一个诗人`
    - `user: 【当前工作区要优化的提示词】`

### 当前结论

- `pro/multi prompt-only` 的最小输入规则已经进一步明确：
  - 不是“抽象摘要越短越好”
  - 而是“只保留对当前位置判断真正必要的最小会话上下文”
- 这比“相关会话摘要”更不容易失真，也更适合长提示词场景

## 补充状态（2026-03-17，`pro/variable prompt-only` 最小化已落地）

### 已完成的实现收敛

- `packages/ui/src/composables/prompt/useEvaluationHandler.ts`
  - `pro/variable` 左侧分析不再默认透传 `referencePrompt`
  - `pro/variable` 左侧分析的 `designContext` 不再使用整段 JSON stringify
  - 当前改为最小变量结构说明：
    - `summary = 这里只说明模板变量结构，不包含任何测试值。`
    - `content = 变量: 风格, 主题`
- `packages/core/tests/unit/evaluation/rendered-samples.test.ts`
  - `05-pro-variable-prompt-only-base` 已改为最小输入样例
- `packages/ui/tests/unit/composables/useEvaluationHandler.spec.ts`
  - 已补 `pro/variable` 最小结构上下文断言
  - 已补 `pro/multi` 最小摘要上下文断言，避免退回完整 transcript

### 真实请求验证

- 已新增真实请求样例：
  - `real-api-samples/pro-variable-prompt-only`
  - `real-api-samples/pro-variable-prompt-only-current`
  - `real-api-samples/pro-variable-prompt-only-minimal`
- 真实请求结论：
  - 旧风格输入会重复出现 `referencePrompt + rawPrompt`
  - 最小化后仍然能稳定产出非空 `patchPlan`
  - 最小化版本的真实返回更干净，也更符合“长内容只出现一次”的约束

### 本次回归验证

- `pnpm -F @mindsync/ui test -- tests/unit/composables/useEvaluationHandler.spec.ts`
- `pnpm -F @mindsync/core test -- tests/unit/evaluation/rendered-samples.test.ts`
- `pnpm -F @mindsync/ui exec tsc --noEmit -p tsconfig.json`
- `pnpm -F @mindsync/core exec tsc --noEmit -p tsconfig.json`

## 补充状态（2026-03-17，`pro/multi prompt-only` 真实对照已完成）

### 当前实现的主要冗余

当前 `pro/multi` 左侧分析请求里，工作区提示词会在同一次请求中重复出现多次：

- `workspacePrompt`
- `referencePrompt`
- `designContext.targetMessage.content`
- `designContext.conversationMessages[].content` 中的目标消息内容

这意味着同一份长 system 消息可能在一次分析请求里出现 3-4 次。

### 真实请求对照结果

已新增真实请求样例：

- `real-api-samples/pro-multi-prompt-only-current`
- `real-api-samples/pro-multi-prompt-only-minimal`

对照结论：

- `current`
  - 带 `referencePrompt`
  - 带完整 `targetMessage + conversationMessages` JSON
  - 真实返回：`overall = 70`
  - 请求耗时：约 `21492ms`
- `minimal`
  - 不带 `referencePrompt`
  - 只带“目标消息角色 + 位置引用 + 最小相关消息”的短上下文
  - 真实返回：`overall = 70`
  - 请求耗时：约 `11635ms`

目前看，最小化版本没有明显损失分析能力，但请求更短、更聚焦，也更符合“同一长内容只出现一次”的约束。

### 当前建议

下一步优先建议把 `pro/multi prompt-only` 收敛到：

- `workspacePrompt`
- `focus`
- 极短 `designContext`
  - 目标消息角色
  - 当前工作区提示词在会话中的明确位置引用
  - 与目标消息直接相关的最少量上下文消息

默认不再发送：

- `referencePrompt`
- 完整 `targetMessage.content`
- 完整 `conversationMessages` transcript
- 任何与左侧设计分析无关的执行态快照

## 补充状态（2026-03-17，`pro/multi prompt-only` 最小化已落地）

### 已完成的实现收敛

- `packages/ui/src/composables/prompt/useEvaluationHandler.ts`
  - `pro/multi` 左侧分析不再默认透传 `referencePrompt`
  - `pro/multi` 左侧分析的 `designContext` 不再使用完整 `targetMessage + conversationMessages` JSON
  - 当前改为最小会话位置上下文：
    - `summary = 当前分析目标是某一条上下文消息，不是整个会话结果。`
    - `content` 仅包含：
      - 目标消息角色
      - 当前工作区提示词所在位置的显式标记
      - 与目标消息直接相关的最少量会话消息
- `packages/ui/tests/unit/composables/useEvaluationHandler.spec.ts`
  - 已补 `pro/multi` 最小摘要上下文断言
- `packages/core/tests/unit/evaluation/rendered-samples.test.ts`
  - `06-pro-multi-prompt-only-base` 已改为最小输入样例

### 真实请求验证

- 已新增最终态真实样例：
  - `real-api-samples/pro-multi-prompt-only`
- 当前最终态真实返回：
  - `overall = 60`
  - `patchPlan` 非空
- 当前最终态请求已符合：
  - 不重复发送 `referencePrompt`
  - 不重复发送目标消息全文
  - 不发送完整 transcript

### 本次回归验证

- `pnpm -F @mindsync/ui test -- tests/unit/composables/useEvaluationHandler.spec.ts`
- `pnpm -F @mindsync/core test -- tests/unit/evaluation/rendered-samples.test.ts`
- `pnpm -F @mindsync/ui exec tsc --noEmit -p tsconfig.json`
- `pnpm -F @mindsync/core exec tsc --noEmit -p tsconfig.json`
- `pnpm -F @mindsync/core build`

## 补充状态（2026-03-17，输入最小化规范补充）

### 已新增“输入最小化与去重规范”

- 新增：
  - `input-minimization-spec.md`

本次补充的核心结论是：

- 同一份长内容，在一次 LLM 请求里应尽量只出现一次
- 左侧分析应进一步收口为“只看当前工作区”
- `referencePrompt` 不应作为默认输入继续保留
- `designContext` 只允许承载真正有设计语义的短摘要，不应继续承载 UI 来源说明
- 右侧 `result / compare` 应继续坚持“只看执行证据，不额外注入工作区全文”

### 对当前各任务的直接约束

- `basic/user prompt-only`
  - 默认只发 `workspacePrompt`
  - 有 `focus` 时再加 `focus`
  - 默认不发 `referencePrompt`
  - 默认不发 `designContext`
- `pro/variable prompt-only`
  - 默认不发变量值
  - 只允许发送变量结构或变量语义摘要
- `result`
  - 只发测试输入、执行提示词、输出
- `compare`
  - 公共输入只出现一次
  - 每个快照只保留独有 prompt / output / reasoning

## 补充状态（2026-03-16，workspace 语义收口）

### 测试区版本来源已统一为 `workspace / v0 / vN`

- `basic-user`
- `basic-system`
- `pro-variable`
- `pro-multi`
- `image-text2image`
- `image-image2image`

以上模式的右侧测试列当前都已把旧 `'latest'` 语义替换为 `'workspace'`：

- `workspace` = 下方工作区当前内容
- `v0` = 原始输入
- `v1..vn` = 已持久化历史版本

并且：

- 旧 session 持久化值 `'latest'` 会在读取时迁移为 `'workspace'`
- 如果测试列选择 `workspace`，但当前工作区为空，则直接报错
- 不再 silently fallback 到 `logic.prompt` / 原始输入

### basic 左侧“分析”后的链路重置问题已补回归

- `basic-user` / `basic-system` 左上输入区点击 `分析` 时：
  - 会重建左侧工作区
  - 会清理旧优化链显示
  - 会生成新的工作区 `V0`
- 已补：
  - UI 集成回归
  - store 持久化回归
  - Playwright e2e 回归

### 当前主线剩余问题重新收口

- 文本 workspace 主语义：可视为已基本完成
- image 右侧评估链路：仍未完成
- compare 去重建模（`inputs[] + variants[]`）：当前已明确降级为可选后续优化，不再作为本轮 blocker

## 补充状态（2026-03-15，MCP 复核 + 修复回写）

### `context-user` 的 `分析 -> 继续优化` 真实路径已修复

- 根因已确认：
  - 左侧 `分析` 会创建虚拟 `V0`
  - 同时清空 `currentChainId`
  - 旧的继续优化路径仍尝试 `addIteration(emptyChainId)`，最终在 history manager 里抛出 `RecordNotFoundError`
- 当前修复方式：
  - 当 `currentChainId` 为空时，不再错误地追加到旧链
  - 改为走 `createNewChain()` 创建新迭代链
- 2026-03-15 MCP 实测结果：
  - 在 `/#/pro/variable` 中执行 `分析 -> 关闭对话框 -> 继续优化 -> 确认优化`
  - 工作区成功从 `V0` 进入 `V1`
  - 控制台为 `0 errors / 0 warnings`
  - 未再出现 `RecordNotFoundError`

### 相关 i18n 问题也已一起修正

- 原来错误引用了不存在的 key：`toast.warning.historyFailed`
- 当前已改为：`toast.warning.saveHistoryFailed`
- 2026-03-15 MCP 实测中未再出现历史保存失败相关的未翻译 key 泄漏

### `pro-variable` 在修复后的评估链路已做同会话复核

- 左侧分析：
  - 仍然只带变量结构，不带变量值
- 右侧单结果评估：
  - 已实测带上当前工作区 `V1` 提示词
  - 已实测带上 `variables[].value`
  - 已实测带上 `resolvedPrompt`
  - 已实测带上当前列输出
- 右侧对比评估：
  - 已实测带上 `## 当前工作区提示词`
  - 已实测带上 `### 方案 A / B`
  - 已实测带上每个 variant 自己的 `#### 输入快照（渲染内容）`
  - 已实测带上每个 variant 自己的输出

### 文档补充

- 新增并持续回写：
  - `manual-acceptance.md`
- 当前该文档已经包含：
  - 4 个文本 workspace 的手工验收步骤
  - `pro-variable` 的 post-fix 复核步骤
  - 浏览器真实请求应如何检查

## 最新状态（2026-03-14，已按当前代码复核）

## 1. 已确认落地到代码的部分

### 评估类型与 core 协议

- `EvaluationType` 已收敛为：
  - `result`
  - `compare`
  - `prompt-only`
  - `prompt-iterate`
- 单结果评估模板已经改成 `evaluation-*-result`
- compare request 已改成：
  - `workspacePrompt?`
  - `variants[]`
- compare template 已切到“多快照证据”语义，不再默认把 A/B 解释成 original/optimized

### 文本 workspace 的 UI / 业务行为

- 4 个文本 workspace 的右侧单结果评估都已经是 **variant 化** 的
- 当前 active variants 中，只要该列有输出，就能触发 `result`
- compare 已经从“只在 2 列 A/B 出现”放宽为：
  - 当前 active variants 中
  - 至少 2 个有结果
  - 且不是 stale
  - 就可以触发 `compare`

### 分析输入边界

- `context-user` 左侧分析已经改为只走 `analysisContext`
- 该上下文只带变量结构，不带变量实例值
- basic 两个 workspace 左侧分析也不再吃右侧测试文本

### 状态与持久化

- `PersistedEvaluationResults` 已切为：
  - `result: Record<string, EvaluationResponse | null>`
  - `compare`
  - `prompt-only`
  - `prompt-iterate`
- 文本 workspace 的评估结果已按 `variantId` 分桶持久化

## 2. 本轮新增完成的修正

### `context-user` / `context-system` 的右侧单结果评估上下文已按 variant 独立

- `useEvaluationHandler` 现在允许 `resultTargets[variantId]` 自带 `proContext`
- `context-user` 的单结果评估会按当前列单独构造：
  - `rawPrompt`
  - `resolvedPrompt`
  - 当前列变量值
- `context-system` 的单结果评估会按当前列单独构造：
  - `targetMessage`
  - `conversationMessages`

### `context-user` compare payload 已带 per-variant input snapshot

- 当前会带每个 variant 的：
  - `prompt`
  - `output`
  - `reasoning`
  - `modelKey`
  - `versionLabel`
  - `input`
    - `label = Rendered Content`
    - `content = 当前列渲染后输入`
    - `summary = 当前列变量值摘要`

### compare 结构仍是 `workspacePrompt + variants[]`

- 当前 compare 已经足够表达多测试快照
- 但还没有继续演进到更彻底的：
  - `inputs[]`
  - `variants[]`
  - 输入引用关系
- 这条目前已降级为后续可选优化，不再作为主链路 blocker

### `context-system` compare payload 目前已经相对完整

- 每个 variant 已显式带 `Conversation Snapshot`
- 如果有 tools，也会一起拼入 input content

### image 模式右侧评估链路仍未完成

- 当前 image 只有左侧 `prompt-only` 分析模板
- 没有 image 的 `result` / `compare` 模板
- workspace 右侧也没有完成对应评估接线

### 还有一些内部旧 compare 残留

- 共享测试面板内部 tool-call 分桶仍使用：
  - `COMPARE_BASELINE_VARIANT_ID`
  - `COMPARE_CANDIDATE_VARIANT_ID`
- 旧 tester helper 文件仍在仓库里，但当前文本 workspace 主链路已不再依赖它们

## 3. 本次文档更新结果

### 已更新

- `current-analysis-feature-map.md`
  - 改成只讲当前实现事实
  - 移除了正文里大量“旧实现现状”的混淆
- `findings.md`
  - 改成“当前已落地 / 当前偏差 / 下一步建议”的结构
  - 不再把旧 A/B 问题当成当前事实
- `README.md`
  - 目录说明改成“分析 / 评估 / 对比评估”口径
  - 避免继续把 compare evaluation 误写成“对比分析”
- `manual-acceptance.md`
  - 补齐了手工点击步骤、抓包关注点、以及 `pro-variable` 修复项的 post-fix 复核结论

### 保持为设计框架 / 目标文档

- `task_plan.md`
  - 仍然是本轮目标定义
  - 仅补充了状态说明，标明 `pro` 两个 workspace 的 per-variant 右侧上下文精度这轮已经补齐
- `overall-reframing.md`
  - 仍然保留为设计框架文档
  - 顶部状态说明已同步到当前代码事实
  - 需要结合本文件和 `current-analysis-feature-map.md` 一起读

## 4. 当前最准确的状态判断

如果只用一句话概括当前进度：

- 文本 workspace 的语义重构已经基本完成，4 个文本 workspace 的左侧分析与右侧 `result / compare` 都已有真实回归覆盖；测试区版本来源也已统一到 `workspace / v0 / vN`，当前主线剩余问题主要是 image 模式右侧评估链路还没做完。

## 5. 关于“是不是问题复杂化了”的结论

当前更准确的结论不是“任务本身复杂化了”，而是：

- 主任务已经基本收口
- 剩下暴露出来的是第二层实现精度问题

建议这样理解：

- 文本 workspace 的主语义重构：已经基本完成
- compare 去重建模：后续收紧项
- image 右侧评估链路：后续扩展项

这样做的目的，是避免把当前所有残留问题继续抬升为本轮主任务的 blocker。

## 6. 本轮补充的回归验证（2026-03-14）

### 已通过

- `pnpm -F @mindsync/ui typecheck`
- `pnpm -F @mindsync/core test -- tests/unit/evaluation/service.test.ts`
- `pnpm -F @mindsync/ui test -- tests/unit/composables/compareEvaluation.spec.ts tests/unit/composables/useEvaluationHandler.spec.ts tests/unit/components/EvaluationScoreBadge.spec.ts tests/unit/components/EvaluationHoverCard.spec.ts tests/unit/composables/useAppPromptGardenImport.spec.ts`
- `pnpm -F @mindsync/ui test -- tests/unit/stores/session/basic-session-persistence.spec.ts tests/unit/stores/session/pro-session-persistence.spec.ts`
- `pnpm -F @mindsync/ui test -- tests/integration/basic-workspace-logic.spec.ts tests/integration/context-user-tester.spec.ts tests/integration/conversation-tester.spec.ts`
- `pnpm exec playwright test tests/e2e/analysis/basic-user.spec.ts --grep "分析提示词并显示评估结果"`
- `pnpm exec playwright test tests/e2e/analysis/basic-system.spec.ts --grep "分析提示词并显示评估结果"`
- `pnpm exec playwright test tests/e2e/analysis/pro-variable.spec.ts --grep "分析带变量的提示词并显示评估结果"`
- `E2E_VCR_MODE=replay pnpm exec playwright test tests/e2e/analysis/pro-multi.spec.ts`
- `pnpm exec playwright test tests/e2e/test/basic-system-compare-test.spec.ts --grep "测试后可触发单结果评估与对比评估"`
- `pnpm exec playwright test tests/e2e/test/basic-user-test.spec.ts`
- `pnpm exec playwright test tests/e2e/test/basic-user-test.spec.ts --grep "三列测试后可触发多变体对比评估"`
- `pnpm exec playwright test tests/e2e/test/pro-variable-test.spec.ts`
- `E2E_VCR_MODE=replay pnpm exec playwright test tests/e2e/test/pro-multi-test.spec.ts`
- `E2E_VCR_MODE=replay pnpm exec playwright test tests/e2e/analysis/basic-system.spec.ts tests/e2e/analysis/basic-user.spec.ts tests/e2e/analysis/pro-variable.spec.ts tests/e2e/analysis/pro-multi.spec.ts tests/e2e/test/basic-system-compare-test.spec.ts tests/e2e/test/basic-user-test.spec.ts tests/e2e/test/pro-variable-test.spec.ts tests/e2e/test/pro-multi-test.spec.ts`

### 本轮新增 / 修正的测试

- 新增 `packages/ui/tests/unit/composables/compareEvaluation.spec.ts`
  - 锁定 compare payload 的规范化、过滤与输入快照清洗逻辑
- 新增 `packages/ui/tests/unit/composables/useEvaluationHandler.spec.ts`
  - 锁定 `result / compare / prompt-only` 路由行为
  - 锁定 `PersistedEvaluationResults` 的 variant 分桶恢复与回写
- 修正旧集成测试断言
  - `context-user-tester.spec.ts`
  - `conversation-tester.spec.ts`
  - 两者都已切到新 `variantStates` 结构，不再依赖旧 `testResults.originalResult / optimizedResult`
- 新增 `basic-user` 右侧 3 列 compare e2e
  - 覆盖 `A/B/C` 三列 run-all 后触发 `compare` 评估
  - 配套新增真实录制 fixture：
    - `tests/e2e/fixtures/vcr/test-basic-user-test-spec-ts/三列测试后可触发多变体对比评估.json`
- 新增 `pro-variable` 右侧评估 e2e
  - 覆盖填写变量后：
    - 两列 run-all
    - 单结果 `result` 评估
    - 顶部 `compare` 评估
  - 配套新增真实录制 fixture：
    - `tests/e2e/fixtures/vcr/test-pro-variable-test-spec-ts/填写变量后可触发单结果评估与对比评估.json`
- 新增 `pro-multi` 右侧评估 e2e
  - 覆盖多消息 workspace 中：
    - 左侧选中消息优化
    - 右侧 A/B 顺序测试
    - 单结果 `result` 评估
    - 顶部 `compare` 评估
  - 配套新增真实录制 fixture：
    - `tests/e2e/fixtures/vcr/test-pro-multi-test-spec-ts/多消息工作区测试后可触发单结果评估与对比评估.json`
- 新增 `pro-multi` 左侧分析 e2e
  - 覆盖多消息 workspace 中：
    - 左侧选中消息优化
    - 等待优化流式完成
    - 左侧 `prompt-only` 分析
    - 分数徽章显示
  - 配套新增真实录制 fixture：
    - `tests/e2e/fixtures/vcr/analysis-pro-multi-spec-ts/分析对话优化结果并显示评估分数.json`
- 新增 `basic-system` 右侧评估 e2e
  - 覆盖填写测试输入后：
    - 两列 run-all
    - 单结果 `result` 评估
    - 顶部 `compare` 评估
  - 配套新增真实录制 fixture：
    - `tests/e2e/fixtures/vcr/test-basic-system-compare-test-spec-ts/测试后可触发单结果评估与对比评估.json`

### 当前尚未补齐的 e2e 边界

- image 模式本轮明确先不补右侧评估
  - 原因不是语义未定，而是输出是图片，需要视觉分析能力，当前文字型 VCR 回归价值有限

### 本轮 e2e 修正结果

- 原先卡住的 2 条分析 e2e 已确认不是产品功能回归，而是 VCR fixture 与当前 analysis request body / requestHash 漂移
- 已将以下 fixture 刷新为当前 `interactions[]` 格式，并对齐到现有 core 模板渲染出的 request body
  - `tests/e2e/fixtures/vcr/analysis-basic-system-spec-ts/分析提示词并显示评估结果.json`
  - `tests/e2e/fixtures/vcr/analysis-basic-user-spec-ts/分析提示词并显示评估结果.json`
  - `tests/e2e/fixtures/vcr/analysis-pro-variable-spec-ts/分析带变量的提示词并显示评估结果.json`
  - `tests/e2e/fixtures/vcr/analysis-pro-multi-spec-ts/分析对话优化结果并显示评估分数.json`
- 修正后，已有 analysis e2e 已恢复为绿色
- 另外补了一处测试基建问题：
  - `expectOptimizedResultNotEmpty()` 现在会继续等待优化按钮重新可用
  - 避免在流式优化尚未结束时过早点击左侧分析，导致 `pro-multi` 按钮仍处于重建阶段
- `basic-system` 现已同时具备：
  - 左侧 `prompt-only` 分析的真实 fixture
  - 右侧测试输出回归 fixture
  - 右侧单结果 `result` 评估真实 fixture
  - 右侧 `compare` 评估真实 fixture
- `basic-user` 现已同时具备：
  - 左侧 `prompt-only` 分析的真实 fixture
  - 右侧单结果 `result` 评估的真实 fixture
  - 右侧 2 列 / 3 列 `compare` 评估的真实 fixture
- `pro-variable` 现已同时具备：
  - 左侧 `prompt-only` 分析的真实 fixture
  - 右侧填写变量后的单结果 `result` 评估真实 fixture
  - 右侧填写变量后的 `compare` 评估真实 fixture
- `pro-multi` 现已具备：
  - 左侧 `prompt-only` 分析真实 fixture
  - 右侧单结果 `result` 评估真实 fixture
  - 右侧 `compare` 评估真实 fixture
  - 对应多消息输入场景的真实录制回放

## 7. 本轮提交拆分结果（2026-03-14）

当前分支 `codex/compare-evaluation-analysis-refactor` 上，与这轮收口直接相关的提交已经拆成：

- `34960c1` `refactor(core): reshape evaluation protocol around results`
- `af06ff5` `refactor(ui): variantize analysis and evaluation flows`
- `99779c5` `docs(workspace): capture analysis and evaluation refactor status`
- `cd835ac` `test(e2e): refresh analysis vcr fixtures`
- `3034d46` `chore(git): ignore local codex folders`

这样拆分后：

- core 协议与模板语义变更
- UI variant 化与状态重构
- 文档对齐
- e2e fixture 收口
- 本地开发环境忽略项

已经是相对清晰的边界。

## 8. 更适合的下一步

- 先按逻辑边界拆分提交：
  - 当前这一步已经完成，可直接进入 review / PR 整理
- 如果继续补质量保障，可以补更多文本边界用例，例如：
  - 左侧分析弹窗 / badge 的更多异常态
  - compare 多列切换版本后的 stale / re-run 组合
- 如果继续补架构收口，优先再决定 compare 是否还要演进到 `inputs[] + variants[]`
