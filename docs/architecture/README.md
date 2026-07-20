# 架构文档索引（现行白名单）

> **L1：** 仅下列文档视为「现行架构事实」。  
> 同目录其他 md 可能过期，排障时可参考，**实现以代码为准**。  
> 文档体系：方案 C — 见 `D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-2026-07-20.md`

## 白名单（现行）

| 文档 | 主题 |
|------|------|
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

- 模块与边界总览：[`../PROJECT_HANDOFF.md`](../PROJECT_HANDOFF.md) · FULL-AUDIT
- 现行版本：[`../project/CURRENT.md`](../project/CURRENT.md)
