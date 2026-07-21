# 开发者文档

欢迎参与 **Prompt Optimizer** 开发。  
**本仓策略：独立仓** — 默认在 [xvyimu/MindSync](https://github.com/xvyimu/MindSync) 的 `develop` 上工作（原 `prompt-optimizer`，已脱离 fork），不默认向上游开 PR。  
现行版本/路径：[`../project/CURRENT.md`](../project/CURRENT.md) · 工程交接：[`../PROJECT_HANDOFF.md`](../PROJECT_HANDOFF.md)

## 快速开始

- [开发指南](./development.md) — 环境、Docker、常用工作流（**clone 本仓 MindSync**）  
- [技术开发指南](./technical-development-guide.md) — 技术栈与规范  
- [项目结构](./project-structure.md) — 目录组织  
- [通用开发经验](./general-experience.md) — 经验与最佳实践  
- [开发工作流（本机）](../project/DEV-WORKFLOW.md) — Node 24 / 命令摘要  

## 平台

### 桌面端

- [桌面开发指南](./desktop-developer-guide.md)  
- [Electron IPC 实践](./electron-ipc-best-practices.md)  

### Web / 扩展

- Web：入口包 `packages/web`；命令见根 `package.json`（`pnpm dev` / `build:web`）  
- 扩展：`packages/extension`；`pnpm dev:ext` / `build:ext`  

### MCP

- `packages/mcp-server`；`pnpm mcp:dev` / `mcp:test`  

## 专题

- [LLM 参数配置](./llm-params-guide.md)  
- [i18n 策略](./i18n-policy.md)  
- [Prompt Garden 集成笔记](./prompt-garden-integration.md)  
- [技术分析](./technical-analysis.md)  
- [开发任务清单](./todo.md)  

## 故障排查

- [排查指南索引](./troubleshooting/README.md)  
- [通用排查清单](./troubleshooting/general-checklist.md)  

## 发版与文档纪律

- 发版一步表：[`../project/RELEASE-RUNBOOK.md`](../project/RELEASE-RUNBOOK.md)  
- 文档策略：[`../DOCS_POLICY.md`](../DOCS_POLICY.md)  
- 漂移台账：[`../project/DOC-DRIFT-REGISTRY.md`](../project/DOC-DRIFT-REGISTRY.md)  

## 架构（现行）

系统架构白名单在 [`../architecture/README.md`](../architecture/README.md)，**不在**本目录下的 `architecture/` 子树（该路径未建立）。  

## 未建文档（有意）

以下条目**尚未成文**（勿标「已创建」）：独立 Web 开发专篇、扩展开发专篇、`api/core-api.md`、贡献指南长文。需要时优先链到 HANDOFF / RUNBOOK / architecture 白名单，避免再造多 SSOT。  
