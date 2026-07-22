# 架构文档索引（现行白名单）

> **L1：** 仅下列文档视为「现行架构事实」。  
> 同目录其他 md 可能过期，排障时可参考，**实现以代码为准**。  
> 文档体系：方案 C — 见 `docs/project/archives/install-side-2026-07/DOC-SYSTEM-PLAN-2026-07-20.md`  
> 顶层测绘：[`../ARCHITECTURE_ASIS.md`](../ARCHITECTURE_ASIS.md) · [`../ARCHITECTURE_TARGET.md`](../ARCHITECTURE_TARGET.md)

## 白名单（现行）

| 文档 | 主题 |
|------|------|
| [**charter.md**](./charter.md) | **架构宪章**（本地工作台边界、依赖方向、Won't do） |
| [storage-runtime-architecture.md](./storage-runtime-architecture.md) | Web/Desktop/Ext 存储运行时与图片分库边界 |
| [storage-key-architecture.md](./storage-key-architecture.md) | 存储键约定 |
| [function-mode.md](./function-mode.md) | Basic / Pro / Image 功能模式（注意与代码命名可能有历史别名） |
| [electron-adapter-entrypoint.md](./electron-adapter-entrypoint.md) | Core `./electron` 子入口与装配 |
| [llm-sdk-lazy-loading.md](./llm-sdk-lazy-loading.md) | LLM SDK 懒加载 |
| [structured-compare-and-evaluation-rewrite.md](./structured-compare-and-evaluation-rewrite.md) | 结构化对比评估 |
| [import-export-interface-design.md](./import-export-interface-design.md) | 导入导出契约（注意收藏是否在 DataManager 内） |

## 可能过期 / 设计草案（非白名单）

下列文件**未**列入白名单，阅读时交叉验证代码：

- `image-model-*.md`、`llm-refactor.md`、`preference-service-optimization.md`
- `spo-thin-loop-ui-and-stop-rules.md`、`test-area-*.md`
- `storage-refactoring-summary.md`（摘要；细节以 storage-runtime 为准）

## 相关

- 模块与边界总览：[`../PROJECT_HANDOFF.md`](../PROJECT_HANDOFF.md) · FULL-AUDIT（归档）
- 现行版本：[`../project/CURRENT.md`](../project/CURRENT.md)
- 目标架构 / 发行：[`../ARCHITECTURE_TARGET.md`](../ARCHITECTURE_TARGET.md) · [`../ops/ai-core-distribution-contract.md`](../ops/ai-core-distribution-contract.md)
- 品牌素材：[`../brand-assets.md`](../brand-assets.md)
- 决策简报：[`../project/COMPETITIVE-BRIEF.md`](../project/COMPETITIVE-BRIEF.md)
- 90 天 backlog：[`../project/BACKLOG-90D-2026-07-21.md`](../project/BACKLOG-90D-2026-07-21.md)
- 下一刀规格：[`../project/NEXT-CUT-SPEC-2026-07-21.md`](../project/NEXT-CUT-SPEC-2026-07-21.md)
- 竞品调研（全文）：`docs/project/archives/install-side-2026-07/COMPETITIVE-ARCHITECTURE-RESEARCH-2026-07-21.md`
