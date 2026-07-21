# Structured Compare Calibration

> 这一组样本不是为了证明 compare 功能“能跑”，而是为了校准我们新引入的 structured compare judge / synthesis / rewrite 提示词。

## 目标

- 为 `pairwise judge` 提供少量但高价值的校准场景。
- 让 `synthesis` 在这些场景下暴露出是否存在“过度乐观”“忽略 overfit 风险”“把单次好运当稳定收益”等问题。
- 让 `rewrite-from-evaluation` 接收到的上游证据足够清晰、可压缩、可复用。

## 场景设计原则

- 样本要能稳定打到某个误判风险，而不是泛泛比较“哪个输出更好”。
- 每个样本都应能回答一个具体问题。
- 尽量把“结构性收益”和“样例贴合收益”区分开。
- 至少覆盖一次真实 target/teacher 执行，避免全部停留在手工构造快照。

## 当前样本

- `live-basic-system-boundary-control`
  使用真实模型执行 4 个快照，观察 structured compare 是否能识别“只输出 JSON、不要解释”的边界控制收益。
- `synthetic-medical-latent-trigger-overfit`
  医疗分诊场景。目标是观察系统能否识别“样例触发词硬编码”带来的高过拟合风险，而不是把更激进的动作建议直接当成收益。
- `synthetic-ecommerce-schema-no-model-worship`
  电商商品抽取场景。目标是校准 compare 是否会坚持 schema / contract 优先，不会因为 teacher 输出更流畅就放过字段改名和 wrapper 漂移。
- `synthetic-legal-flat-not-unclear`
  法务风险摘要场景。目标是让 judge 学会把“结论等价、只改措辞”的情况稳定判为 `flat`，而不是退化成 `unclear`。
- `synthetic-teaching-overfit-regression`
  教学讲解场景。目标是识别“为当前题目硬塞口诀导致通用原理丢失”的回退，并保留高 overfit 风险。
- `synthetic-hiring-replica-semantic-instability`
  招聘筛选场景。目标是区分“单次输出更像样”和“同 prompt 反复执行仍稳定”这两件事。

## 最新校准结论

- synthetic 校准样本已经切换为跨主题集合，不再集中在客服/登录失败这一类题材上，目的是降低 calibration 自身对单一领域的过拟合。
- `pairwise judge` 目前在 5 个跨主题 synthetic case 中，已经能稳定识别 3 类核心能力：
  - schema / contract 漂移应判回退
  - “flat 不是 unclear”
  - replica 语义不稳定应触发保守 stopRecommendation
- `rewrite-from-evaluation` 在医疗、教学、电商这类样本上，已经能根据 compare 结论回退到更稳的通用 prompt，而不是继续保留样例贴合规则或坏 contract。
- 当前最有价值的新发现来自 `synthetic-medical-latent-trigger-overfit`：
  compare 并没有把它看成“轻微过拟合但仍可能有收益”，而是直接判成了 `regressed + high overfit risk`。这说明现在的 judge 对高风险领域会更保守，也说明该样本已经能检验更细的提示词边界。
- live case 当前仍是 `targetVsBaseline=improved` 且 `stopRecommendation=review`。这说明真实边界控制收益仍可见，但系统仍保持保守，不会轻易建议停止。

## 运行方式

在项目根目录执行：

```bash
pnpm -F @mindsync/core build
node scripts/run-structured-compare-calibration.mjs
```

或直接使用：

```bash
pnpm compare:calibrate
```

## 输出位置

- 总结：`docs/workspace/compare-evaluation-analysis/structured-compare-calibration/latest/summary.md`
- 每个 case 的 request / response / rewrite / llm-calls 都在对应子目录中。
- 每个 case 还会落盘：
  - `pair-judge-payloads.json`
  - `synthesis-payload.json`
  - `rewrite-payload.json`

## 如何使用这些结果

- 如果 synthetic case 没命中预期，优先改 compare judge / synthesis 提示词。
- 如果 live case 的 stopSignals 合理，但 rewrite 输出方向仍然跑偏，优先改 rewrite-from-evaluation 模板。
- 如果 rewrite 输出开始擅自改字段名、改 schema、改消息包装方式，先检查是否把“当前工作区 prompt 原文”和“参考 prompt 快照”一起喂给了 rewrite 模板。
- 如果 calibration 偶发被真实 API 超时打断，优先重跑 `pnpm compare:calibrate`；当前 runner 已内置超时拉长和有限重试。
- 如果 synthetic 与 live 表现相互矛盾，优先检查场景描述是否过于理想化，再决定是否扩充样本。
