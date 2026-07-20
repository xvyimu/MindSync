# 开发过程归档

> **L2 冻结 · 只读 · 非现行行为。**  
> 现行版本/路径：[`../project/CURRENT.md`](../project/CURRENT.md) · 架构白名单：[`../architecture/README.md`](../architecture/README.md) · 代码为准。  
> **禁止**在本目录新增「现行 API / 现行安装说明」。仅供历史排障与决策溯源。  
> **索引与磁盘目录一一对应**（机检：`node scripts/check-docs-archive-index.mjs`）。C2-C 2026-07-20 对齐。

这里按功能点归档开发过程中的重构记录、设计文档、经验总结等。

## 编号说明

- 起始约 **101**；历史编号保留，**不复用**。  
- 磁盘上存在 **同号多目录**（如 `117-*`、`121-*`、`122-*`、`124-*`），索引如实列出，**不要合并改名**（避免断链）。  
- 下一新归档建议编号：**133+**（当前最大目录前缀 **132**）。

## 功能点目录（= `docs/archives/*/` 实况）

| 目录 | 备注 |
|------|------|
| [101-singleton-refactor](./101-singleton-refactor/) | 单例重构 |
| [102-web-architecture-refactor](./102-web-architecture-refactor/) | Web 架构 |
| [103-desktop-architecture](./103-desktop-architecture/) | Desktop 架构 |
| [104-test-panel-refactor](./104-test-panel-refactor/) | 测试面板 |
| [105-output-display-v2](./105-output-display-v2/) | 输出显示 v2 |
| [106-template-management](./106-template-management/) | 模板管理 |
| [107-component-standardization](./107-component-standardization/) | 组件标准化 |
| [108-layout-system](./108-layout-system/) | 布局系统 |
| [109-theme-system](./109-theme-system/) | 主题系统 |
| [110-desktop-indexeddb-fix](./110-desktop-indexeddb-fix/) | IndexedDB 修复 |
| [111-electron-preference-architecture](./111-electron-preference-architecture/) | Preference 架构 |
| [112-desktop-ipc-fixes](./112-desktop-ipc-fixes/) | IPC 修复 |
| [113-full-service-refactoring](./113-full-service-refactoring/) | 服务重构 |
| [114-desktop-file-storage](./114-desktop-file-storage/) | 文件存储 |
| [115-ipc-serialization-fixes](./115-ipc-serialization-fixes/) | IPC 序列化 |
| [116-desktop-packaging-optimization](./116-desktop-packaging-optimization/) | 打包优化 |
| [117-import-export-architecture-refactor](./117-import-export-architecture-refactor/) | 导入导出（同号并存） |
| [117-pinia-refactoring](./117-pinia-refactoring/) | Pinia 重构（同号并存） |
| [118-desktop-auto-update-system](./118-desktop-auto-update-system/) | 自动更新 |
| [119-csp-safe-template-processing](./119-csp-safe-template-processing/) | CSP 模板 |
| [120-mcp-server-module](./120-mcp-server-module/) | MCP Server |
| [121-context-editor-refactor](./121-context-editor-refactor/) | 上下文编辑器（同号并存） |
| [121-multi-custom-models-support](./121-multi-custom-models-support/) | 多自定义模型（同号并存） |
| [122-docker-api-proxy](./122-docker-api-proxy/) | Docker API 代理（同号并存） |
| [122-naive-ui-migration](./122-naive-ui-migration/) | Naive UI 迁移（同号并存） |
| [123-advanced-features-implementation](./123-advanced-features-implementation/) | 高级功能 |
| [124-advanced-mode-toggle-migration](./124-advanced-mode-toggle-migration/) | 高级模式切换（同号并存） |
| [124-navigation-optimization](./124-navigation-optimization/) | 导航优化（同号并存） |
| [125-test-area-refactor](./125-test-area-refactor/) | TestArea 重构 |
| [126-submode-persistence](./126-submode-persistence/) | 子模式持久化 |
| [127-multi-turn-dialogue-mode-optimization](./127-multi-turn-dialogue-mode-optimization/) | 多轮对话 |
| [128-context-ui-and-variable-system-refactor](./128-context-ui-and-variable-system-refactor/) | 上下文 UI / 变量 |
| [129-session-store-single-source-refactor](./129-session-store-single-source-refactor/) | Session store |
| [130-test-area-version-model-selection](./130-test-area-version-model-selection/) | 测试区版本/模型 |
| [131-testing-redesign](./131-testing-redesign/) | 测试体系 / VCR |
| [132-architecture-migration-and-session-persistence-plans](./132-architecture-migration-and-session-persistence-plans/) | 架构迁移规划 |

根目录另有历史单文件（非目录）如 `007-electron-api-refactor-rollback.md` 等，不计入上表编号序列。

## 维护

- 新增归档：新建 `NNN-slug/` + 更新本表 + 跑 `check-docs-archive-index.mjs`。  
- 现行架构事实写 [`../architecture/`](../architecture/) 白名单篇，**不要**写进本目录当 SSOT。  
