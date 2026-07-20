# 开发过程归档

> **L2 冻结 · 只读 · 非现行行为。**  
> 现行版本/路径：[`../project/CURRENT.md`](../project/CURRENT.md) · 架构白名单：[`../architecture/README.md`](../architecture/README.md) · 代码为准。  
> **禁止**在本目录新增「现行 API / 现行安装说明」。仅供历史排障与决策溯源。

这里按功能点归档了项目开发过程中的重构记录、设计文档、经验总结等，用于后续跟踪和排错。

## 📚 归档说明

### 编号规范
- **起始编号**：101
- **编号方式**：简单累加（101, 102, 103...）
- **编号保留**：即使功能废弃，编号也不重复使用

### 归档原则
- **按功能点归档**：同一功能的所有相关文档放在一起
- **完整上下文**：包含计划、设计、实现、经验等完整记录
- **时间顺序**：通过编号体现开发的时间顺序

## 🗂️ 功能点列表

### 架构重构系列 (已完成)
- [101-singleton-refactor](./101-singleton-refactor/) - 单例模式重构 ✅
- [102-web-architecture-refactor](./102-web-architecture-refactor/) - Web架构重构 ✅
- [103-desktop-architecture](./103-desktop-architecture/) - 桌面端架构 ✅

### 功能开发系列
- [104-test-panel-refactor](./104-test-panel-refactor/) - 测试面板重构 📋
- [105-output-display-v2](./105-output-display-v2/) - 输出显示v2 📋
- [106-template-management](./106-template-management/) - 模板管理功能 🔄
- [107-component-standardization](./107-component-standardization/) - 组件标准化重构 🔄

### 系统优化系列 (已完成)
- [108-layout-system](./108-layout-system/) - 布局系统经验总结 ✅
- [109-theme-system](./109-theme-system/) - 主题系统开发 ✅

### 问题修复系列 (已完成)
- [110-desktop-indexeddb-fix](./110-desktop-indexeddb-fix/) - 桌面端IndexedDB问题修复 ✅
- [111-electron-preference-architecture](./111-electron-preference-architecture/) - Electron PreferenceService架构重构与竞态条件修复 ✅
- [112-desktop-ipc-fixes](./112-desktop-ipc-fixes/) - 桌面端IPC修复合集 ✅

### 服务重构系列
- [113-full-service-refactoring](./113-full-service-refactoring/) - 全面服务重构 🔄

### 数据架构系列 (已完成)
- [114-desktop-file-storage](./114-desktop-file-storage/) - 桌面端文件存储实现 ✅
- [115-ipc-serialization-fixes](./115-ipc-serialization-fixes/) - IPC序列化问题修复 ✅
- [116-desktop-packaging-optimization](./116-desktop-packaging-optimization/) - 桌面端打包优化 ✅
- [117-import-export-architecture-refactor](./117-import-export-architecture-refactor/) - 导入导出架构重构 ✅

### 系统集成系列 (已完成)
- [118-desktop-auto-update-system](./118-desktop-auto-update-system/) - 桌面端应用发布与智能更新系统 ✅
- [119-csp-safe-template-processing](./119-csp-safe-template-processing/) - CSP 安全模板处理 ✅
- [120-mcp-server-module](./120-mcp-server-module/) - MCP Server 模块开发 ✅

### 功能扩展系列 (已完成)
- [121-multi-custom-models-support](./121-multi-custom-models-support/) - 多自定义模型环境变量支持 ✅
- [122-docker-api-proxy](./122-docker-api-proxy/) - Docker API代理功能实现 ✅
- [123-advanced-features-implementation](./123-advanced-features-implementation/) - 高级功能完整实现 ✅

### UI优化系列 (已完成)
- [124-navigation-optimization](./124-navigation-optimization/) - 导航栏优化项目 ✅
- [125-test-area-refactor](./125-test-area-refactor/) - TestArea 组件系统重构 ✅

### 状态管理系列 (已完成)
- [126-submode-persistence](./126-submode-persistence/) - 子模式持久化功能 ✅
- [129-session-store-single-source-refactor](./129-session-store-single-source-refactor/) - Session Store 单一真源架构重构 ✅
- [130-test-area-version-model-selection](./130-test-area-version-model-selection/) - 测试区版本/模型选择过程归档 ✅
- [132-architecture-migration-and-session-persistence-plans](./132-architecture-migration-and-session-persistence-plans/) - 架构迁移与 Session 持久化规划归档 ✅

### 上下文模式系列 (已完成)
- [127-multi-turn-dialogue-mode-optimization](./127-multi-turn-dialogue-mode-optimization/) - 多轮对话模式优化（Pro-System / Conversation） ✅
- [128-context-ui-and-variable-system-refactor](./128-context-ui-and-variable-system-refactor/) - 上下文 UI 改造与变量系统重构 ✅

### 测试体系系列 (已完成)
- [131-testing-redesign](./131-testing-redesign/) - 测试体系重构、VCR 与 UI 错误门禁归档 ✅

## 📋 文档结构

每个功能点目录包含：
- **README.md** - 功能点概述、时间线、状态
- **核心文档**（根据实际情况）：
  - `plan.md` - 计划文档
  - `design.md` - 设计文档
  - `implementation.md` - 实现记录
  - `experience.md` - 经验总结
  - `troubleshooting.md` - 排查清单

## 🔍 查找指南

### 按时间查找
- **101-103**：2024年12月底的架构重构
- **104-107**：2024年12月底至2025年7月的功能开发
- **108-109**：2025年7月的系统优化
- **110-113**：2025年1月至7月的修复和重构

### 按功能分类查找
- **架构重构系列**：101, 102, 103
- **功能开发系列**：104, 105, 106, 107
- **系统优化系列**：108, 109
- **问题修复系列**：110, 111, 112
- **服务重构系列**：113
- **UI优化系列**：124
- **状态管理系列**：126
- **上下文模式系列**：127
- **上下文模式系列**：127, 128
- **测试体系系列**：131

### 按状态查找
- **已完成**：101, 102, 103, 108, 109, 110, 111, 112, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 126, 127, 128
- **进行中**：106, 107, 113
- **计划中**：104, 105

## 📝 使用说明

1. **查找相关功能**：根据功能名称或编号找到对应目录
2. **了解背景**：先阅读README.md了解功能概述
3. **深入细节**：根据需要查看具体的计划、设计或经验文档
4. **问题排查**：如有相关问题，查看troubleshooting.md

## 🔄 维护说明

- **新功能归档**：从当前最大编号继续递增（当前建议下一个编号为 132）
- **文档更新**：功能完成后及时更新状态和经验总结
- **交叉引用**：在相关功能点之间建立引用关系
- **合并原则**：当同一功能领域有3个以上相关文档时考虑合并
- **质量标准**：空目录或内容不足的文档应合并或删除

## 📋 组织指南

### 归档标准
1. **功能完整性**：每个功能点包含完整的计划→设计→实现→经验链条
2. **避免重复编号**：严格按时间顺序分配编号，不重复使用
3. **内容质量**：确保文档内容充实，有实际价值

### 文档结构规范
```
{编号}-{功能名称}/
├── README.md (功能概述、时间线、状态)
├── plan.md (计划文档，可选)
├── design.md (设计文档，可选)
├── implementation.md (实现记录，可选)
├── experience.md (经验总结，必需)
└── troubleshooting.md (排查清单，可选)
```

## 📊 当前编号信息

- **当前最大编号**: 131
- **下一个建议编号**: 132
