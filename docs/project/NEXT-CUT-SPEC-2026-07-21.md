# 下一刀实现规格：EvalCaseSet + 本地证据导出（最小）

> **主目标对齐**：本地工作台闭环「评估可复现」。  
> **约束**：不引入云、不 vendor Promptfoo、不改 ui 包边界。  
> **刀号**：Cut-1（默认下一刀）。Cut+1 / Cut+2 仅预告。

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-21 |
| 基线代码 | `develop` @ `be0a5de+` |
| 预计工作量 | 1.5–3 人日（最小垂直切片） |
| 主要包 | `packages/core` · `packages/ui`（只编排） |

---

## 1. 问题

当前评估偏「单次面板体验」，缺少：

- 可保存的**用例集**；  
- 可重复跑的**批量入口**；  
- 可带走的**证据 JSON**。  

用户无法证明「这次优化比上次好」，与调研对 Promptfoo 的学习点不一致。

---

## 2. 目标 / 非目标

### 2.1 目标（Must）

1. core 定义 `EvalCase` / `EvalCaseSet` / `EvalRunResult` 类型。  
2. 本地持久化一套用例集（Web：现有 storage 端口；Desktop：同一 IStorageProvider 键）。  
3. 能对当前模型跑**最小批量**（串行即可）：每条用例 → 调用现有评估或「提示+期望包含」断言。  
4. 导出证据 JSON 文件（用户下载/保存）。  

### 2.2 非目标（Must not）

- 完整 Promptfoo 矩阵 UI。  
- 云端托管用例。  
- 红队/安全攻击模拟。  
- 改 IPC 协议（若 Desktop 仅 renderer 本地跑评估，可不新开 channel）。  
- 自动优化策略。  

---

## 3. 输入

| 输入 | 说明 |
|------|------|
| 用户编写的用例 | 名称、输入提示或上下文摘要、断言类型与期望 |
| 当前 `modelKey` | 来自已有模型管理器 |
| 可选：当前工作区提示 | 作为默认 seed |
| 存储 | `IStorageProvider` / 现有 preference 或独立 key |

权威约束：`docs/architecture/charter.md`、`COMPETITIVE-BRIEF.md`。

---

## 4. 输出

### 4.1 类型（core，示意）

```ts
// 概念形状 — 实现时可放 services/evaluation/types.ts
export type EvalAssertion =
  | { type: 'contains'; value: string }
  | { type: 'not_contains'; value: string }
  | { type: 'json_path_exists'; path: string } // 可选，可第二刀

export interface EvalCase {
  id: string
  name: string
  /** 送给模型的用户侧输入或任务描述 */
  input: string
  /** 可选系统提示覆盖；默认用工作区/空 */
  systemPrompt?: string
  assertions: EvalAssertion[]
  tags?: string[]
}

export interface EvalCaseSet {
  id: string
  name: string
  version: 1
  updatedAt: number
  cases: EvalCase[]
}

export interface EvalCaseRunResult {
  caseId: string
  passed: boolean
  outputPreview: string
  assertionResults: Array<{ assertion: EvalAssertion; passed: boolean; detail?: string }>
  durationMs: number
  error?: string
}

export interface EvalEvidenceBundle {
  version: 1
  createdAt: number
  modelKey: string
  caseSetId: string
  caseSetName: string
  results: EvalCaseRunResult[]
  summary: { total: number; passed: number; failed: number }
}
```

### 4.2 存储键

- 建议：`CORE_SERVICE_KEYS` 或 evaluation 专用 key，例如 `eval.caseSets.v1`。  
- 单用户可先只支持 **一个默认 case set**（降低 UI）。  

### 4.3 UI（最小）

- 评估面板或独立抽屉：「用例」列表（增删改简单表单）。  
- 按钮：「运行全部」「导出证据」。  
- 结果表：通过/失败 + 输出预览。  

### 4.4 导出

- 文件名：`eval-evidence-YYYYMMDD-HHmmss.json`。  
- MIME：`application/json`。  
- 内容：`EvalEvidenceBundle`。  

---

## 5. 实现要点

### 5.1 core

- 新增 `EvalCaseSetRepository`（或挂在 EvaluationService 旁的小组件），依赖 `IStorageProvider`。  
- `runCaseSet(caseSet, deps: { llm|evaluation, modelKey, signal? })`：  
  - 支持 `AbortSignal`（与现有取消文化一致）。  
  - 断言 `contains`：对模型输出做大小写可配置（默认敏感）。  
  - 错误记入 `error` 字段，不中断整批（除非 signal abort）。  

### 5.2 ui

- 只编排：读 case set → 调 core → 展示 → 触发下载。  
- **禁止**在组件内直接调厂商 SDK。  
- 文案走 i18n（可先中英 key 占位）。  

### 5.3 desktop

- 若评估只在 renderer + core 代理路径：优先复用现有 LLM/Evaluation 代理，**避免新 IPC**。  
- 若必须 main 跑：再开 channel 并走 charter §5。  

---

## 6. 验收标准（Cut-1 Done）

| ID | 标准 | 验证命令/步骤 |
|----|------|----------------|
| N1 | 类型与 repository 单测：保存/加载 case set | `pnpm -F @prompt-optimizer/core test` 相关文件 |
| N2 | `contains` 断言：命中 pass、不命中 fail | 单测 |
| N3 | 运行 2 条用例产出 `summary.total===2` | 单测 mock LLM |
| N4 | 导出 JSON 可 `JSON.parse` 且含 version/modelKey/results | 单测或手测 |
| N5 | 运行中可取消（signal） | 单测 abort |
| N6 | 不增加 ui 对 core 工厂的 re-export | package-scripts 测试 |
| N7 | 手测：Web 或 Desktop 创建用例→运行→导出文件 | 手测 |

**失败标准**：依赖云 API 才能存用例；或必须登录；或引入 aws-sdk/新重依赖。

---

## 7. 测试计划

1. **单元**：repository round-trip；断言逻辑；batch 汇总。  
2. **契约**：无新 IPC 则跳过；有则补 manifest 测试。  
3. **手测**：空用例集、1 条、失败断言、导出打开。  

---

## 8. 风险与回滚

| 风险 | 缓解 |
|------|------|
| 与现有 EvaluationService 概念重叠 | Case 断言先做「输出包含」，评估打分第二刀再接 |
| UI 范围膨胀 | 只做默认一个 case set |
| Token 成本 | 默认串行 + 可取消 + 条数上限（如 20） |

回滚：feature 后的存储 key 可忽略；UI 入口可隐藏。

---

## 9. 刀+1 / 刀+2（预告，不在本刀）

| 刀 | 主题 | 验收一句话 |
|----|------|------------|
| Cut+1 | Desktop safeStorage 存 API Key | 偏好中无明文 key |
| Cut+2 | RemoteObjectStorePort，UI 去 @aws-sdk | web 依赖树无 client-s3 |

---

## 10. 任务拆分（给执行 AI）

```text
1. core: 类型 + storage key + repository
2. core: runCaseSet + 单测（mock ILLMService）
3. ui: 最小用例列表 + 运行 + 导出
4. i18n key 中英
5. 跑 package-scripts + core 相关 test
6. 更新 CURRENT 一句「评估用例最小集」若发版
```

**完成定义**：§6 全部 N1–N7 为是。
